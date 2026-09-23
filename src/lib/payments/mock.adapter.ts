import { createHmac, randomUUID, timingSafeEqual } from 'node:crypto';
import type { PaymentAdapter, PaymentOrder, PaymentVerification, RefundResult } from './types';

/**
 * Development gateway.
 *
 * It behaves like a real one — it issues an order, signs it, and refuses a
 * payment whose signature does not match — so the verification path used in
 * production is exercised locally too. It never moves money.
 */
export class MockPaymentAdapter implements PaymentAdapter {
  readonly name = 'mock';

  private secret =
    process.env.MOCK_PAYMENT_SECRET ?? 'aqoss-development-signing-secret-change-me';

  private sign(orderId: string, paymentId: string): string {
    return createHmac('sha256', this.secret).update(`${orderId}|${paymentId}`).digest('hex');
  }

  async createOrder(input: {
    bookingId: string;
    reference: string;
    amount: number;
    currency: string;
  }): Promise<PaymentOrder> {
    return {
      orderId: `mock_order_${input.reference}_${randomUUID().slice(0, 8)}`,
      amount: input.amount,
      currency: input.currency,
      provider: this.name,
      publicKey: 'mock_public_key',
    };
  }

  async verifyPayment(payload: Record<string, unknown>): Promise<PaymentVerification> {
    const orderId = String(payload.order_id ?? '');
    const paymentId = String(payload.payment_id ?? '');
    const signature = String(payload.signature ?? '');
    const amount = Number(payload.amount ?? 0);

    const expected = this.sign(orderId, paymentId);
    const verified = safeEqual(expected, signature);

    return {
      verified,
      providerPaymentId: verified ? paymentId : null,
      amount,
      method: 'mock',
      failureReason: verified ? null : 'Signature mismatch',
      raw: payload,
    };
  }

  async verifyWebhook(input: { rawBody: string; signature: string | null }) {
    const expected = createHmac('sha256', this.secret).update(input.rawBody).digest('hex');
    const verified = safeEqual(expected, input.signature ?? '');
    const parsed = verified ? JSON.parse(input.rawBody) : {};
    return { verified, event: parsed.event ?? 'unknown', data: parsed.data ?? {} };
  }

  async refund(input: { providerPaymentId: string; amount: number }): Promise<RefundResult> {
    return {
      refundId: `mock_refund_${randomUUID().slice(0, 8)}`,
      amount: input.amount,
      status: 'REFUNDED',
      raw: { provider_payment_id: input.providerPaymentId },
    };
  }

  /** Test helper: produces the signature a fake checkout would return. */
  signForTest(orderId: string, paymentId: string) {
    return this.sign(orderId, paymentId);
  }
}

function safeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a, 'utf8');
  const bufB = Buffer.from(b, 'utf8');
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}
