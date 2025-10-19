import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  // 在构建时或未配置Stripe时返回错误
  if (process.env.NODE_ENV === 'production' && process.env.NEXT_PHASE === 'phase-production-build') {
    return NextResponse.json(
      { error: 'Stripe webhook not available during build' },
      { status: 503 }
    );
  }

  // 检查Stripe配置
  if (!process.env.STRIPE_SECRET_KEY || !process.env.STRIPE_WEBHOOK_SECRET) {
    return NextResponse.json(
      { error: 'Stripe not configured' },
      { status: 503 }
    );
  }

  // 动态导入Stripe相关代码
  try {
    const { default: Stripe } = await import('stripe');
    const { handleSubscriptionChange } = await import('@/lib/payments/stripe');
    
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
      apiVersion: '2025-04-30.basil',
    });
    
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;
    const payload = await request.text();
    const signature = request.headers.get('stripe-signature') as string;

    let event: any;

    try {
      event = stripe.webhooks.constructEvent(payload, signature, webhookSecret);
    } catch (err) {
      console.error('Webhook signature verification failed.', err);
      return NextResponse.json(
        { error: 'Webhook signature verification failed.' },
        { status: 400 }
      );
    }

    switch (event.type) {
      case 'customer.subscription.updated':
      case 'customer.subscription.deleted':
        const subscription = event.data.object;
        await handleSubscriptionChange(subscription);
        break;
      default:
        console.log(`Unhandled event type ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Stripe webhook error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
