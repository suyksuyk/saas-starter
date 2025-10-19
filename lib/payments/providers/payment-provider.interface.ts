export interface Product {
  id: string;
  name: string;
  description?: string;
  defaultPriceId?: string;
}

export interface Price {
  id: string;
  productId: string;
  unitAmount: number;
  currency: string;
  interval?: string;
  trialPeriodDays?: number;
}

export interface CheckoutParams {
  team: any;
  priceId: string;
  userId: string;
}

export interface PortalParams {
  team: any;
}

export interface WebhookEvent {
  type: string;
  data: any;
}

export interface SubscriptionData {
  subscriptionId: string;
  productId: string;
  planName: string;
  status: string;
  customerId?: string;
}

/**
 * 支付提供商接口
 * 定义所有支付提供商必须实现的标准方法
 */
export interface PaymentProvider {
  /**
   * 创建结账会话
   */
  createCheckoutSession(params: CheckoutParams): Promise<string>;

  /**
   * 创建客户门户会话
   */
  createCustomerPortalSession(params: PortalParams): Promise<{ url: string }>;

  /**
   * 处理webhook事件
   */
  handleWebhook(event: WebhookEvent): Promise<void>;

  /**
   * 获取产品列表
   */
  getProducts(): Promise<Product[]>;

  /**
   * 获取价格列表
   */
  getPrices(): Promise<Price[]>;

  /**
   * 处理订阅变更
   */
  handleSubscriptionChange(subscriptionData: any): Promise<void>;

  /**
   * 验证webhook签名
   */
  verifyWebhookSignature(payload: string, signature: string | Record<string, string>, secret: string): boolean;

  /**
   * 获取提供商名称
   */
  getProviderName(): string;
}
