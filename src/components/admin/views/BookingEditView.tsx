import Link from 'next/link';
import { notFound } from 'next/navigation';
import { canAccessHotel, type AdminSession } from '@/lib/auth/session';
import { createAdminSupabase } from '@/lib/supabase/admin';
import { bookableRoomTypes } from '@/lib/admin/booking-options';
import { NoAccess, PageHeader } from '@/components/admin/shared';
import { ChangeStayForm, GuestDetailsForm } from '@/components/admin/BookingForms';
import { StatusBadge } from '@/components/ui';
import { formatCurrency, formatDate } from '@/lib/utils';

/**
 * Edit a booking: guest details always; dates, rooms and party size while it
 * is pending or confirmed. `hotelId` pins it to a hotel panel — a booking of
 * any other hotel is a 404 there.
 */
export async function BookingEditView({
  session,
  bookingId,
  hotelId,
  base,
}: {
  session: AdminSession;
  bookingId: string;
  hotelId?: string;
  /** The bookings list, e.g. `/admin/bookings`; this booking is `${base}/<id>`. */
  base: string;
}) {
  const { data } = await createAdminSupabase()
    .from('bookings')
    .select(
      'id, reference, hotel_id, status, payment_status, check_in, check_out, currency, total_amount, amount_paid, guest_name, guest_email, guest_phone, guest_address, special_requests, hotels (name), booking_rooms (room_type_id, rooms, adults, children)',
    )
    .eq('id', bookingId)
    .maybeSingle();

  /* eslint-disable @typescript-eslint/no-explicit-any */
  const b = data as any;
  if (!b || (hotelId && b.hotel_id !== hotelId)) notFound();
  if (!canAccessHotel(session, b.hotel_id)) return <NoAccess />;

  const hotel = Array.isArray(b.hotels) ? b.hotels[0] : b.hotels;
  const changeable = ['PENDING', 'CONFIRMED'].includes(b.status);
  const roomTypes = changeable ? await bookableRoomTypes(session, b.hotel_id) : [];
  const back = `${base}/${b.id}`;

  return (
    <>
      <PageHeader
        title={`Edit ${b.reference}`}
        description={`${hotel?.name ?? ''} · ${formatDate(b.check_in)} → ${formatDate(b.check_out)} · ${formatCurrency(Number(b.total_amount), b.currency)}`}
        action={
          <>
            <StatusBadge status={b.status} />
            <StatusBadge status={b.payment_status} />
            <Link href={back} className="btn-ghost">Back to booking</Link>
          </>
        }
      />

      <div className="space-y-6">
        <section className="rounded-2xl border border-slate-200 bg-white p-5">
          <h2 className="text-base font-bold text-slate-900">Guest details</h2>
          <p className="mb-4 text-sm text-slate-500">Corrections to contact details and requests. Does not change the price.</p>
          <GuestDetailsForm
            bookingId={b.id}
            guest={{
              name: b.guest_name,
              email: b.guest_email,
              phone: b.guest_phone,
              address: b.guest_address,
              special_requests: b.special_requests,
            }}
          />
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-5">
          <h2 className="text-base font-bold text-slate-900">Dates &amp; rooms</h2>
          {changeable ? (
            <>
              <p className="mb-4 text-sm text-slate-500">
                Re-priced at current rates for the new stay. The rooms the booking already holds are released when you save.
              </p>
              <ChangeStayForm
                bookingId={b.id}
                returnBase={base}
                currency={b.currency}
                roomTypes={roomTypes}
                initial={{
                  checkIn: b.check_in,
                  checkOut: b.check_out,
                  lines: (b.booking_rooms ?? []).map((l: any) => ({
                    room_type_id: l.room_type_id,
                    rooms: Number(l.rooms),
                    adults: Number(l.adults),
                    children: Number(l.children),
                  })),
                }}
              />
            </>
          ) : (
            <p className="mt-2 text-sm text-slate-500">
              A {String(b.status).replace(/_/g, ' ').toLowerCase()} booking can no longer change dates or rooms.
            </p>
          )}
        </section>
      </div>
    </>
  );
}
