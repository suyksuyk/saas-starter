/**
 * 统一的支付服务入口
 * 提供所有支付相关功能的统一接口
 */

import { PaymentProviderFactory } from './providers/payment-provider.factory';
import { Product, Price } from './providers/payment-provider.interface';

/**
 * 获取当前默认支付提供商的产品列表
 */
export async function getProducts() {
  const provider = PaymentProviderFactory.getDefaultProvider();
  return provider.getProducts();
}

/**
 * 获取当前默认支付提供商的价格列表
 */
export async function getPrices() {
  const provider = PaymentProviderFactory.getDefaultProvider();
  return provider.getPrices();
}

/**
 * 获取指定支付提供商的产品列表
 */
export async function getProductsByProvider(providerName: 'stripe' | 'paypal') {
  const provider = PaymentProviderFactory.getProvider(providerName);
  return provider.getProducts();
}

/**
 * 获取指定支付提供商的价格列表
 */
export async function getPricesByProvider(providerName: 'stripe' | 'paypal') {
  const provider = PaymentProviderFactory.getProvider(providerName);
  return provider.getPrices();
}

/**
 * 获取所有支持的支付提供商
 */
export function getSupportedProviders() {
  return PaymentProviderFactory.getSupportedProviders();
}

/**
 * 获取当前默认支付提供商名称
 */
export function getCurrentProvider() {
  // 在构建环境中返回默认值，避免初始化支付提供商
  if (process.env.NODE_ENV === 'production' && process.env.NEXT_PHASE === 'phase-production-build') {
    return process.env.DEFAULT_PAYMENT_PROVIDER || 'stripe';
  }
  
  const provider = PaymentProviderFactory.getDefaultProvider();
  return provider.getProviderName();
}

/**
 * 检查支付提供商是否支持
 */
export function isProviderSupported(provider: string) {
  return PaymentProviderFactory.isProviderSupported(provider);
}

// 向后兼容的导出
export { 
  createCheckoutSession, 
  createCustomerPortalSession,
  getStripePrices,
  getStripeProducts 
} from './stripe';

// 导出类型
export type { Product, Price } from './providers/payment-provider.interface';
export type { PaymentProviderType } from './providers/payment-provider.factory';
