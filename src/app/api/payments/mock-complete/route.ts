import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { ok, handler, AppError } from '@/lib/api';
import { env } from '@/lib/env';
import { MockPaymentAdapter } from '@/lib/payments/mock.adapter';
import { verifyAndConfirm } from '@/services/payment.service';

export const dynamic = 'force-dynamic';

const schema = z.object({
  payment_id: z.string().uuid(),
  order_id: z.string(),
  amount: z.coerce.number().min(0),
  /** Set true to simulate a customer whose card is declined. */
  fail: z.boolean().optional(),
});

/**
 * POST /api/payments/mock-complete — stands in for the gateway's checkout.
 *
 * Only reachable while PAYMENT_PROVIDER=mock. It signs a fake payment exactly
 * the way the provider would, so the real verification path (signature check,
 * amount check, confirmation) is what actually runs in development too.
 */
export async function POST(request: NextRequest) {
  if (env.paymentProvider !== 'mock') {
    return NextResponse.json({ ok: false, error: 'Not found' }, { status: 404 });
  }

  return handler(async () => {
    const input = schema.parse(await request.json());
    const adapter = new MockPaymentAdapter();

    const providerPaymentId = `mock_pay_${Date.now()}`;
    const signature = input.fail
      ? 'deliberately-invalid-signature'
      : adapter.signForTest(input.order_id, providerPaymentId);

    try {
      const booking = await verifyAndConfirm({
        paymentId: input.payment_id,
        payload: {
          order_id: input.order_id,
          payment_id: providerPaymentId,
          signature,
          amount: input.amount,
        },
      });

      return ok({
        booking_id: booking.id,
        reference: booking.reference,
        status: booking.status,
        payment_status: booking.payment_status,
      });
    } catch (err) {
      if (err instanceof AppError) throw err;
      throw err;
    }
  });
}
