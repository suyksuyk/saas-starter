import { checkoutAction } from '@/lib/payments/actions';
import { Check } from 'lucide-react';
import { getPrices, getProducts, getCurrentProvider } from '@/lib/payments';
import { SubmitButton } from './submit-button';
import { Product, Price } from '@/lib/payments/providers/payment-provider.interface';

// Prices are fresh for one hour max
export const revalidate = 3600;

// Fallback data for build time
const fallbackProducts: Product[] = [
  { id: 'base-fallback', name: 'Base' },
  { id: 'plus-fallback', name: 'Plus' }
];

const fallbackPrices: Price[] = [
  { id: 'price-base-fallback', productId: 'base-fallback', unitAmount: 800, currency: 'usd', interval: 'month', trialPeriodDays: 7 },
  { id: 'price-plus-fallback', productId: 'plus-fallback', unitAmount: 1200, currency: 'usd', interval: 'month', trialPeriodDays: 7 }
];

export default async function PricingPage() {
  let prices = fallbackPrices;
  let products = fallbackProducts;

  try {
    // Only try to fetch real data at runtime, not build time
    if (process.env.NODE_ENV === 'production' && process.env.NEXT_PHASE !== 'phase-production-build') {
      const [realPrices, realProducts] = await Promise.all([
        getPrices(),
        getProducts(),
      ]);
      prices = realPrices;
      products = realProducts;
    }
  } catch (error) {
    console.warn('Failed to fetch pricing data, using fallback:', error);
    // Use fallback data if API calls fail
  }

  const basePlan = products.find((product) => product.name === 'Base');
  const plusPlan = products.find((product) => product.name === 'Plus');

  const basePrice = prices.find((price) => price.productId === basePlan?.id);
  const plusPrice = prices.find((price) => price.productId === plusPlan?.id);

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="grid md:grid-cols-2 gap-8 max-w-xl mx-auto">
        <PricingCard
          name={basePlan?.name || 'Base'}
          price={basePrice?.unitAmount || 800}
          interval={basePrice?.interval || 'month'}
          trialDays={basePrice?.trialPeriodDays || 7}
          features={[
            'Unlimited Usage',
            'Unlimited Workspace Members',
            'Email Support',
          ]}
          priceId={basePrice?.id}
        />
        <PricingCard
          name={plusPlan?.name || 'Plus'}
          price={plusPrice?.unitAmount || 1200}
          interval={plusPrice?.interval || 'month'}
          trialDays={plusPrice?.trialPeriodDays || 7}
          features={[
            'Everything in Base, and:',
            'Early Access to New Features',
            '24/7 Support + Slack Access',
          ]}
          priceId={plusPrice?.id}
        />
      </div>
    </main>
  );
}

function PricingCard({
  name,
  price,
  interval,
  trialDays,
  features,
  priceId,
}: {
  name: string;
  price: number;
  interval: string;
  trialDays: number;
  features: string[];
  priceId?: string;
}) {
  return (
    <div className="pt-6">
      <h2 className="text-2xl font-medium text-gray-900 mb-2">{name}</h2>
      <p className="text-sm text-gray-600 mb-4">
        with {trialDays} day free trial
      </p>
      <p className="text-4xl font-medium text-gray-900 mb-6">
        ${price / 100}{' '}
        <span className="text-xl font-normal text-gray-600">
          per user / {interval}
        </span>
      </p>
      <ul className="space-y-4 mb-8">
        {features.map((feature, index) => (
          <li key={index} className="flex items-start">
            <Check className="h-5 w-5 text-orange-500 mr-2 mt-0.5 flex-shrink-0" />
            <span className="text-gray-700">{feature}</span>
          </li>
        ))}
      </ul>
      <form action={checkoutAction}>
        <input type="hidden" name="priceId" value={priceId} />
        <SubmitButton />
      </form>
    </div>
  );
}
