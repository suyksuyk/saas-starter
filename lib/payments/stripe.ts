// 向后兼容的Stripe相关函数
// 这些函数现在使用新的支付提供商架构

import { PaymentProviderFactory } from './providers/payment-provider.factory';
import { StripeProvider } from './providers/stripe.provider';

// 为了向后兼容，保留原有的Stripe实例
import Stripe from 'stripe';

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-04-30.basil'
});

// 向后兼容的函数，现在使用新的架构
export async function createCheckoutSession({
  team,
  priceId
}: {
  team: any;
  priceId: string;
}) {
  const provider = new StripeProvider();
  return provider.createCheckoutSession({
    team,
    priceId,
    userId: team.userId || ''
  });
}

export async function createCustomerPortalSession(team: any) {
  const provider = new StripeProvider();
  return provider.createCustomerPortalSession({ team });
}

export async function handleSubscriptionChange(
  subscription: Stripe.Subscription
) {
  const provider = new StripeProvider();
  return provider.handleSubscriptionChange(subscription);
}

export async function getStripePrices() {
  const provider = new StripeProvider();
  return provider.getPrices();
}

export async function getStripeProducts() {
  const provider = new StripeProvider();
  return provider.getProducts();
}
