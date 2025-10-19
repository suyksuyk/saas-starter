# Vercel Postgres 部署配置详细指南

本指南将详细解释如何为多支付提供商SaaS应用配置和部署Vercel Postgres数据库。

## 📋 部署概览

- [ ] 创建Vercel账户和项目
- [ ] 配置Vercel Postgres数据库
- [ ] 设置环境变量
- [ ] 运行数据库迁移
- [ ] 部署应用到Vercel
- [ ] 配置支付提供商webhook
- [ ] 验证部署

## 🚀 第一步：创建Vercel账户和项目

### 1. 注册Vercel账户
1. 访问 https://vercel.com/
2. 点击 "Sign Up"
3. 选择注册方式：
   - GitHub（推荐）
   - GitLab
   - Bitbucket
   - Email

### 2. 创建新项目
1. 登录Vercel Dashboard
2. 点击 "Add New..." → "Project"
3. 导入你的GitHub仓库
4. 如果还没有推送到GitHub，先执行：
   ```bash
   git init
   git add .
   git commit -m "Initial commit: Multi-payment provider SaaS"
   git remote add origin https://github.com/yourusername/your-repo.git
   git push -u origin main
   ```

## 🗄️ 第二步：配置Vercel Postgres

### 1. 创建Vercel Postgres数据库
1. 在Vercel Dashboard中，点击 "Storage" → "Create Database"
2. 选择 "Postgres"
3. 选择地区（推荐选择离你用户最近的地区）：
   - Washington, D.C. (美国东部)
   - San Francisco (美国西部)
   - Frankfurt (欧洲)
   - Singapore (亚洲)
4. 选择数据库计划：
   - **Hobby**（免费，适合开发和小项目）
     - 512MB RAM
     - 10GB 存储
     - 60天数据保留
   - **Pro**（$20/月，适合生产环境）
     - 1GB RAM
     - 100GB 存储
     - 永久数据保留
     - 自动备份

### 2. 数据库配置详情
创建完成后，你会看到：
```
📊 Database Details
├── Database Name: your-app-db
├── Database URL: postgresql://...
├── Region: Washington, D.C.
├── Plan: Hobby
└── Status: Ready
```

### 3. 获取数据库连接信息
在数据库页面，点击 "Connect" → "Direct Connection"：
```
POSTGRES_URL=postgresql://default:xxxxxxxxxxxx@ep-xxx-xxx.us-east-1.aws.neon.tech/dbname?sslmode=require
```

## 🔧 第三步：配置项目环境变量

### 1. 在Vercel项目中设置环境变量
1. 在Vercel项目页面，点击 "Settings" → "Environment Variables"
2. 添加以下环境变量：

#### 必需的环境变量
```env
# 数据库配置
POSTGRES_URL=postgresql://default:xxxxxxxxxxxx@ep-xxx-xxx.us-east-1.aws.neon.tech/dbname?sslmode=require

# 支付提供商配置
DEFAULT_PAYMENT_PROVIDER=stripe

# Stripe配置
STRIPE_SECRET_KEY=sk_live_REDACTED
STRIPE_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# PayPal配置
PAYPAL_CLIENT_ID=your_production_paypal_client_id
PAYPAL_CLIENT_SECRET=your_production_paypal_client_secret
PAYPAL_WEBHOOK_ID=your_production_webhook_id
PAYPAL_WEBHOOK_SECRET=your_production_webhook_secret

# 应用配置
BASE_URL=https://your-app.vercel.app
AUTH_SECRET=your_production_auth_secret_here
```

### 2. 环境变量说明

#### POSTGRES_URL
- 从Vercel Postgres页面复制完整的连接字符串
- 包含SSL设置：`?sslmode=require`
- 格式：`postgresql://username:password@host:port/database?sslmode=require`

#### BASE_URL
- Vercel会自动分配域名：`https://your-app-name.vercel.app`
- 如果使用自定义域名：`https://yourdomain.com`

#### AUTH_SECRET
- 生产环境必须使用强密钥
- 生成命令：`openssl rand -base64 32`
- 至少32个字符

