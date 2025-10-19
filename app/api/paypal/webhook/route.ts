import { NextRequest, NextResponse } from 'next/server';
import { PaymentProviderFactory } from '@/lib/payments/providers/payment-provider.factory';

const webhookSecret = process.env.PAYPAL_WEBHOOK_SECRET!;

export async function POST(request: NextRequest) {
  const payload = await request.text();
  const headers = Object.fromEntries(request.headers.entries());

  try {
    const provider = PaymentProviderFactory.getProvider('paypal');
    
    // 验证webhook签名
    const isValid = provider.verifyWebhookSignature(payload, headers, webhookSecret);
    
    if (!isValid) {
      console.error('PayPal webhook signature verification failed.');
      return NextResponse.json(
        { error: 'Webhook signature verification failed.' },
        { status: 400 }
      );
    }

    // 解析webhook事件
    const event = JSON.parse(payload);
    
    await provider.handleWebhook({
      type: event.event_type,
      data: event.resource
    });

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Error processing PayPal webhook:', error);
    return NextResponse.json(
      { error: 'Webhook processing failed.' },
      { status: 500 }
    );
  }
}
