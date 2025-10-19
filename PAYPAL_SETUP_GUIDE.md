# PayPal 集成配置详细指南

本指南将详细说明如何为您的SaaS应用配置PayPal支付集成。

## 📋 配置概览

- [ ] 创建PayPal开发者账户
- [ ] 创建PayPal应用程序
- [ ] 获取API密钥
- [ ] 配置Webhook
- [ ] 设置环境变量
- [ ] 测试PayPal集成

## 🚀 第一步：创建PayPal开发者账户

### 1. 注册PayPal开发者账户
1. 访问 https://developer.paypal.com/
2. 点击 "Log In" 或 "Sign Up"
3. 使用您的PayPal账户登录，或创建新账户

### 2. 创建测试账户（沙箱环境）
1. 登录后，进入 Dashboard
2. 点击 "Apps & Credentials" 
3. 在 "Sandbox" 标签页下，点击 "Create Account"
4. 创建 **Personal** 和 **Business** 测试账户：
   - **Personal Account**：用于模拟客户
   - **Business Account**：用于接收付款

## 🔧 第二步：创建PayPal应用程序

### 1. 创建新应用
1. 在 "Apps & Credentials" 页面
2. 确保选择 "Sandbox" 模式
3. 点击 "Create App"
4. 填写应用信息：
   - **App Name**: 您的应用名称（如 "Rainwish SaaS"）
   - **App Type**: 选择 "Merchant"
   - **Business Email**: 选择您的Business测试账户

### 2. 获取API密钥
创建应用后，您将获得：
```
📋 应用凭证
├── Client ID: your_sandbox_client_id
├── Client Secret: your_sandbox_client_secret
└── Webhook ID: (稍后创建)
```

## 🌐 第三步：配置PayPal订阅产品

### 1. 创建产品
1. 在PayPal Dashboard中，进入 "Products"
2. 点击 "Create Product"
3. 填写产品信息：
   ```
   产品信息
   ├── 名称: Basic Plan
   ├── 描述: 基础订阅计划
   ├── 类型: SERVICE
   └── 类别: SOFTWARE
   ```

### 2. 创建计费计划
1. 进入 "Billing Plans"
2. 点击 "Create Plan"
3. 配置计费周期：
   ```
   计划配置
   ├── 产品: 选择刚创建的产品
   ├── 名称: Basic Monthly
   ├── 描述: 每月基础订阅
   └── 计费周期:
       ├── 频率: MONTHLY
       ├── 价格: $10.00 USD
       └── 试用: 可选（如7天免费试用）
   ```

### 3. 重复创建多个计划
为您的SaaS应用创建不同的定价层级：
- **Basic Plan**: $10/月
- **Pro Plan**: $29/月  
- **Enterprise Plan**: $99/月

## 🔔 第四步：配置Webhook

### 1. 创建Webhook
1. 在PayPal Dashboard中，进入 "Webhooks"
2. 点击 "Add Webhook"
3. 输入Webhook URL：
   ```
   开发环境: http://localhost:3000/api/paypal/webhook
   生产环境: https://yourdomain.com/api/paypal/webhook
   ```
4. 选择监听事件：
   ```
   Webhook事件
   ├── BILLING.SUBSCRIPTION.ACTIVATED
   ├── BILLING.SUBSCRIPTION.CANCELLED
   ├── BILLING.SUBSCRIPTION.SUSPENDED
   ├── BILLING.SUBSCRIPTION.UPDATED
   ├── PAYMENT.SALE.COMPLETED
   ├── PAYMENT.SALE.DENIED
   └── PAYMENT.SALE.REFUNDED
   ```

### 2. 获取Webhook信息
创建后记录：
```
📋 Webhook信息
├── Webhook ID: your_webhook_id
├── Webhook URL: https://yourdomain.com/api/paypal/webhook
└── 验证密钥: (PayPal自动生成)
```

## 🔧 第五步：配置环境变量

### 1. 开发环境配置
在 `.env.local` 文件中添加：

```env
# PayPal配置
PAYPAL_CLIENT_ID=your_sandbox_client_id
PAYPAL_CLIENT_SECRET=your_sandbox_client_secret
PAYPAL_WEBHOOK_ID=your_sandbox_webhook_id
PAYPAL_WEBHOOK_SECRET=your_webhook_secret

# 支付提供商配置
DEFAULT_PAYMENT_PROVIDER=paypal

# 应用配置
BASE_URL=http://localhost:3000
```

### 2. 生产环境配置
在Vercel或其他托管平台中设置：

```env
# PayPal生产环境
PAYPAL_CLIENT_ID=your_production_client_id
PAYPAL_CLIENT_SECRET=your_production_client_secret
PAYPAL_WEBHOOK_ID=your_production_webhook_id
PAYPAL_WEBHOOK_SECRET=your_production_webhook_secret

# 应用URL
BASE_URL=https://yourdomain.com
```

## 🧪 第六步：测试PayPal集成

### 1. 启动应用
```bash
npm run dev
```

### 2. 测试订阅流程
1. 访问 `/pricing` 页面
2. 选择PayPal作为支付方式
3. 点击订阅按钮
4. 使用PayPal沙箱账户登录：
   - 使用创建的Personal测试账户
   - 密码：在PayPal Dashboard中查看

