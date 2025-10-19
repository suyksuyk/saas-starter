# 部署指南 - 支持Stripe和PayPal的多支付提供商SaaS应用

## 本地开发和运行

### 1. 环境准备

确保你的系统已安装：
- Node.js (18+)
- pnpm
- PostgreSQL数据库

### 2. Stripe账户设置

```bash
# 安装Stripe CLI并登录
stripe login

# 验证Stripe配置
stripe config
```

### 3. PayPal开发者账户设置

1. 访问 [PayPal Developer Dashboard](https://developer.paypal.com/)
2. 创建开发者账户（如果还没有）
3. 创建新的应用程序：
   - 选择 "My Apps & Credentials"
   - 点击 "Create App"
   - 选择 "Sandbox" 模式进行测试
   - 获取客户端ID和客户端密钥

### 4. 环境配置

```bash
# 使用设置脚本创建.env文件
pnpm db:setup
```

手动编辑 `.env` 文件，添加完整的支付配置：

```env
# 数据库配置
POSTGRES_URL=postgresql://***

# 支付提供商配置
DEFAULT_PAYMENT_PROVIDER=stripe
# 可选值: stripe, paypal

# Stripe配置
STRIPE_SECRET_KEY=sk_test_***
STRIPE_WEBHOOK_SECRET=whsec_***

# PayPal配置
PAYPAL_CLIENT_ID=your_paypal_sandbox_client_id
PAYPAL_CLIENT_SECRET=your_paypal_sandbox_client_secret
PAYPAL_WEBHOOK_ID=your_paypal_webhook_id
PAYPAL_WEBHOOK_SECRET=your_paypal_webhook_secret

# 应用配置
BASE_URL=http://localhost:3000
AUTH_SECRET=***
```

### 5. 数据库初始化

```bash
# 运行数据库迁移
pnpm db:migrate

# 运行数据迁移脚本（将现有Stripe数据迁移到新架构）
npx tsx lib/db/migrate-payment-data.ts migrate

# 验证数据完整性
npx tsx lib/db/migrate-payment-data.ts validate

# 种子数据库（创建默认用户和团队）
pnpm db:seed
```

这将创建以下默认账户：
- **用户**: test@test.com
- **密码**: admin123

### 6. 启动开发服务器

#### Windows系统
```bash
# 使用快速设置脚本（推荐）
npm run setup:multi-payment

# 或手动启动
pnpm dev
```

#### macOS/Linux系统
```bash
# 使用快速设置脚本（推荐）
chmod +x scripts/setup-multi-payment.sh
./scripts/setup-multi-payment.sh

# 或手动启动
pnpm dev
```

访问 http://localhost:3000 查看应用。

### 7. 本地Webhook测试

#### Stripe Webhook
```bash
# 启动Stripe webhook监听
stripe listen --forward-to localhost:3000/api/stripe/webhook

# 这会显示一个webhook签名密钥，添加到你的.env文件中
# STRIPE_WEBHOOK_SECRET=whsec_***
```

#### PayPal Webhook（本地测试）
由于PayPal webhook需要公网可访问的URL，本地测试需要：
1. 使用 ngrok 或类似工具暴露本地服务：
```bash
# 安装ngrok
npm install -g ngrok

# 暴露3000端口
ngrok http 3000
```

2. 在PayPal开发者控制台配置webhook URL为 ngrok 提供的地址：
```
https://your-ngrok-url.ngrok.io/api/paypal/webhook
```

## 测试支付

### Stripe支付测试
使用以下测试卡信息：
- **卡号**: 4242 4242 4242 4242
- **过期日期**: 任何未来日期
- **CVC**: 任意3位数字

### PayPal支付测试
1. 使用PayPal沙箱测试账户：
   -买家账户：https://developer.paypal.com/developer/accounts/
   - 或使用PayPal提供的默认测试账户

2. 在结账时使用测试账户登录PayPal完成支付

## 生产环境部署

### 1. Stripe生产环境设置

1. 登录 [Stripe Dashboard](https://dashboard.stripe.com/)
2. 切换到生产模式
3. 创建生产环境webhook：
   - 端点URL: `https://yourdomain.com/api/stripe/webhook`
   - 选择监听事件：
     - `checkout.session.completed`
     - `customer.subscription.updated`
     - `customer.subscription.deleted`
     - `invoice.payment_succeeded`
     - `invoice.payment_failed`

### 2. PayPal生产环境设置

1. 在PayPal开发者控制台创建生产应用
2. 获取生产环境的客户端ID和密钥
3. 配置生产webhook：
   - 端点URL: `https://yourdomain.com/api/paypal/webhook`
   - 选择监听事件：
     - `BILLING.SUBSCRIPTION.ACTIVATED`
     - `BILLING.SUBSCRIPTION.CANCELLED`
     - `BILLING.SUBSCRIPTION.SUSPENDED`
     - `PAYMENT.SALE.COMPLETED`
     - `PAYMENT.SALE.DENIED`

### 3. 部署到Vercel

#### 准备代码仓库
```bash
# 初始化git仓库（如果还没有）
git init
git add .
git commit -m "Add multi-payment provider support"

# 推送到GitHub
git remote add origin https://github.com/yourusername/yourrepo.git
git push -u origin main
```

#### Vercel部署步骤
1. 访问 [Vercel Dashboard](https://vercel.com/dashboard)
2. 点击 "New Project"
3. 导入你的GitHub仓库
4. 配置项目设置：
   - Framework: Next.js
   - Build Command: `npm run build` (或 `pnpm build`)
   - Install Command: `npm install` (或 `pnpm install`)

### 4. 生产环境变量配置

在Vercel项目设置中添加以下环境变量：

#### 必需的环境变量
```env
# 数据库
POSTGRES_URL=your_production_postgres_url

# 支付提供商
DEFAULT_PAYMENT_PROVIDER=stripe  # 或 paypal

# Stripe配置
STRIPE_SECRET_KEY=sk_live_***
STRIPE_WEBHOOK_SECRET=whsec_***

# PayPal配置
PAYPAL_CLIENT_ID=your_paypal_production_client_id
PAYPAL_CLIENT_SECRET=your_paypal_production_client_secret
PAYPAL_WEBHOOK_ID=your_paypal_production_webhook_id
PAYPAL_WEBHOOK_SECRET=your_paypal_production_webhook_secret

# 应用配置
BASE_URL=https://yourdomain.com
AUTH_SECRET=your_secure_random_string
```

#### 生成安全的AUTH_SECRET
```bash
# 使用OpenSSL生成32字节随机字符串
openssl rand -base64 32
```

### 5. 数据库迁移

生产环境部署后，需要运行数据库迁移：

```bash
# 如果使用Vercel，可以在部署后运行
npx tsx lib/db/migrate-payment-data.ts migrate
```

或者通过Vercel函数在首次部署时自动运行。

### 6. 验证部署

#### 功能检查清单
- [ ] 应用可以正常访问
- [ ] 用户注册/登录功能正常
- [ ] Stripe支付流程正常
- [ ] PayPal支付流程正常
- [ ] 客户门户功能正常
- [ ] Webhook接收正常
- [ ] 数据库连接正常

#### 支付测试
1. **Stripe测试**：
   - 使用真实测试卡进行小金额测试
   - 验证订阅创建和取消流程

2. **PayPal测试**：
   - 使用PayPal沙箱或小金额真实支付测试
   - 验证订阅激活和管理流程

### 7. 监控和维护

#### 日志监控
```bash
# 查看Vercel函数日志
vercel logs

# 或在Vercel Dashboard中查看实时日志
```

#### 支付监控
- Stripe Dashboard：监控支付活动和异常
- PayPal Dashboard：监控交易和订阅状态
- 设置异常通知和告警

#### 数据库维护
- 定期备份数据库
- 监控数据库性能
- 检查支付数据的完整性

## 故障排除

### 常见问题

#### 1. PayPal webhook验证失败
```bash
# 检查webhook配置
curl -X POST https://yourdomain.com/api/paypal/webhook \
  -H "PayPal-Auth-Algo: ..." \
  -H "PayPal-Transmission-Id: ..." \
  -H "PayPal-Cert-Id: ..." \
  -H "PayPal-Transmission-Sig: ..." \
  -H "PayPal-Transmission-Time: ..." \
  -d "test_payload"
```

#### 2. 支付提供商切换问题
检查环境变量 `DEFAULT_PAYMENT_PROVIDER` 是否正确设置。

#### 3. 数据库连接问题
验证 `POSTGRES_URL` 配置和网络连接。

#### 4. 支付失败
- 检查API密钥配置
- 验证产品/计划是否正确创建
- 查看支付提供商的错误日志

### 调试模式

在开发环境中启用详细日志：
```env
NODE_ENV=development
DEBUG=payments:*
```

## 安全考虑

1. **API密钥安全**：
   - 永远不要在客户端代码中暴露API密钥
   - 使用环境变量存储敏感信息
   - 定期轮换API密钥

2. **Webhook安全**：
   - 始终验证webhook签名
   - 使用HTTPS端点
   - 限制webhook源IP

3. **数据安全**：
   - 加密敏感用户数据
   - 定期备份
   - 遵循GDPR/CCPA等数据保护法规

## 性能优化

1. **数据库优化**：
   - 为支付相关字段添加索引
   - 定期清理过期数据
   - 使用连接池

2. **API优化**：
   - 缓存产品和价格信息
   - 实施API限流
   - 使用CDN加速静态资源

3. **支付优化**：
   - 实施支付重试机制
   - 优化支付流程用户体验
   - 监控支付成功率

这个部署指南涵盖了从本地开发到生产环境的完整流程，确保你的多支付提供商SaaS应用能够稳定运行。
