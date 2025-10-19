-- 添加支付提供商字段到teams表
ALTER TABLE teams ADD COLUMN payment_provider VARCHAR(20) DEFAULT 'stripe';

-- 添加通用支付字段
ALTER TABLE teams ADD COLUMN payment_customer_id TEXT;
ALTER TABLE teams ADD COLUMN payment_subscription_id TEXT;
ALTER TABLE teams ADD COLUMN payment_product_id TEXT;

-- 添加PayPal特定字段（用于向后兼容）
ALTER TABLE teams ADD COLUMN paypal_customer_id TEXT;
ALTER TABLE teams ADD COLUMN paypal_subscription_id TEXT;
ALTER TABLE teams ADD COLUMN paypal_product_id TEXT;

-- 创建索引以提高查询性能
CREATE INDEX idx_teams_payment_provider ON teams(payment_provider);
CREATE INDEX idx_teams_payment_customer_id ON teams(payment_customer_id);
CREATE INDEX idx_teams_payment_subscription_id ON teams(payment_subscription_id);
CREATE INDEX idx_teams_paypal_customer_id ON teams(paypal_customer_id);
CREATE INDEX idx_teams_paypal_subscription_id ON teams(paypal_subscription_id);

-- 数据迁移：将现有Stripe数据迁移到通用字段
UPDATE teams 
SET 
  payment_provider = 'stripe',
  payment_customer_id = stripe_customer_id,
  payment_subscription_id = stripe_subscription_id,
  payment_product_id = stripe_product_id
WHERE stripe_customer_id IS NOT NULL;

-- 添加约束确保支付提供商字段的值有效
ALTER TABLE teams ADD CONSTRAINT chk_payment_provider 
  CHECK (payment_provider IN ('stripe', 'paypal'));