### 3. 验证Webhook
1. 在PayPal Dashboard中查看Webhook事件
2. 检查应用日志确认webhook接收
3. 验证数据库中的订阅状态

## 🚀 第七步：生产环境部署

### 1. 切换到生产环境
1. 在PayPal Dashboard中切换到 "Live" 模式
2. 创建生产环境应用
3. 获取生产环境API密钥

### 2. 更新Webhook URL
1. 创建生产环境Webhook
2. URL: `https://yourdomain.com/api/paypal/webhook`
3. 选择相同的事件类型

### 3. 配置生产环境变量
更新您的托管平台环境变量为生产环境值。

## 📊 PayPal API参考

### 核心API端点

#### 1. 获取访问令牌
```bash
POST https://api-m.paypal.com/v1/oauth2/token
Authorization: Basic <base64(client_id:client_secret)>
Content-Type: application/x-www-form-urlencoded

grant_type=client_credentials
```

#### 2. 创建订阅
```bash
POST https://api-m.paypal.com/v1/billing/subscriptions
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "plan_id": "P-PLAN_ID",
  "application_context": {
    "brand_name": "Your App",
    "user_action": "SUBSCRIBE_NOW",
    "return_url": "https://yourdomain.com/api/paypal/checkout",
    "cancel_url": "https://yourdomain.com/pricing"
  }
}
```

#### 3. 获取订阅详情
```bash
GET https://api-m.paypal.com/v1/billing/subscriptions/{SUBSCRIPTION_ID}
Authorization: Bearer <access_token>
```

## 🔍 故障排除

### 常见问题及解决方案

#### 1. "Invalid client credentials"
**原因**：API密钥错误或环境不匹配
**解决方案**：
- 检查Client ID和Secret是否正确
- 确认沙箱/生产环境匹配
- 验证环境变量配置

#### 2. "Webhook signature verification failed"
**原因**：Webhook签名验证失败
**解决方案**：
- 检查Webhook ID是否正确
- 验证Webhook URL是否可访问
- 确认SSL证书有效（生产环境）

#### 3. "Subscription creation failed"
**原因**：计划配置或API调用错误
**解决方案**：
- 检查Plan ID是否存在
- 验证计划状态是否为ACTIVE
- 检查API请求格式

#### 4. "No approval URL found"
**原因**：PayPal响应格式问题
**解决方案**：
- 检查API响应结构
- 验证应用上下文配置
- 确认返回URL格式正确

### 调试技巧

#### 1. 启用详细日志
```typescript
// 在PayPal provider中添加调试日志
console.log('PayPal API Request:', subscriptionData);
console.log('PayPal API Response:', subscription);
```

#### 2. 使用PayPal Webhook模拟器
1. 在PayPal Dashboard中使用Webhook模拟器
2. 发送测试事件到您的Webhook URL
3. 检查响应和日志

#### 3. 检查API调用
```bash
# 使用curl测试API
curl -X POST https://api-m.sandbox.paypal.com/v1/oauth2/token \
  -H "Accept: application/json" \
  -H "Accept-Language: en_US" \
  -u "client_id:client_secret" \
  -d "grant_type=client_credentials"
```

## 📈 最佳实践

### 1. 安全性
- 永远不要在客户端代码中暴露Client Secret
- 使用HTTPS进行所有API调用
- 验证所有Webhook事件
- 定期轮换API密钥

### 2. 错误处理
- 实现重试机制处理临时错误
- 记录详细的错误日志
- 提供用户友好的错误消息
- 设置监控和告警

### 3. 性能优化
- 缓存访问令牌（有效期内）
- 使用异步处理Webhook事件
- 实现幂等性处理
- 监控API调用频率

### 4. 用户体验
- 提供清晰的订阅状态显示
- 实现订阅管理界面
- 支持订阅升级/降级
- 提供取消订阅确认

## 🎯 集成验证清单

### 开发环境
- [ ] PayPal沙箱账户创建完成
- [ ] 测试应用创建成功
- [ ] API密钥配置正确
- [ ] Webhook端点可访问
- [ ] 订阅流程测试通过
- [ ] Webhook事件接收正常

### 生产环境
- [ ] PayPal生产应用创建
- [ ] 生产API密钥配置
- [ ] 生产Webhook设置
- [ ] SSL证书配置
- [ ] 域名验证完成
- [ ] 实际支付测试通过

## 📚 相关资源

- [PayPal开发者文档](https://developer.paypal.com/docs/)
- [PayPal订阅API](https://developer.paypal.com/docs/api/subscriptions/)
- [PayPal Webhook指南](https://developer.paypal.com/docs/api-basics/webhooks/)
- [PayPal SDK文档](https://developer.paypal.com/tools/sandbox/)

---

## 🎉 配置完成

恭喜！您的PayPal支付集成现在已经配置完成。

### 下一步
1. 测试完整的订阅流程
2. 配置监控和日志
3. 准备生产环境部署
4. 考虑添加更多支付选项

现在您的用户可以通过PayPal订阅您的SaaS服务了！🚀
