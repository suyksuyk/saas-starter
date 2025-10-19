import { db } from './drizzle';
import { teams } from './schema';
import { eq, and, or, isNotNull, ne } from 'drizzle-orm';

/**
 * 数据迁移脚本：将现有的Stripe数据迁移到通用支付字段
 * 并支持PayPal字段
 */
export async function migratePaymentData() {
  console.log('开始迁移支付数据...');

  try {
    // 获取所有有Stripe数据的团队
    const stripeTeams = await db
      .select()
      .from(teams)
      .where(and(
        isNotNull(teams.stripeCustomerId),
        ne(teams.stripeCustomerId, '')
      ));

    console.log(`找到 ${stripeTeams.length} 个使用Stripe的团队`);

    // 迁移Stripe数据到通用字段
    for (const team of stripeTeams) {
      await db
        .update(teams)
        .set({
          paymentProvider: 'stripe',
          paymentCustomerId: team.stripeCustomerId,
          paymentSubscriptionId: team.stripeSubscriptionId,
          paymentProductId: team.stripeProductId,
          updatedAt: new Date(),
        })
        .where(eq(teams.id, team.id));

      console.log(`迁移团队 ${team.id} (${team.name}) 的Stripe数据`);
    }

    console.log('Stripe数据迁移完成');

    // 验证迁移结果
    const migratedTeams = await db
      .select()
      .from(teams)
      .where(eq(teams.paymentProvider, 'stripe'));

    console.log(`验证：共有 ${migratedTeams.length} 个团队使用支付提供商`);

    console.log('支付数据迁移成功完成！');
  } catch (error) {
    console.error('支付数据迁移失败:', error);
    throw error;
  }
}

/**
 * 回滚迁移：将通用字段数据恢复到Stripe特定字段
 */
export async function rollbackPaymentData() {
  console.log('开始回滚支付数据...');

  try {
    // 获取所有使用Stripe的团队
    const stripeTeams = await db
      .select()
      .from(teams)
      .where(eq(teams.paymentProvider, 'stripe'));

    console.log(`找到 ${stripeTeams.length} 个使用Stripe的团队`);

    // 将通用字段数据恢复到Stripe特定字段
    for (const team of stripeTeams) {
      await db
        .update(teams)
        .set({
          stripeCustomerId: team.paymentCustomerId,
          stripeSubscriptionId: team.paymentSubscriptionId,
          stripeProductId: team.paymentProductId,
          updatedAt: new Date(),
        })
        .where(eq(teams.id, team.id));

      console.log(`回滚团队 ${team.id} (${team.name}) 的数据`);
    }

    console.log('支付数据回滚完成！');
  } catch (error) {
    console.error('支付数据回滚失败:', error);
    throw error;
  }
}

/**
 * 验证数据完整性
 */
export async function validatePaymentData() {
  console.log('开始验证支付数据完整性...');

  try {
    // 检查是否有数据不一致的情况
    const inconsistentTeams = await db
      .select()
      .from(teams)
      .where(and(
        eq(teams.paymentProvider, 'stripe'),
        or(
          ne(teams.stripeCustomerId, teams.paymentCustomerId),
          ne(teams.stripeSubscriptionId, teams.paymentSubscriptionId),
          ne(teams.stripeProductId, teams.paymentProductId)
        )
      ));

    if (inconsistentTeams.length > 0) {
      console.warn(`发现 ${inconsistentTeams.length} 个数据不一致的团队:`);
      inconsistentTeams.forEach(team => {
        console.warn(`团队 ${team.id} (${team.name}) 数据不一致`);
      });
    } else {
      console.log('所有支付数据一致，验证通过！');
    }

    return inconsistentTeams.length === 0;
  } catch (error) {
    console.error('支付数据验证失败:', error);
    throw error;
  }
}

export async function runMigrations(operation: 'migrate' | 'rollback' | 'validate') {
  switch (operation) {
    case 'migrate':
      await migratePaymentData();
      break;
    case 'rollback':
      await rollbackPaymentData();
      break;
    case 'validate':
      await validatePaymentData();
      break;
    default:
      throw new Error(`Invalid operation: ${operation}`);
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  const command = process.argv[2] as 'migrate' | 'rollback' | 'validate';
  
  switch (command) {
    case 'migrate':
      migratePaymentData()
        .then(() => process.exit(0))
        .catch(() => process.exit(1));
      break;
    case 'rollback':
      rollbackPaymentData()
        .then(() => process.exit(0))
        .catch(() => process.exit(1));
      break;
    case 'validate':
      validatePaymentData()
        .then((isValid) => process.exit(isValid ? 0 : 1))
        .catch(() => process.exit(1));
      break;
    default:
      console.log('用法: npm run migrate-payment [migrate|rollback|validate]');
      process.exit(1);
  }
}
