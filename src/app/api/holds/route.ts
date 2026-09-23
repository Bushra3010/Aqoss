import { NextRequest } from 'next/server';
import { randomUUID } from 'node:crypto';
import { cookies } from 'next/headers';
import { ok, handler, AppError } from '@/lib/api';
import { enforceRateLimit, clientKey } from '@/lib/rate-limit';
import { holdSchema } from '@/lib/validation/schemas';
import { createHold } from '@/services/availability.service';
import { getPublishedTenant } from '@/lib/tenant';
import { createAdminSupabase } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

const SESSION_COOKIE = 'aqoss_checkout_session';

/**
 * POST /api/holds — take a short-lived hold on a room (PRD §10).
 *
 * The hold is tied to a checkout session cookie so the customer's own hold does
 * not block their own booking a moment later.
 */
export async function POST(request: NextRequest) {
  return handler(async () => {
    enforceRateLimit(clientKey(request, 'hold'), { limit: 20, windowMs: 60_000 });

    const input = holdSchema.parse(await request.json());

    const tenant = await getPublishedTenant();
    if (!tenant) throw new AppError('Unable to identify the hotel for this request.', 400);

    // The room must belong to this website's hotel.
    const { data: roomType } = await createAdminSupabase()
      .from('room_types')
      .select('id')
      .eq('id', input.room_type_id)
      .eq('hotel_id', tenant.hotelId)
      .maybeSingle();

    if (!roomType) throw new AppError('Room no longer available.', 404);

    const store = cookies();
    const sessionId = store.get(SESSION_COOKIE)?.value ?? randomUUID();

    const hold = await createHold({
      roomTypeId: input.room_type_id,
      checkIn: input.check_in,
      checkOut: input.check_out,
      rooms: input.rooms,
      sessionId,
    });

    const response = ok({
      hold_id: hold.id,
      expires_at: hold.expires_at,
      rooms: hold.rooms,
    });

    response.cookies.set(SESSION_COOKIE, sessionId, {
      httpOnly: true,
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60,
    });

    return response;
  });
}
