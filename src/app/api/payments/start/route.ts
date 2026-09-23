import { NextRequest } from 'next/server';
import { z } from 'zod';
import { ok, handler } from '@/lib/api';
import { enforceRateLimit, clientKey } from '@/lib/rate-limit';
import { startPayment } from '@/services/payment.service';

export const dynamic = 'force-dynamic';

const schema = z.object({ booking_id: z.string().uuid() });

/** POST /api/payments/start — create the gateway order for a booking. */
export async function POST(request: NextRequest) {
  return handler(async () => {
    enforceRateLimit(clientKey(request, 'pay-start'), { limit: 20, windowMs: 60_000 });

    const { booking_id } = schema.parse(await request.json());
    const result = await startPayment(booking_id);

    return ok(result);
  });
}
