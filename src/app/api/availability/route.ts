import { NextRequest } from 'next/server';
import { ok, handler, AppError } from '@/lib/api';
import { enforceRateLimit, clientKey } from '@/lib/rate-limit';
import { availabilitySchema } from '@/lib/validation/schemas';
import { searchAvailability } from '@/services/availability.service';
import { getPublishedTenant } from '@/lib/tenant';

export const dynamic = 'force-dynamic';

/**
 * GET /api/availability — PRD §40.
 *
 * The hotel is taken from the request's website unless an explicit hotel_id is
 * supplied, so a customer on hotel-a.com can never search hotel B's inventory
 * by tampering with the query string.
 */
export async function GET(request: NextRequest) {
  return handler(async () => {
    enforceRateLimit(clientKey(request, 'availability'), { limit: 60, windowMs: 60_000 });

    const params = Object.fromEntries(request.nextUrl.searchParams);
    const input = availabilitySchema.parse(params);

    const tenant = await getPublishedTenant();
    const hotelId = tenant?.hotelId ?? input.hotel_id;

    if (!hotelId) {
      throw new AppError('Unable to identify the hotel for this request.', 400);
    }
    if (tenant && input.hotel_id && input.hotel_id !== tenant.hotelId) {
      throw new AppError('Unable to identify the hotel for this request.', 400);
    }

    const rooms = await searchAvailability({
      hotelId,
      checkIn: input.check_in,
      checkOut: input.check_out,
      adults: input.adults,
      children: input.children,
      rooms: input.rooms,
    });

    return ok({
      hotel_id: hotelId,
      check_in: input.check_in,
      check_out: input.check_out,
      nights: rooms[0]?.nights ?? 0,
      rooms,
    });
  });
}
