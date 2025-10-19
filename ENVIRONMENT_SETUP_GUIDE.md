# 环境变量配置详细指南

本指南将详细解释如何获取和设置所有必需的环境变量。

## 📋 配置清单

- [ ] PostgreSQL数据库连接
- [ ] 支付提供商配置（Stripe或PayPal）
- [ ] 应用安全配置

## 🗄️ 1. PostgreSQL数据库配置

### 选项A：本地Docker PostgreSQL（推荐用于开发）

#### 步骤1：安装Docker
1. 访问 https://www.docker.com/products/docker-desktop
2. 下载并安装Docker Desktop
3. 启动Docker Desktop

#### 步骤2：启动PostgreSQL容器
在项目根目录运行：
```bash
docker compose up -d
```

#### 步骤3：获取连接字符串
使用以下连接字符串：
```
POSTGRES_URL=postgresql://postgres:postgres@localhost:54322/postgres
```

### 选项B：远程PostgreSQL数据库

#### Vercel Postgres（推荐）
1. 访问 https://vercel.com/marketplace?category=databases
2. 点击 "Hobby Postgres" → "Add"
3. 创建数据库
4. 复制连接字符串

#### 其他选项
- **Supabase**: https://supabase.com/
- **Neon**: https://neon.tech/
- **Railway**: https://railway.app/

## 💳 2. 支付提供商配置

### Stripe配置

#### 步骤1：创建Stripe账户
1. 访问 https://dashboard.stripe.com/register
2. 注册账户（免费）
3. 完成邮箱验证

#### 步骤2：获取API密钥
1. 登录Stripe Dashboard
2. 左侧菜单 → "开发者" → "API密钥"
3. 复制 "密钥" 下的 "可发布密钥" 和 "秘密密钥"
4. **重要**：使用测试密钥（以 `sk_test_` 开头）

```
STRIPE_SECRET_KEY=sk_test_51xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

#### 步骤3：设置Webhook
1. Stripe Dashboard → "开发者" → "Webhooks"
2. 点击 "添加端点"
3. 端点URL：`http://localhost:3000/api/stripe/webhook`
4. 选择事件：
   - `checkout.session.completed`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`
5. 复制 "签名密钥"（以 `whsec_` 开头）

```
STRIPE_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

#### 步骤4：安装Stripe CLI（可选，用于本地测试）
```bash
npm install -g stripe-cli
stripe login
stripe listen --forward-to localhost:3000/api/stripe/webhook
```

### PayPal配置

#### 步骤1：创建PayPal开发者账户
1. 访问 https://developer.paypal.com/
2. 点击 "Sign Up" → "Create Account"
3. 选择 "Personal" 或 "Business"
4. 完成注册和邮箱验证

#### 步骤2：创建应用程序
1. 登录PayPal Developer Dashboard
2. 点击 "My Apps & Credentials"
3. 点击 "Create App"
4. 应用名称：`My SaaS App`
5. 选择 "Sandbox" 模式
6. 点击 "Create App"

#### 步骤3：获取API凭据
创建应用后，你会看到：
```
PAYPAL_CLIENT_ID=AQkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkk
PAYPAL_CLIENT_SECRET=EJJjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjj
```

#### 步骤4：配置Webhook
1. 在应用页面点击 "Webhooks"
2. 点击 "Add Webhook"
3. Webhook URL：`http://localhost:3000/api/paypal/webhook`
4. 选择事件类型：
   - `BILLING.SUBSCRIPTION.ACTIVATED`
   - `BILLING.SUBSCRIPTION.CANCELLED`
   - `BILLING.SUBSCRIPTION.SUSPENDED`
   - `PAYMENT.SALE.COMPLETED`
   - `PAYMENT.SALE.DENIED`
5. 复制Webhook ID和Webhook Secret

```
PAYPAL_WEBHOOK_ID=webhook_id_from_paypal
PAYPAL_WEBHOOK_SECRET=webhook_secret_from_paypal
```

#### PayPal沙箱测试账户
1. PayPal Developer Dashboard → "Accounts"
2. 查看默认的测试账户
3. 使用这些账户进行测试支付

## 🔐 3. 应用安全配置

### BASE_URL
```
BASE_URL=http://localhost:3000
```
- 开发环境：`http://localhost:3000`
- 生产环境：`https://yourdomain.com`