#### 支付提供商配置
- **生产环境**：使用live密钥（`sk_live_`开头）
- **测试环境**：使用test密钥（`sk_test_`开头）

## 🏗️ 第四步：配置数据库迁移

### 1. 创建Vercel Cron Job用于自动迁移
创建 `api/migrate/route.ts`：

```typescript
import { NextResponse } from 'next/server';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from '@/lib/db/schema';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import { runMigrations } from '@/lib/db/migrate-payment-data';

export async function GET() {
  try {
    const connectionString = process.env.POSTGRES_URL;
    if (!connectionString) {
      return NextResponse.json({ error: 'Database URL not found' }, { status: 500 });
    }

    const client = postgres(connectionString);
    const db = drizzle(client, { schema });

    // 运行Drizzle迁移
    await migrate(db, { migrationsFolder: 'lib/db/migrations' });
    
    // 运行支付数据迁移
    await runMigrations('migrate');

    await client.end();

    return NextResponse.json({ 
      message: 'Database migrations completed successfully',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Migration error:', error);
    return NextResponse.json({ 
      error: 'Migration failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
```

### 2. 创建vercel.json配置文件
在项目根目录创建 `vercel.json`：

```json
{
  "functions": {
    "api/migrate/route.ts": {
      "maxDuration": 30
    }
  },
  "build": {
    "env": {
      "NEXT_PUBLIC_APP_URL": "https://your-app.vercel.app"
    }
  },
  "crons": [
    {
      "path": "/api/migrate",
      "schedule": "0 2 * * *"
    }
  ]
}
```

## 🚀 第五步：部署应用

### 1. 自动部署
1. 推送代码到GitHub会自动触发部署
2. 在Vercel Dashboard查看部署进度
3. 部署完成后，访问分配的URL

### 2. 手动触发部署
1. 在Vercel项目页面点击 "Deployments"
2. 点击 "Redeploy" 或推送新代码

### 3. 运行数据库迁移
部署完成后，手动运行迁移：
1. 访问：`https://your-app.vercel.app/api/migrate`
2. 确认迁移成功

### 4. 种子数据（可选）
创建 `api/seed/route.ts`：

```typescript
import { NextResponse } from 'next/server';
import { seedDatabase } from '@/lib/db/seed';

export async function GET() {
  try {
    await seedDatabase();
    return NextResponse.json({ message: 'Database seeded successfully' });
  } catch (error) {
    console.error('Seeding error:', error);
    return NextResponse.json({ error: 'Seeding failed' }, { status: 500 });
  }
}
```

访问：`https://your-app.vercel.app/api/seed`

## 🔔 第六步：配置Webhook

### 1. Stripe Webhook配置
1. 登录Stripe Dashboard
2. 进入 "Developers" → "Webhooks"
3. 创建新的webhook端点：
   - **Endpoint URL**: `https://your-app.vercel.app/api/stripe/webhook`
   - **HTTP method**: POST
4. 选择监听事件：
   - `checkout.session.completed`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`
5. 复制webhook签名密钥并添加到Vercel环境变量

### 2. PayPal Webhook配置
1. 登录PayPal Developer Dashboard
2. 进入 "My Apps & Credentials"
3. 选择你的应用
4. 配置webhook：
   - **Webhook URL**: `https://your-app.vercel.app/api/paypal/webhook`
5. 选择事件类型：
   - `BILLING.SUBSCRIPTION.ACTIVATED`
   - `BILLING.SUBSCRIPTION.CANCELLED`
   - `BILLING.SUBSCRIPTION.SUSPENDED`
   - `PAYMENT.SALE.COMPLETED`
   - `PAYMENT.SALE.DENIED`
6. 复制webhook ID和密钥并添加到Vercel环境变量

## ✅ 第七步：验证部署

### 1. 功能检查清单
- [ ] 应用可以正常访问
- [ ] 用户注册/登录功能正常
- [ ] 数据库连接正常
- [ ] Stripe支付流程正常
- [ ] PayPal支付流程正常
- [ ] Webhook接收正常
- [ ] 客户门户功能正常

### 2. 测试支付流程
1. **Stripe测试**：
   - 使用测试卡：4242 4242 4242 4242
   - 验证订阅创建和管理

