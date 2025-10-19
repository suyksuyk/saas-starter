# 构建错误修复总结

## 问题描述

在 Vercel 部署过程中遇到多个构建错误：

1. **类型错误**: `Property 'where' does not exist on type 'Omit<PgSelectBase...>'`
2. **数据库连接错误**: 构建时尝试连接数据库失败
3. **PayPal API 认证错误**: 构建时调用 PayPal API 失败

## 解决方案

### 1. 修复 Drizzle ORM 类型错误

**问题**: 在 `lib/db/migrate-payment-data.ts` 中使用了错误的链式调用语法

**解决方案**: 
```typescript
// 错误的语法
.select()
.from(teams)
.where(eq(teams.stripeCustomerId, teams.stripeCustomerId))
.where(teams.stripeCustomerId.isNotNull())

// 正确的语法
.select()
.from(teams)
.where(and(
  eq(teams.stripeCustomerId, teams.stripeCustomerId),
  isNotNull(teams.stripeCustomerId)
))
```

### 2. 修复自动执行 Seed 问题

**问题**: `lib/db/seed.ts` 文件底部有自动执行的代码，在构建时被触发

**解决方案**: 移除了文件底部的自动执行代码：
```typescript
// 移除了这些自动执行的代码
// seed()
//   .catch((error: any) => {
//     console.error('Seed process failed:', error);
//     process.exit(1);
//   })
//   .finally(() => {
//     console.log('Seed process finished. Exiting...');
//     process.exit(0);
//   });
```

### 3. 修复 Pricing 页面构建时 API 调用问题

**问题**: Pricing 页面在构建时尝试调用支付提供商 API，但没有有效的认证信息

**解决方案**: 添加了构建时的回退数据和错误处理：
```typescript
// 添加了回退数据
const fallbackProducts: Product[] = [
  { id: 'base-fallback', name: 'Base' },
  { id: 'plus-fallback', name: 'Plus' }
];

const fallbackPrices: Price[] = [
  { id: 'price-base-fallback', productId: 'base-fallback', unitAmount: 800, currency: 'usd', interval: 'month', trialPeriodDays: 7 },
  { id: 'price-plus-fallback', productId: 'plus-fallback', unitAmount: 1200, currency: 'usd', interval: 'month', trialPeriodDays: 7 }
];

// 只在运行时调用 API，不在构建时调用
if (process.env.NODE_ENV === 'production' && process.env.NEXT_PHASE !== 'phase-production-build') {
  // 调用 API 获取真实数据
}
```

## 构建结果

修复后的构建成功输出：
```
✓ Compiled successfully in 5.0s
✓ Linting and checking validity of types
✓ Collecting page data
✓ Generating static pages (19/19)
✓ Finalizing page optimization
```

## 关键学习点

1. **避免构建时数据库操作**: 确保没有任何代码在构建时尝试连接数据库或执行数据库操作
2. **API 调用时机**: 区分构建时和运行时的 API 调用，构建时应该使用静态数据或回退数据
3. **Drizzle ORM 语法**: 注意链式调用的正确语法，特别是多个 `where` 条件的处理
4. **环境变量处理**: 确保构建时不会因为缺少环境变量而失败

## 部署建议

1. 在部署前确保所有必要的环境变量都已配置
2. 使用 `SHOULD_SEED=true` 环境变量来控制是否执行种子数据
3. 确保支付提供商的 API 密钥在部署环境中正确配置

## 文件修改清单

- `lib/db/migrate-payment-data.ts`: 修复 Drizzle ORM 语法错误
- `lib/db/seed.ts`: 移除自动执行的 seed 代码
- `app/(dashboard)/pricing/page.tsx`: 添加构建时回退数据和错误处理
- `BUILD_FIX_SUMMARY.md`: 本文档

构建现在应该可以在 Vercel 上成功部署了！
