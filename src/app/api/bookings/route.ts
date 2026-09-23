import { NextRequest } from 'next/server';
import { ok, handler, AppError } from '@/lib/api';
import { enforceRateLimit, clientKey } from '@/lib/rate-limit';
import { createBookingSchema } from '@/lib/validation/schemas';
import { createBooking } from '@/services/booking.service';
import { getPublishedTenant } from '@/lib/tenant';
import { getUser } from '@/lib/auth/session';
import { createAdminSupabase } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

/**
 * POST /api/bookings — PRD §41.
 *
 * Creates a PENDING booking with inventory already consumed, then returns it so
 * the client can start payment. Pricing is recomputed server-side inside
 * `createBooking`; anything the browser sent about money is ignored.
 */
export async function POST(request: NextRequest) {
  return handler(async () => {
    enforceRateLimit(clientKey(request, 'booking'), { limit: 10, windowMs: 60_000 });

    const input = createBookingSchema.parse(await request.json());

    const tenant = await getPublishedTenant();
    const hotelId = tenant?.hotelId ?? input.hotel_id;

    if (tenant && input.hotel_id !== tenant.hotelId) {
      throw new AppError('Unable to identify the hotel for this request.', 400);
    }

    const user = await getUser();

    const { booking, breakdown } = await createBooking(
      {
        hotelId,
        websiteId: tenant?.websiteId ?? input.website_id ?? null,
        checkIn: input.check_in,
        checkOut: input.check_out,
        rooms: input.rooms,
        guest: input.guest,
        guests: input.guests,
        transport: input.transport,
        couponCode: input.coupon_code,
        holdIds: input.hold_ids,
        source: input.source,
      },
      user?.id ?? null,
    );

    return ok(
      {
        booking_id: booking.id,
        reference: booking.reference,
        status: booking.status,
        payment_status: booking.payment_status,
        total_amount: Number(booking.total_amount),
        currency: booking.currency,
        breakdown,
      },
      { status: 201 },
    );
  });
}

/** GET /api/bookings — the signed-in customer's own bookings (PRD §12). */
export async function GET(request: NextRequest) {
  return handler(async () => {
    const user = await getUser();
    if (!user) throw new AppError('Please sign in to continue.', 401);

    const status = request.nextUrl.searchParams.get('status');

    let query = createAdminSupabase()
      .from('bookings')
      .select(
        'id, reference, check_in, check_out, nights, status, payment_status, total_amount, amount_paid, currency, created_at, hotels!inner (name, city, slug)',
      )
      .eq('customer_id', user.id)
      .order('check_in', { ascending: false });

    if (status) query = query.eq('status', status);

    const { data, error } = await query;
    if (error) throw error;

    return ok({ bookings: data ?? [] });
  });
}
