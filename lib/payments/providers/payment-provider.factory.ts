import { PaymentProvider } from './payment-provider.interface';
import { StripeProvider } from './stripe.provider';
import { PayPalProvider } from './paypal.provider';

export type PaymentProviderType = 'stripe' | 'paypal';

/**
 * 支付提供商工厂类
 * 负责创建和管理不同的支付提供商实例
 */
export class PaymentProviderFactory {
  private static instances: Map<PaymentProviderType, PaymentProvider> = new Map();

  /**
   * 获取支付提供商实例
   * @param provider 支付提供商类型
   * @returns 支付提供商实例
   */
  static getProvider(provider: PaymentProviderType = 'stripe'): PaymentProvider {
    // 如果实例已存在，直接返回
    if (this.instances.has(provider)) {
      return this.instances.get(provider)!;
    }

    // 创建新实例
    let providerInstance: PaymentProvider;

    switch (provider) {
      case 'stripe':
        providerInstance = new StripeProvider();
        break;
      case 'paypal':
        providerInstance = new PayPalProvider();
        break;
      default:
        throw new Error(`Unsupported payment provider: ${provider}`);
    }

    // 缓存实例
    this.instances.set(provider, providerInstance);
    return providerInstance;
  }

  /**
   * 获取当前默认支付提供商
   * @returns 默认支付提供商实例
   */
  static getDefaultProvider(): PaymentProvider {
    const defaultProvider = (process.env.DEFAULT_PAYMENT_PROVIDER as PaymentProviderType) || 'stripe';
    return this.getProvider(defaultProvider);
  }

  /**
   * 清除所有缓存的实例
   */
  static clearInstances(): void {
    this.instances.clear();
  }

  /**
   * 获取所有支持的支付提供商类型
   * @returns 支持的支付提供商类型数组
   */
  static getSupportedProviders(): PaymentProviderType[] {
    return ['stripe', 'paypal'];
  }

  /**
   * 检查支付提供商是否受支持
   * @param provider 支付提供商类型
   * @returns 是否支持
   */
  static isProviderSupported(provider: string): provider is PaymentProviderType {
    return this.getSupportedProviders().includes(provider as PaymentProviderType);
  }
}
