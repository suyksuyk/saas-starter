'use server';

import { redirect } from 'next/navigation';
import { PaymentProviderFactory } from './providers/payment-provider.factory';
import { withTeam } from '@/lib/auth/middleware';
import { getUser } from '@/lib/db/queries';

export const checkoutAction = withTeam(async (formData, team) => {
  const priceId = formData.get('priceId') as string;
  const user = await getUser();
  
  if (!user) {
    redirect('/sign-in');
  }

  const provider = PaymentProviderFactory.getDefaultProvider();
  const checkoutUrl = await provider.createCheckoutSession({
    team,
    priceId,
    userId: user.id.toString()
  });
  
  redirect(checkoutUrl);
});

export const customerPortalAction = withTeam(async (_, team) => {
  const provider = PaymentProviderFactory.getDefaultProvider();
  const portalSession = await provider.createCustomerPortalSession({ team });
  redirect(portalSession.url);
});

export const switchPaymentProviderAction = withTeam(async (formData, team) => {
  const provider = formData.get('provider') as 'stripe' | 'paypal';
  
  if (!PaymentProviderFactory.isProviderSupported(provider)) {
    throw new Error(`Unsupported payment provider: ${provider}`);
  }
  
  // 这里可以实现切换支付提供商的逻辑
  // 例如取消当前订阅，然后创建新的订阅
  redirect(`/pricing?provider=${provider}`);
});
