import { NextRequest } from 'next/server';
import { z } from 'zod';
import { ok, handler, AppError } from '@/lib/api';
import { enforceRateLimit, clientKey } from '@/lib/rate-limit';
import { bookingRoomSchema, isoDate, transportSelectionSchema } from '@/lib/validation/schemas';
import { quoteBooking } from '@/services/pricing.service';
import { getPublishedTenant } from '@/lib/tenant';
import { getUser } from '@/lib/auth/session';

export const dynamic = 'force-dynamic';

const quoteSchema = z.object({
  check_in: isoDate,
  check_out: isoDate,
  rooms: z.array(bookingRoomSchema).min(1),
  transport: z.array(transportSelectionSchema).max(5).optional(),
  coupon_code: z.string().trim().max(40).nullish(),
});

/**
 * POST /api/pricing/quote — PRD §15.
 *
 * Returns the same breakdown the booking API will use, so the price summary the
 * customer sees is the price that gets charged.
 */
export async function POST(request: NextRequest) {
  return handler(async () => {
    enforceRateLimit(clientKey(request, 'quote'), { limit: 40, windowMs: 60_000 });

    const input = quoteSchema.parse(await request.json());
    const tenant = await getPublishedTenant();
    if (!tenant) throw new AppError('Unable to identify the hotel for this request.', 400);

    const user = await getUser();

    const { breakdown, coupon } = await quoteBooking({
      hotelId: tenant.hotelId,
      checkIn: input.check_in,
      checkOut: input.check_out,
      rooms: input.rooms,
      transport: input.transport,
      couponCode: input.coupon_code,
      customerId: user?.id ?? null,
    });

    return ok({ breakdown, coupon });
  });
}
