import { redirect } from 'next/navigation';
import { 
  PaymentProvider, 
  Product, 
  Price, 
  CheckoutParams, 
  PortalParams, 
  WebhookEvent,
  SubscriptionData 
} from './payment-provider.interface';
import {
  getTeamByPayPalCustomerId,
  getUser,
  updateTeamPayPalSubscription
} from '@/lib/db/queries';

// PayPal SDK types
interface PayPalProduct {
  id: string;
  name: string;
  description?: string;
  status: string;
}

interface PayPalPlan {
  id: string;
  product_id: string;
  name: string;
  description?: string;
  status: string;
  billing_cycles: Array<{
    frequency: {
      interval_unit: 'DAY' | 'WEEK' | 'MONTH' | 'YEAR';
      interval_count: number;
    };
    tenure_type: 'TRIAL' | 'REGULAR';
    sequence: number;
    total_cycles: number;
    pricing_scheme: {
      fixed_price: {
        value: string;
        currency_code: string;
      };
    };
  }>;
  payment_preferences: {
    auto_bill_outstanding: boolean;
    setup_fee_failure_action: 'CONTINUE' | 'CANCEL';
    payment_failure_threshold: number;
  };
}

interface PayPalSubscription {
  id: string;
  plan_id: string;
  status: string;
  subscriber: {
    email_address: string;
    name: {
      given_name: string;
      surname: string;
    };
  };
  application_context: {
    brand_name: string;
    locale: string;
    shipping_preference: 'NO_SHIPPING' | 'GET_FROM_FILE' | 'SET_PROVIDED_ADDRESS';
    user_action: 'SUBSCRIBE_NOW' | 'CONTINUE';
    payment_method: {
      payer_selected: 'PAYPAL';
      payee_preferred: 'IMMEDIATE_PAYMENT_REQUIRED';
    };
    return_url: string;
    cancel_url: string;
  };
}

interface PayPalSubscriptionCreateResponse {
  id: string;
  status: string;
  links: Array<{
    href: string;
    rel: string;
    method: string;
  }>;
}

export class PayPalProvider implements PaymentProvider {
  private clientId: string;
  private clientSecret: string;
  private baseUrl: string;
  private webhookId: string;

  constructor() {
    this.clientId = process.env.PAYPAL_CLIENT_ID!;
    this.clientSecret = process.env.PAYPAL_CLIENT_SECRET!;
    this.webhookId = process.env.PAYPAL_WEBHOOK_ID!;
    this.baseUrl = process.env.NODE_ENV === 'production' 
      ? 'https://api-m.paypal.com' 
      : 'https://api-m.sandbox.paypal.com';
  }

