import { createHmac, timingSafeEqual } from 'node:crypto';
import type { PaymentAdapter, PaymentOrder, PaymentVerification, RefundResult } from './types';

/**
 * Razorpay adapter (PRD §27).
 *
 * Signature verification follows Razorpay's documented scheme:
 *   HMAC-SHA256(order_id + "|" + payment_id, key_secret) === razorpay_signature
 *
 * Set RAZORPAY_KEY_ID / RAZORPAY_KEY_SECRET / RAZORPAY_WEBHOOK_SECRET and
 * PAYMENT_PROVIDER=razorpay to switch the platform over.
 */
export class RazorpayAdapter implements PaymentAdapter {
  readonly name = 'razorpay';

  private keyId = process.env.RAZORPAY_KEY_ID ?? '';
  private keySecret = process.env.RAZORPAY_KEY_SECRET ?? '';
  private webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET ?? '';

  private assertConfigured() {
    if (!this.keyId || !this.keySecret) {
      throw new Error('Razorpay is not configured: set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET.');
    }
  }

  private auth() {
    return `Basic ${Buffer.from(`${this.keyId}:${this.keySecret}`).toString('base64')}`;
  }

  async createOrder(input: {
    bookingId: string;
    reference: string;
    amount: number;
    currency: string;
  }): Promise<PaymentOrder> {
    this.assertConfigured();

    const response = await fetch('https://api.razorpay.com/v1/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: this.auth() },
      body: JSON.stringify({
        // Razorpay works in the smallest currency unit (paise for INR).
        amount: Math.round(input.amount * 100),
        currency: input.currency,
        receipt: input.reference,
        notes: { booking_id: input.bookingId },
      }),
    });

    if (!response.ok) {
      throw new Error(`Razorpay order failed: ${response.status} ${await response.text()}`);
    }

    const order = (await response.json()) as { id: string; amount: number; currency: string };

    return {
      orderId: order.id,
      amount: order.amount / 100,
      currency: order.currency,
      provider: this.name,
      publicKey: this.keyId,
    };
  }

  async verifyPayment(payload: Record<string, unknown>): Promise<PaymentVerification> {
    this.assertConfigured();

    const orderId = String(payload.razorpay_order_id ?? payload.order_id ?? '');
    const paymentId = String(payload.razorpay_payment_id ?? payload.payment_id ?? '');
    const signature = String(payload.razorpay_signature ?? payload.signature ?? '');

    const expected = createHmac('sha256', this.keySecret)
      .update(`${orderId}|${paymentId}`)
      .digest('hex');

    if (!safeEqual(expected, signature)) {
      return {
        verified: false,
        providerPaymentId: null,
        amount: 0,
        failureReason: 'Signature mismatch',
        raw: payload,
      };
    }

    // Signature is valid — now read the authoritative amount from Razorpay
    // rather than trusting whatever the browser posted.
    const response = await fetch(`https://api.razorpay.com/v1/payments/${paymentId}`, {
      headers: { Authorization: this.auth() },
    });

    if (!response.ok) {
      return {
        verified: false,
        providerPaymentId: null,
        amount: 0,
        failureReason: 'Could not confirm payment with Razorpay',
        raw: payload,
      };
    }

    const payment = (await response.json()) as {
      amount: number;
      status: string;
      method?: string;
      error_description?: string;
    };

    const captured = payment.status === 'captured' || payment.status === 'authorized';

    return {
      verified: captured,
      providerPaymentId: captured ? paymentId : null,
      amount: payment.amount / 100,
      method: payment.method ?? null,
      failureReason: captured ? null : (payment.error_description ?? payment.status),
      raw: payment as unknown as Record<string, unknown>,
    };
  }

  async verifyWebhook(input: { rawBody: string; signature: string | null }) {
    if (!this.webhookSecret) {
      throw new Error('RAZORPAY_WEBHOOK_SECRET is not set.');
    }

    const expected = createHmac('sha256', this.webhookSecret).update(input.rawBody).digest('hex');
    const verified = safeEqual(expected, input.signature ?? '');
    const parsed = verified ? JSON.parse(input.rawBody) : {};

    return {
      verified,
      event: parsed.event ?? 'unknown',
      data: parsed.payload ?? {},
    };
  }

  async refund(input: {
    providerPaymentId: string;
    amount: number;
    reason?: string;
  }): Promise<RefundResult> {
    this.assertConfigured();

    const response = await fetch(
      `https://api.razorpay.com/v1/payments/${input.providerPaymentId}/refund`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: this.auth() },
        body: JSON.stringify({
          amount: Math.round(input.amount * 100),
          notes: { reason: input.reason ?? 'Customer cancellation' },
        }),
      },
    );

    if (!response.ok) {
      throw new Error(`Razorpay refund failed: ${response.status} ${await response.text()}`);
    }

    const refund = (await response.json()) as { id: string; amount: number; status: string };

    return {
      refundId: refund.id,
      amount: refund.amount / 100,
      status: refund.status === 'processed' ? 'REFUNDED' : 'PENDING',
      raw: refund as unknown as Record<string, unknown>,
    };
  }
}

function safeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a, 'utf8');
  const bufB = Buffer.from(b, 'utf8');
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}
