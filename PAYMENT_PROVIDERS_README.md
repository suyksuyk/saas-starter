# 支付提供商架构说明

本项目已重构为支持多种支付提供商的架构，目前支持Stripe和PayPal。

## 架构概述

### 设计模式
- **策略模式**: 每个支付提供商实现统一的接口
- **工厂模式**: 通过工厂类创建和管理支付提供商实例
- **适配器模式**: 保持向后兼容性

### 核心组件

1. **支付提供商接口** (`lib/payments/providers/payment-provider.interface.ts`)
   - 定义所有支付提供商必须实现的标准方法
   - 确保接口一致性

2. **支付提供商实现**
   - `lib/payments/providers/stripe.provider.ts` - Stripe实现
   - `lib/payments/providers/paypal.provider.ts` - PayPal实现

3. **工厂类** (`lib/payments/providers/payment-provider.factory.ts`)
   - 创建和管理支付提供商实例
   - 支持默认提供商配置

4. **统一服务入口** (`lib/payments/index.ts`)
   - 提供所有支付相关功能的统一接口

## 配置

### 环境变量

```env
# 支付提供商配置
DEFAULT_PAYMENT_PROVIDER=stripe
# 可选值: stripe, paypal

# Stripe配置
STRIPE_SECRET_KEY=sk_test_***
STRIPE_WEBHOOK_SECRET=whsec_***

# PayPal配置
PAYPAL_CLIENT_ID=your_paypal_client_id
PAYPAL_CLIENT_SECRET=your_paypal_client_secret
PAYPAL_WEBHOOK_ID=your_paypal_webhook_id
PAYPAL_WEBHOOK_SECRET=your_paypal_webhook_secret
```

### 数据库Schema

新增字段支持多支付提供商：

```sql
-- 支付提供商字段
payment_provider VARCHAR(20) DEFAULT 'stripe'

-- 通用支付字段
payment_customer_id TEXT
payment_subscription_id TEXT
payment_product_id TEXT

-- PayPal特定字段
paypal_customer_id TEXT
paypal_subscription_id TEXT
paypal_product_id TEXT
```

## 使用方法

### 基本用法

```typescript
import { getProducts, getPrices } from '@/lib/payments';

// 获取当前默认提供商的产品和价格
const products = await getProducts();
const prices = await getPrices();
```

### 指定支付提供商

```typescript
import { getProductsByProvider, getPricesByProvider } from '@/lib/payments';

// 获取PayPal的产品和价格
const paypalProducts = await getProductsByProvider('paypal');
const paypalPrices = await getPricesByProvider('paypal');
```

### 创建结账会话

```typescript
import { PaymentProviderFactory } from '@/lib/payments/providers/payment-provider.factory';

const provider = PaymentProviderFactory.getDefaultProvider();
const checkoutUrl = await provider.createCheckoutSession({
  team,
  priceId,
  userId: user.id.toString()
});
```

## API路由

### Stripe
- `POST /api/stripe/checkout` - Stripe结账回调
- `POST /api/stripe/webhook` - Stripe webhook处理

### PayPal
- `GET /api/paypal/checkout` - PayPal结账回调
- `POST /api/paypal/webhook` - PayPal webhook处理

## 数据迁移

### 迁移现有数据

```bash
# 运行数据库迁移
npm run db:migrate

# 运行数据迁移脚本
npx tsx lib/db/migrate-payment-data.ts migrate
```

### 验证数据完整性

```bash
npx tsx lib/db/migrate-payment-data.ts validate
```

### 回滚迁移

```bash
npx tsx lib/db/migrate-payment-data.ts rollback
```

## 添加新的支付提供商

1. 创建新的提供商实现类

```typescript
// lib/payments/providers/newprovider.provider.ts
import { PaymentProvider } from './payment-provider.interface';

export class NewProviderProvider implements PaymentProvider {
  // 实现所有接口方法
}
```

2. 更新工厂类

```typescript
// lib/payments/providers/payment-provider.factory.ts
export type PaymentProviderType = 'stripe' | 'paypal' | 'newprovider';

// 在getProvider方法中添加新的case
case 'newprovider':
  providerInstance = new NewProviderProvider();
  break;
```

3. 添加相应的API路由和环境变量配置

## 向后兼容性

所有原有的Stripe相关函数仍然可用：

```typescript
import { 
  createCheckoutSession, 
  createCustomerPortalSession,
  getStripePrices,
  getStripeProducts 
} from '@/lib/payments/stripe';
```

这些函数现在内部使用新的支付提供商架构，但保持相同的API接口。

## 测试

### 本地测试

1. 配置测试环境的API密钥
2. 启动开发服务器
3. 测试结账流程

### 测试PayPal

1. 创建PayPal开发者账户
2. 获取沙箱API密钥
3. 配置webhook端点
4. 测试订阅创建和管理

## 部署注意事项

1. 确保生产环境的API密钥正确配置
2. 配置正确的webhook URL
3. 运行数据迁移脚本
4. 验证支付功能正常工作

## 故障排除

### 常见问题

1. **PayPal webhook验证失败**
   - 检查webhook ID和密钥配置
   - 确认webhook URL正确

2. **数据迁移问题**
   - 检查数据库连接
   - 验证迁移脚本权限

3. **支付提供商切换问题**
   - 确认环境变量配置
   - 检查提供商工厂逻辑

### 日志检查

支付相关错误会记录在应用日志中，可以通过以下方式查看：

```bash
# 查看应用日志
tail -f logs/app.log | grep -i payment
```

## 支持

如有问题，请查看：
1. 应用日志
2. 支付提供商的官方文档
3. 本项目的GitHub Issues