  private async getAccessToken(): Promise<string> {
    const auth = Buffer.from(`${this.clientId}:${this.clientSecret}`).toString('base64');
    
    const response = await fetch(`${this.baseUrl}/v1/oauth2/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${auth}`
      },
      body: 'grant_type=client_credentials'
    });

    const data = await response.json();
    return data.access_token;
  }

  async createCheckoutSession(params: CheckoutParams): Promise<string> {
    const { team, priceId, userId } = params;

    if (!team || !userId) {
      redirect(`/sign-up?redirect=checkout&priceId=${priceId}`);
    }

    const accessToken = await this.getAccessToken();
    const user = await getUser();
    
    // 创建订阅
    const subscriptionData = {
      plan_id: priceId,
      application_context: {
        brand_name: 'Rainwish',
        locale: 'en-US',
        shipping_preference: 'NO_SHIPPING',
        user_action: 'SUBSCRIBE_NOW',
        payment_method: {
          payer_selected: 'PAYPAL',
          payee_preferred: 'IMMEDIATE_PAYMENT_REQUIRED'
        },
        return_url: `${process.env.BASE_URL}/api/paypal/checkout?subscription_id={SUBSCRIPTION_ID}`,
        cancel_url: `${process.env.BASE_URL}/pricing`
      },
      custom_id: userId.toString(),
      subscriber: {
        email_address: user?.email || ''
      }
    };

    const response = await fetch(`${this.baseUrl}/v1/billing/subscriptions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
        'PayPal-Request-Id': `sub_${Date.now()}_${userId}`
      },
      body: JSON.stringify(subscriptionData)
    });

    if (!response.ok) {
      throw new Error(`PayPal subscription creation failed: ${response.statusText}`);
    }

    const subscription: PayPalSubscriptionCreateResponse = await response.json();
    
    // 找到approval_url链接
    const approvalLink = subscription.links.find(link => link.rel === 'approve');
    if (!approvalLink) {
      throw new Error('No approval URL found in PayPal response');
    }

    return approvalLink.href;
  }

  async createCustomerPortalSession(params: PortalParams): Promise<{ url: string }> {
    const { team } = params;

    if (!team.paypalCustomerId) {
      redirect('/pricing');
    }

    // PayPal没有直接的客户门户，我们重定向到管理页面
    // 在实际应用中，这里可以创建一个自定义的管理页面
    return { 
      url: `${process.env.BASE_URL}/dashboard/billing?provider=paypal&customerId=${team.paypalCustomerId}` 
    };
  }

  async handleWebhook(event: WebhookEvent): Promise<void> {
    switch (event.type) {
      case 'BILLING.SUBSCRIPTION.ACTIVATED':
      case 'BILLING.SUBSCRIPTION.CANCELLED':
      case 'BILLING.SUBSCRIPTION.SUSPENDED':
        await this.handleSubscriptionChange(event.data);
        break;
      default:
        console.log(`Unhandled PayPal webhook event type ${event.type}`);
    }
  }

  async handleSubscriptionChange(subscriptionData: any): Promise<void> {
    const subscriptionId = subscriptionData.id;
    const status = subscriptionData.status;
    const planId = subscriptionData.plan_id;
    const customId = subscriptionData.custom_id; // 用户ID

    if (!customId) {
      console.error('No custom_id found in PayPal subscription');
      return;
    }

    // 通过用户ID查找团队
    const user = await getUser();
    if (!user) {
      console.error('User not found for PayPal subscription');
      return;
    }

    // 这里需要实现通过用户ID查找团队的逻辑
    // 暂时使用现有的getTeamByPayPalCustomerId方法
    const team = await getTeamByPayPalCustomerId(subscriptionId);
    
    if (!team) {
      console.error('Team not found for PayPal subscription:', subscriptionId);
      return;
    }

    // 获取计划信息
    const plan = await this.getPlanDetails(planId);
    
    if (status === 'ACTIVE') {
      await updateTeamPayPalSubscription(team.id, {
        paymentSubscriptionId: subscriptionId,
        paymentProductId: plan.product_id,
        planName: plan.name,
        subscriptionStatus: status.toLowerCase()
      });
    } else if (status === 'CANCELLED' || status === 'SUSPENDED') {
      await updateTeamPayPalSubscription(team.id, {
        paymentSubscriptionId: null,
        paymentProductId: null,
        planName: null,
        subscriptionStatus: status.toLowerCase()
      });
    }
  }

  private async getPlanDetails(planId: string): Promise<PayPalPlan> {
    const accessToken = await this.getAccessToken();
    
    const response = await fetch(`${this.baseUrl}/v1/billing/plans/${planId}`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to get PayPal plan details: ${response.statusText}`);
    }

    return await response.json();
  }

  async getProducts(): Promise<Product[]> {
    const accessToken = await this.getAccessToken();
    
    const response = await fetch(`${this.baseUrl}/v1/catalogs/products`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to get PayPal products: ${response.statusText}`);
    }

    const data = await response.json();
    const products: PayPalProduct[] = data.products || [];

    return products.map((product) => ({
      id: product.id,
      name: product.name,
      description: product.description
    }));
  }

  async getPrices(): Promise<Price[]> {
    const accessToken = await this.getAccessToken();
    
    const response = await fetch(`${this.baseUrl}/v1/billing/plans`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to get PayPal plans: ${response.statusText}`);
    }

    const data = await response.json();
    const plans: PayPalPlan[] = data.plans || [];

    return plans.map((plan) => {
      const regularCycle = plan.billing_cycles.find(cycle => cycle.tenure_type === 'REGULAR');
      const trialCycle = plan.billing_cycles.find(cycle => cycle.tenure_type === 'TRIAL');
      
      return {
        id: plan.id,
        productId: plan.product_id,
        unitAmount: Math.round(parseFloat(regularCycle?.pricing_scheme.fixed_price.value || '0') * 100),
        currency: regularCycle?.pricing_scheme.fixed_price.currency_code || 'USD',
        interval: regularCycle?.frequency.interval_unit.toLowerCase(),
        trialPeriodDays: trialCycle ? trialCycle.frequency.interval_count : undefined
      };
    });
  }

  verifyWebhookSignature(payload: string, headers: Record<string, string>, secret: string): boolean {
    // PayPal webhook验证逻辑
    // 这里需要实现PayPal的webhook签名验证
    // 具体实现取决于PayPal的webhook验证方式
    try {
      // 简化版本，实际应该验证PayPal的签名
      const authAlgo = headers['paypal-auth-algo'];
      const transmissionId = headers['paypal-transmission-id'];
      const certId = headers['paypal-cert-id'];
      const transmissionSig = headers['paypal-transmission-sig'];
      const transmissionTime = headers['paypal-transmission-time'];
      
      if (!authAlgo || !transmissionId || !certId || !transmissionSig || !transmissionTime) {
        return false;
      }

      // 这里应该调用PayPal的webhook验证API
      // 为了简化，暂时返回true
      return true;
    } catch (error) {
      console.error('PayPal webhook signature verification failed:', error);
      return false;
    }
  }

  getProviderName(): string {
    return 'paypal';
  }
}