### AUTH_SECRET
生成安全的随机字符串：

#### 方法1：使用OpenSSL
```bash
openssl rand -base64 32
```

#### 方法2：使用Node.js
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

#### 方法3：在线生成器
访问 https://generate-secret.vercel.app/32

示例：
```
AUTH_SECRET=a1b2c3d4e5f6789012345678901234567890abcdef1234567890abcdef123456
```

## 📝 4. 完整的.env文件示例

### 开发环境示例
```env
# 数据库配置
POSTGRES_URL=postgresql://postgres:postgres@localhost:54322/postgres

# 支付提供商配置
DEFAULT_PAYMENT_PROVIDER=stripe
# 可选值: stripe, paypal

# Stripe配置
STRIPE_SECRET_KEY=sk_test_51xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
STRIPE_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# PayPal配置
PAYPAL_CLIENT_ID=AQkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkk
PAYPAL_CLIENT_SECRET=EJJjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjj
PAYPAL_WEBHOOK_ID=webhook_id_from_paypal
PAYPAL_WEBHOOK_SECRET=webhook_secret_from_paypal

# 应用配置
BASE_URL=http://localhost:3000
AUTH_SECRET=a1b2c3d4e5f6789012345678901234567890abcdef1234567890abcdef123456
```

### 生产环境示例
```env
# 数据库配置
POSTGRES_URL=postgresql://user:password@host:port/database

# 支付提供商配置
DEFAULT_PAYMENT_PROVIDER=stripe

# Stripe配置（生产环境）
STRIPE_SECRET_KEY=sk_live_REDACTED
STRIPE_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# PayPal配置（生产环境）
PAYPAL_CLIENT_ID=production_client_id
PAYPAL_CLIENT_SECRET=production_client_secret
PAYPAL_WEBHOOK_ID=production_webhook_id
PAYPAL_WEBHOOK_SECRET=production_webhook_secret

# 应用配置
BASE_URL=https://yourdomain.com
AUTH_SECRET=production_auth_secret_here
```

## 🛠️ 5. 配置验证

### 验证数据库连接
```bash
pnpm db:migrate
```
如果成功，说明数据库配置正确。

### 验证Stripe配置
```bash
# 测试Stripe API
curl -X GET "https://api.stripe.com/v1/products" \
  -u "sk_test_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxx:"
```

### 验证PayPal配置
```bash
# 测试PayPal API
curl -X POST "https://api-m.sandbox.paypal.com/v1/oauth2/token" \
  -u "your_client_id:your_client_secret" \
  -d "grant_type=client_credentials"
```

## 🔧 6. 常见问题解决

### 问题1：数据库连接失败
**错误**：`Connection refused`
**解决**：
1. 确保PostgreSQL容器正在运行：`docker ps`
2. 检查连接字符串格式
3. 确认端口54322未被占用

### 问题2：Stripe API密钥无效
**错误**：`Invalid API Key`
**解决**：
1. 确认使用的是秘密密钥（sk_test_开头）
2. 检查是否有空格或特殊字符
3. 确认API密钥已激活

### 问题3：PayPal Webhook验证失败
**错误**：`Webhook signature verification failed`
**解决**：
1. 确认Webhook URL正确
2. 检查Webhook Secret是否匹配
3. 确认使用正确的环境（沙箱/生产）

### 问题4：AUTH_SECRET错误
**错误**：`Invalid AUTH_SECRET`
**解决**：
1. 重新生成AUTH_SECRET
2. 确保长度至少32个字符
3. 避免使用特殊字符

## 🚀 7. 快速配置脚本

如果你想自动化配置过程，可以运行：

```bash
# Windows用户
npm run setup:simple

# macOS/Linux用户
chmod +x scripts/setup-multi-payment.sh
./scripts/setup-multi-payment.sh
```

## 📞 8. 获取帮助

如果遇到问题：

1. **Stripe支持**：https://support.stripe.com/
2. **PayPal支持**：https://developer.paypal.com/support/
3. **本项目Issues**：在GitHub仓库创建Issue
4. **社区支持**：Stack Overflow, Discord等

---

**重要提醒**：
- 永远不要在代码中硬编码敏感信息
- 定期轮换API密钥和密码
- 在生产环境中使用HTTPS
- 定期备份数据库和配置文件

配置完成后，你就可以启动应用并测试支付功能了！
