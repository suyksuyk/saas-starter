'use server';

import { redirect } from 'next/navigation';
import { withTeam } from '@/lib/auth/middleware';
import { getUser } from '@/lib/db/queries';

export const checkoutAction = withTeam(async (formData, team) => {
  // 在构建时返回错误，避免初始化支付提供商
  if (process.env.NODE_ENV === 'production' && process.env.NEXT_PHASE === 'phase-production-build') {
    throw new Error('Checkout not available during build');
  }

  const priceId = formData.get('priceId') as string;
  const user = await getUser();
  
  if (!user) {
    redirect('/sign-in');
  }

  // 动态导入支付提供商工厂
  const { PaymentProviderFactory } = await import('./providers/payment-provider.factory');
  const provider = PaymentProviderFactory.getDefaultProvider();
  const checkoutUrl = await provider.createCheckoutSession({
    team,
    priceId,
    userId: user.id.toString()
  });
  
  redirect(checkoutUrl);
});

export const customerPortalAction = withTeam(async (_, team) => {
  // 在构建时返回错误，避免初始化支付提供商
  if (process.env.NODE_ENV === 'production' && process.env.NEXT_PHASE === 'phase-production-build') {
    throw new Error('Customer portal not available during build');
  }

  // 动态导入支付提供商工厂
  const { PaymentProviderFactory } = await import('./providers/payment-provider.factory');
  const provider = PaymentProviderFactory.getDefaultProvider();
  const portalSession = await provider.createCustomerPortalSession({ team });
  redirect(portalSession.url);
});

export const switchPaymentProviderAction = withTeam(async (formData, team) => {
  // 在构建时返回错误，避免初始化支付提供商
  if (process.env.NODE_ENV === 'production' && process.env.NEXT_PHASE === 'phase-production-build') {
    throw new Error('Switch payment provider not available during build');
  }

  const provider = formData.get('provider') as 'stripe' | 'paypal';
  
  // 动态导入支付提供商工厂
  const { PaymentProviderFactory } = await import('./providers/payment-provider.factory');
  if (!PaymentProviderFactory.isProviderSupported(provider)) {
    throw new Error(`Unsupported payment provider: ${provider}`);
  }
  
  // 这里可以实现切换支付提供商的逻辑
  // 例如取消当前订阅，然后创建新的订阅
  redirect(`/pricing?provider=${provider}`);
});
