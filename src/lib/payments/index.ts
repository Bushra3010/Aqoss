import 'server-only';

import { env } from '@/lib/env';
import { MockPaymentAdapter } from './mock.adapter';
import { RazorpayAdapter } from './razorpay.adapter';
import type { PaymentAdapter } from './types';

export * from './types';

let adapter: PaymentAdapter | null = null;

/** The configured gateway. Set PAYMENT_PROVIDER to switch. */
export function getPaymentAdapter(): PaymentAdapter {
  if (adapter) return adapter;

  switch (env.paymentProvider) {
    case 'razorpay':
      adapter = new RazorpayAdapter();
      break;
    case 'mock':
    default:
      adapter = new MockPaymentAdapter();
      break;
  }

  return adapter;
}
