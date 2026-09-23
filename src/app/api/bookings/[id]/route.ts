import { NextRequest } from 'next/server';
import { ok, handler, AppError } from '@/lib/api';
import { getBookingDetail } from '@/services/booking.service';
import { getUser, getAdminSession, can } from '@/lib/auth/session';

export const dynamic = 'force-dynamic';

/**
 * GET /api/bookings/:id
 * A customer sees only their own booking; staff need `bookings.read`.
 */
export async function GET(_request: NextRequest, { params }: { params: { id: string } }) {
  return handler(async () => {
    const booking = await getBookingDetail(params.id);
    if (!booking) throw new AppError('Booking not found.', 404);

    const user = await getUser();
    /* eslint-disable @typescript-eslint/no-explicit-any */
    const isOwner = user && (booking as any).customer_id === user.id;

    if (!isOwner) {
      const session = await getAdminSession();
      if (!can(session, 'bookings.read')) {
        throw new AppError('Booking not found.', 404);
      }
    }

    return ok({ booking });
  });
}
