import { eq } from 'drizzle-orm';
import { db } from '@/lib/db/drizzle';
import { users, teams, teamMembers } from '@/lib/db/schema';
import { setSession } from '@/lib/auth/session';
import { NextRequest, NextResponse } from 'next/server';
import { PaymentProviderFactory } from '@/lib/payments/providers/payment-provider.factory';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const subscriptionId = searchParams.get('subscription_id');
  const baToken = searchParams.get('ba_token');
  const token = searchParams.get('token');

  // PayPal可能返回不同的参数，我们优先使用subscription_id
  const paypalSubscriptionId = subscriptionId || token;

  if (!paypalSubscriptionId) {
    return NextResponse.redirect(new URL('/pricing', request.url));
  }

  try {
    const provider = PaymentProviderFactory.getProvider('paypal');
    
    // 获取订阅详情
    const subscription = await getPayPalSubscriptionDetails(paypalSubscriptionId);
    
    if (!subscription.plan_id) {
      throw new Error('No plan found for this subscription.');
    }

    const userId = subscription.custom_id;
    if (!userId) {
      throw new Error("No user ID found in subscription's custom_id.");
    }

    const user = await db
      .select()
      .from(users)
      .where(eq(users.id, Number(userId)))
      .limit(1);

    if (user.length === 0) {
      throw new Error('User not found in database.');
    }

    const userTeam = await db
      .select({
        teamId: teamMembers.teamId,
      })
      .from(teamMembers)
      .where(eq(teamMembers.userId, user[0].id))
      .limit(1);

    if (userTeam.length === 0) {
      throw new Error('User is not associated with any team.');
    }

    // 获取计划详情
    const plan = await getPayPalPlanDetails(subscription.plan_id);
    const productId = plan.product_id;

    if (!productId) {
      throw new Error('No product ID found for this subscription.');
    }

    await db
      .update(teams)
      .set({
        paypalCustomerId: subscription.subscriber?.email_address || subscription.id,
        paypalSubscriptionId: subscription.id,
        paypalProductId: productId,
        planName: plan.name,
        subscriptionStatus: subscription.status.toLowerCase(),
        updatedAt: new Date(),
      })
      .where(eq(teams.id, userTeam[0].teamId));

    await setSession(user[0]);
    return NextResponse.redirect(new URL('/dashboard', request.url));
  } catch (error) {
    console.error('Error handling PayPal checkout success:', error);
    return NextResponse.redirect(new URL('/error', request.url));
  }
}

async function getPayPalSubscriptionDetails(subscriptionId: string) {
  const provider = PaymentProviderFactory.getProvider('paypal');
  const baseUrl = process.env.NODE_ENV === 'production' 
    ? 'https://api-m.paypal.com' 
    : 'https://api-m.sandbox.paypal.com';
  
  const accessToken = await (provider as any).getAccessToken();
  
  const response = await fetch(`${baseUrl}/v1/billing/subscriptions/${subscriptionId}`, {
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    }
  });

  if (!response.ok) {
    throw new Error(`Failed to get PayPal subscription details: ${response.statusText}`);
  }

  return await response.json();
}

async function getPayPalPlanDetails(planId: string) {
  const provider = PaymentProviderFactory.getProvider('paypal');
  const baseUrl = process.env.NODE_ENV === 'production' 
    ? 'https://api-m.paypal.com' 
    : 'https://api-m.sandbox.paypal.com';
  
  const accessToken = await (provider as any).getAccessToken();
  
  const response = await fetch(`${baseUrl}/v1/billing/plans/${planId}`, {
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    }
  });

  if (!response.ok) {
    throw new Error(`Failed to get PayPal plan details: ${response.statusText}`);
  }

  return await response.json();
}
