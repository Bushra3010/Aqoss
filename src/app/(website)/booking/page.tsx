import { notFound, redirect } from 'next/navigation';
import type { Metadata } from 'next';
import { z } from 'zod';
import { getPublishedTenant } from '@/lib/tenant';
import { getHotelSiteData } from '@/services/hotel.service';
import { searchAvailability } from '@/services/availability.service';
import { getTransportOptions } from '@/services/transport.service';
import { getUser } from '@/lib/auth/session';
import { createAdminSupabase } from '@/lib/supabase/admin';
import { BookingFlow } from '@/components/booking/BookingFlow';
import { Alert } from '@/components/ui';
import { isoDate } from '@/lib/validation/schemas';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Complete your booking' };

const paramsSchema = z.object({
  room_type_id: z.string().uuid(),
  check_in: isoDate,
  check_out: isoDate,
  adults: z.coerce.number().int().min(1).max(30).default(2),
  children: z.coerce.number().int().min(0).max(20).default(0),
  rooms: z.coerce.number().int().min(1).max(10).default(1),
});

/**
 * Booking flow (PRD §13).
 *
 * Availability and price are resolved here, on the server, before the form is
 * even shown — and both are recomputed again when the booking is submitted.
 */
export default async function BookingPage({
  searchParams,
}: {
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const tenant = await getPublishedTenant();
  if (!tenant) notFound();

  const parsed = paramsSchema.safeParse(searchParams);
  if (!parsed.success) redirect('/rooms');

  const input = parsed.data;
  const site = await getHotelSiteData(tenant.websiteId);
  if (!site) notFound();

  let results;
  try {
    results = await searchAvailability({
      hotelId: tenant.hotelId,
      checkIn: input.check_in,
      checkOut: input.check_out,
      adults: input.adults,
      children: input.children,
      rooms: input.rooms,
    });
  } catch (err) {
    console.error('[aqoss] booking availability failed', err);
    return (
      <div className="container-page py-10">
        <Alert>Selected dates are unavailable. Please search again.</Alert>
      </div>
    );
  }

  const selected = results.find((r) => r.room_type_id === input.room_type_id);

  if (!selected || !selected.is_available || selected.available_rooms < input.rooms) {
    return (
      <div className="container-page py-10">
        <Alert>
          {selected && selected.available_rooms > 0
            ? `Only ${selected.available_rooms} room(s) left for these dates.`
            : 'Room no longer available. Please choose different dates.'}
        </Alert>
      </div>
    );
  }

  const details = site.roomTypes.find((rt) => rt.id === selected.room_type_id);

  const [transport, user] = await Promise.all([
    getTransportOptions({
      hotelId: tenant.hotelId,
      fromDate: input.check_in,
      toDate: input.check_out,
    }).catch(() => []),
    getUser(),
  ]);

  let profile = null;
  if (user) {
    const { data } = await createAdminSupabase()
      .from('profiles')
      .select('full_name, email, mobile, address_line1, city')
      .eq('id', user.id)
      .maybeSingle();
    profile = data;
  }

  return (
    <div className="container-page max-w-6xl py-8">
      <h1 className="section-title">Complete your booking</h1>
      <p className="mt-2 text-slate-600">{site.hotel.name}</p>

      <div className="mt-8">
        <BookingFlow
          hotel={{
            id: site.hotel.id,
            name: site.hotel.name,
            currency: site.hotel.currency,
            check_in_time: site.hotel.check_in_time,
            check_out_time: site.hotel.check_out_time,
          }}
          websiteId={tenant.websiteId}
          search={input}
          room={selected}
          roomDetails={details ?? null}
          transportOptions={transport}
          signedIn={Boolean(user)}
          prefill={{
            name: profile?.full_name ?? '',
            email: profile?.email ?? user?.email ?? '',
            phone: profile?.mobile ?? '',
            address: [profile?.address_line1, profile?.city].filter(Boolean).join(', '),
          }}
        />
      </div>
    </div>
  );
}
