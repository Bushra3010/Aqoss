import { NextRequest } from 'next/server';
import { z } from 'zod';
import { ok, handler } from '@/lib/api';
import { enforceRateLimit, clientKey } from '@/lib/rate-limit';
import { verifyAndConfirm } from '@/services/payment.service';

export const dynamic = 'force-dynamic';

const schema = z.object({
  payment_id: z.string().uuid(),
  /** Whatever the gateway's checkout handed back — verified server-side. */
  payload: z.record(z.unknown()),
});

/**
 * POST /api/payments/verify — PRD §27, §41.
 *
 * The signature is checked and the amount re-read from the gateway before the
 * booking is confirmed. A forged or under-paid callback is rejected here.
 */
export async function POST(request: NextRequest) {
  return handler(async () => {
    enforceRateLimit(clientKey(request, 'pay-verify'), { limit: 20, windowMs: 60_000 });

    const input = schema.parse(await request.json());
    const booking = await verifyAndConfirm({
      paymentId: input.payment_id,
      payload: input.payload,
    });

    return ok({
      booking_id: booking.id,
      reference: booking.reference,
      status: booking.status,
      payment_status: booking.payment_status,
    });
  });
}