2. **PayPal测试**：
   - 使用PayPal沙箱账户
   - 验证支付流程

### 3. 检查数据库
在Vercel Dashboard中：
1. 进入 "Storage" → "Postgres"
2. 点击 "Query"
3. 验证表和数据是否正确创建

```sql
-- 检查用户表
SELECT COUNT(*) FROM users;

-- 检查团队表
SELECT COUNT(*) FROM teams;

-- 检查支付配置
SELECT payment_provider, COUNT(*) FROM teams GROUP BY payment_provider;
```

## 🔧 第八步：监控和维护

### 1. Vercel Analytics
1. 在Vercel项目页面点击 "Analytics"
2. 监控网站性能和用户行为

### 2. 数据库监控
1. 在Vercel Postgres页面查看：
   - 连接数
   - 存储使用情况
   - 查询性能

### 3. 错误监控
1. 查看Vercel函数日志
2. 设置错误通知

### 4. 备份策略
- **Hobby计划**：Vercel自动备份（7天保留）
- **Pro计划**：自动备份（30天保留）+ 手动备份

## 🚨 故障排除

### 常见问题及解决方案

#### 1. 数据库连接失败
**错误**：`Connection refused` 或 `timeout`
**解决方案**：
1. 检查POSTGRES_URL是否正确
2. 确认SSL设置：`?sslmode=require`
3. 检查Vercel函数超时设置

#### 2. 迁移失败
**错误**：`Migration already applied` 或 `Table already exists`
**解决方案**：
1. 检查迁移状态
2. 删除重复的迁移记录
3. 重新运行迁移

#### 3. Webhook验证失败
**错误**：`Webhook signature verification failed`
**解决方案**：
1. 确认webhook URL正确
2. 检查签名密钥配置
3. 验证HTTPS连接

#### 4. 支付失败
**错误**：`Payment failed` 或 `Invalid API key`
**解决方案**：
1. 检查API密钥配置
2. 确认使用正确的环境（test/live）
3. 验证webhook配置

## 📊 性能优化

### 1. 数据库优化
```sql
-- 创建索引
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_teams_user_id ON teams(user_id);
CREATE INDEX IF NOT EXISTS idx_teams_payment_provider ON teams(payment_provider);
```

### 2. 缓存配置
在Vercel项目中启用缓存：
```json
{
  "functions": {
    "api/**/*.ts": {
      "maxDuration": 30,
      "cache": "public, max-age=3600"
    }
  }
}
```

### 3. CDN配置
Vercel自动提供CDN服务，无需额外配置。

## 🔒 安全考虑

### 1. 环境变量安全
- 永远不要在代码中硬编码敏感信息
- 使用Vercel的环境变量功能
- 定期轮换API密钥

### 2. 数据库安全
- 使用SSL连接（Vercel Postgres默认启用）
- 限制数据库访问权限
- 定期备份数据

### 3. Webhook安全
- 验证所有webhook签名
- 使用HTTPS端点
- 限制webhook源IP

## 📈 扩展和升级

### 1. 从Hobby升级到Pro
1. 在Vercel Postgres页面点击 "Upgrade"
2. 选择Pro计划
3. 确认升级

### 2. 添加自定义域名
1. 在Vercel项目页面点击 "Settings" → "Domains"
2. 添加你的域名
3. 配置DNS记录

### 3. 配置CDN
Vercel自动提供全球CDN，无需额外配置。

---

## 🎯 部署完成

恭喜！你的多支付提供商SaaS应用现在已经成功部署到Vercel，使用Vercel Postgres作为数据库。

### 最终检查清单
- [ ] 应用在 https://your-app.vercel.app 正常运行
- [ ] 用户可以注册和登录
- [ ] Stripe和PayPal支付功能正常
- [ ] Webhook正确接收事件
- [ ] 数据库连接和查询正常
- [ ] 监控和日志功能正常

### 下一步
1. 监控应用性能和错误
2. 收集用户反馈
3. 考虑添加更多支付提供商
4. 优化性能和用户体验

现在你可以开始运营你的SaaS应用了！🚀
