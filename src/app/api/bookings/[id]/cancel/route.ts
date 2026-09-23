import { NextRequest } from 'next/server';
import { z } from 'zod';
import { ok, handler, AppError } from '@/lib/api';
import { cancelBooking, getBookingDetail } from '@/services/booking.service';
import { getUser, getAdminSession, can } from '@/lib/auth/session';

export const dynamic = 'force-dynamic';

const schema = z.object({ reason: z.string().trim().max(500).optional() });

/**
 * POST /api/bookings/:id/cancel — PRD §26.
 * A customer may cancel their own upcoming booking; staff need bookings.cancel.
 */
export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  return handler(async () => {
    const { reason } = schema.parse(await request.json().catch(() => ({})));

    const booking = await getBookingDetail(params.id);
    if (!booking) throw new AppError('Booking not found.', 404);

    const user = await getUser();
    /* eslint-disable @typescript-eslint/no-explicit-any */
    const b = booking as any;
    const isOwner = user && b.customer_id === user.id;

    let actorId = user?.id ?? null;

    if (!isOwner) {
      const session = await getAdminSession();
      if (!can(session, 'bookings.cancel')) {
        throw new AppError('You do not have access to this action.', 403);
      }
      actorId = session!.userId;
    } else if (['CHECKED_IN', 'CHECKED_OUT'].includes(b.status)) {
      throw new AppError('Please contact the property to change a stay in progress.', 409);
    }

    const updated = await cancelBooking({ bookingId: params.id, reason, actorId });

    return ok({ booking_id: updated.id, status: updated.status });
  });
}
