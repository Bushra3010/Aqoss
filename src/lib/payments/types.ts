/**
 * Payment gateway abstraction (PRD §27).
 *
 * The PRD leaves the gateway to the client's final choice, so nothing above
 * this interface knows which provider is in use. Adding one means writing a
 * new adapter and registering it — no changes to the booking flow.
 */

export interface PaymentOrder {
  /** Provider-side order/intent identifier the browser needs. */
  orderId: string;
  amount: number;
  currency: string;
  /** Public key or client secret handed to the checkout widget. */
  publicKey?: string;
  clientSecret?: string;
  provider: string;
}

export interface PaymentVerification {
  verified: boolean;
  providerPaymentId: string | null;
  amount: number;
  method?: string | null;
  failureReason?: string | null;
  raw: Record<string, unknown>;
}

export interface RefundResult {
  refundId: string;
  amount: number;
  status: 'PENDING' | 'REFUNDED' | 'FAILED';
  raw: Record<string, unknown>;
}

export interface PaymentAdapter {
  readonly name: string;

  /** Create an order/intent for a booking that is awaiting payment. */
  createOrder(input: {
    bookingId: string;
    reference: string;
    amount: number;
    currency: string;
    customer: { name: string; email: string; phone: string };
  }): Promise<PaymentOrder>;

  /**
   * Verify a client-reported payment. MUST check the provider's signature —
   * a booking is never confirmed on the browser's say-so.
   */
  verifyPayment(payload: Record<string, unknown>): Promise<PaymentVerification>;

  /** Verify and parse an inbound webhook. */
  verifyWebhook(input: {
    rawBody: string;
    signature: string | null;
  }): Promise<{ verified: boolean; event: string; data: Record<string, unknown> }>;

  refund(input: {
    providerPaymentId: string;
    amount: number;
    reason?: string;
  }): Promise<RefundResult>;
}
