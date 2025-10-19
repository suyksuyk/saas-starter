import Stripe from 'stripe';
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
  getTeamByStripeCustomerId,
  getUser,
  updateTeamSubscription
} from '@/lib/db/queries';

export class StripeProvider implements PaymentProvider {
  private stripe: Stripe;

  constructor() {
    this.stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
      apiVersion: '2025-04-30.basil'
    });
  }

  async createCheckoutSession(params: CheckoutParams): Promise<string> {
    const { team, priceId, userId } = params;

    if (!team || !userId) {
      redirect(`/sign-up?redirect=checkout&priceId=${priceId}`);
    }

    const session = await this.stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1
        }
      ],
      mode: 'subscription',
      success_url: `${process.env.BASE_URL}/api/stripe/checkout?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.BASE_URL}/pricing`,
      customer: team.stripeCustomerId || undefined,
      client_reference_id: userId.toString(),
      allow_promotion_codes: true,
      subscription_data: {
        trial_period_days: 14
      }
    });

    return session.url!;
  }

  async createCustomerPortalSession(params: PortalParams): Promise<{ url: string }> {
    const { team } = params;

    if (!team.stripeCustomerId || !team.stripeProductId) {
      redirect('/pricing');
    }

    let configuration: Stripe.BillingPortal.Configuration;
    const configurations = await this.stripe.billingPortal.configurations.list();

    if (configurations.data.length > 0) {
      configuration = configurations.data[0];
    } else {
      const product = await this.stripe.products.retrieve(team.stripeProductId);
      if (!product.active) {
        throw new Error("Team's product is not active in Stripe");
      }

      const prices = await this.stripe.prices.list({
        product: product.id,
        active: true
      });
      if (prices.data.length === 0) {
        throw new Error("No active prices found for the team's product");
      }

      configuration = await this.stripe.billingPortal.configurations.create({
        business_profile: {
          headline: 'Manage your subscription'
        },
        features: {
          subscription_update: {
            enabled: true,
            default_allowed_updates: ['price', 'quantity', 'promotion_code'],
            proration_behavior: 'create_prorations',
            products: [
              {
                product: product.id,
                prices: prices.data.map((price) => price.id)
              }
            ]
          },
          subscription_cancel: {
            enabled: true,
            mode: 'at_period_end',
            cancellation_reason: {
              enabled: true,
              options: [
                'too_expensive',
                'missing_features',
                'switched_service',
                'unused',
                'other'
              ]
            }
          },
          payment_method_update: {
            enabled: true
          }
        }
      });
    }

    const session = await this.stripe.billingPortal.sessions.create({
      customer: team.stripeCustomerId,
      return_url: `${process.env.BASE_URL}/dashboard`,
      configuration: configuration.id
    });

    return { url: session.url };
  }

  async handleWebhook(event: WebhookEvent): Promise<void> {
    switch (event.type) {
      case 'customer.subscription.updated':
      case 'customer.subscription.deleted':
        await this.handleSubscriptionChange(event.data);
        break;
      default:
        console.log(`Unhandled event type ${event.type}`);
    }
  }

  async handleSubscriptionChange(subscription: Stripe.Subscription): Promise<void> {
    const customerId = subscription.customer as string;
    const subscriptionId = subscription.id;
    const status = subscription.status;

    const team = await getTeamByStripeCustomerId(customerId);

    if (!team) {
      console.error('Team not found for Stripe customer:', customerId);
      return;
    }

    if (status === 'active' || status === 'trialing') {
      const plan = subscription.items.data[0]?.plan;
      await updateTeamSubscription(team.id, {
        stripeSubscriptionId: subscriptionId,
        stripeProductId: plan?.product as string,
        planName: (plan?.product as Stripe.Product).name,
        subscriptionStatus: status
      });
    } else if (status === 'canceled' || status === 'unpaid') {
      await updateTeamSubscription(team.id, {
        stripeSubscriptionId: null,
        stripeProductId: null,
        planName: null,
        subscriptionStatus: status
      });
    }
  }

  async getProducts(): Promise<Product[]> {
    const products = await this.stripe.products.list({
      active: true,
      expand: ['data.default_price']
    });

    return products.data.map((product) => ({
      id: product.id,
      name: product.name,
      description: product.description || undefined,
      defaultPriceId:
        typeof product.default_price === 'string'
          ? product.default_price
          : product.default_price?.id
    }));
  }

  async getPrices(): Promise<Price[]> {
    const prices = await this.stripe.prices.list({
      expand: ['data.product'],
      active: true,
      type: 'recurring'
    });

    return prices.data.map((price) => ({
      id: price.id,
      productId:
        typeof price.product === 'string' ? price.product : price.product.id,
      unitAmount: price.unit_amount || 0,
      currency: price.currency,
      interval: price.recurring?.interval,
      trialPeriodDays: price.recurring?.trial_period_days
    }));
  }

  verifyWebhookSignature(payload: string, signature: string, secret: string): boolean {
    try {
      this.stripe.webhooks.constructEvent(payload, signature, secret);
      return true;
    } catch (err) {
      console.error('Webhook signature verification failed.', err);
      return false;
    }
  }

  getProviderName(): string {
    return 'stripe';
  }
}
