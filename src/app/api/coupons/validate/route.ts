import { NextRequest } from 'next/server';
import { ok, handler, AppError } from '@/lib/api';
import { enforceRateLimit, clientKey } from '@/lib/rate-limit';
import { couponSchema } from '@/lib/validation/schemas';
import { validateCoupon } from '@/services/pricing.service';
import { getPublishedTenant } from '@/lib/tenant';
import { getUser } from '@/lib/auth/session';

export const dynamic = 'force-dynamic';

/** POST /api/coupons/validate — PRD §30. Rate limited to deter code guessing. */
export async function POST(request: NextRequest) {
  return handler(async () => {
    enforceRateLimit(clientKey(request, 'coupon'), { limit: 10, windowMs: 60_000 });

    const body = await request.json();
    const tenant = await getPublishedTenant();
    const input = couponSchema.parse({ ...body, hotel_id: tenant?.hotelId ?? body.hotel_id });

    if (tenant && input.hotel_id !== tenant.hotelId) {
      throw new AppError('This coupon is not valid for this hotel', 422);
    }

    const user = await getUser();
    const result = await validateCoupon({
      code: input.code,
      hotelId: input.hotel_id,
      amount: input.amount,
      customerId: user?.id ?? null,
      roomTypeIds: input.room_type_ids,
    });

    return ok(result);
  });
}
