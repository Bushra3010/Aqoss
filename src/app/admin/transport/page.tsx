import type { Metadata } from 'next';
import { getAdminSession, can } from '@/lib/auth/session';
import { createAdminSupabase } from '@/lib/supabase/admin';
import { PageHeader, Table, Td, NoAccess } from '@/components/admin/shared';
import { StatusBadge } from '@/components/ui';
import { formatCurrency, formatDate, formatTime, todayISO } from '@/lib/utils';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Transport · AQOSS CRM' };

/** Transport services, routes and seat inventory (PRD §16). */
export default async function TransportPage() {
  const session = await getAdminSession();
  if (!can(session, 'transport.read')) return <NoAccess />;

  const supabase = createAdminSupabase();
  const scope = session!.hotelScope;

  let routesQuery = supabase
    .from('transport_routes')
    .select('id, name, pickup_location, drop_location, base_price, price_per_seat, is_active, hotels!inner (name)')
    .order('sort_order');

  let slotsQuery = supabase
    .from('transport_slots')
    .select('id, depart_date, depart_time, seat_capacity, booked_seats, status, transport_routes!inner (name), hotels!inner (name)')
    .gte('depart_date', todayISO())
    .order('depart_date')
    .order('depart_time')
    .limit(100);

  if (scope.length) {
    routesQuery = routesQuery.in('hotel_id', scope);
    slotsQuery = slotsQuery.in('hotel_id', scope);
  }

  const [{ data: routes }, { data: slots }] = await Promise.all([routesQuery, slotsQuery]);

  /* eslint-disable @typescript-eslint/no-explicit-any */
  const routeRows = (routes ?? []) as any[];
  const slotRows = (slots ?? []) as any[];

  return (
    <>
      <PageHeader title="Transport" description="Routes a guest can add to a booking, and their seat inventory." />

      <h2 className="mb-3 text-sm font-semibold text-slate-900">Routes</h2>
      <Table
        headers={['Route', 'Hotel', 'Pickup → Drop', { label: 'Base', align: 'right' }, { label: 'Per seat', align: 'right' }, 'Status']}
        empty="No routes configured."
      >
        {routeRows.map((r) => {
          const hotel = Array.isArray(r.hotels) ? r.hotels[0] : r.hotels;
          return (
            <tr key={r.id}>
              <Td><span className="font-medium text-slate-900">{r.name}</span></Td>
              <Td>{hotel?.name}</Td>
              <Td>{r.pickup_location} → {r.drop_location}</Td>
              <Td align="right">{formatCurrency(Number(r.base_price))}</Td>
              <Td align="right">{formatCurrency(Number(r.price_per_seat))}</Td>
              <Td><StatusBadge status={r.is_active ? 'ACTIVE' : 'INACTIVE'} /></Td>
            </tr>
          );
        })}
      </Table>

      <h2 className="mb-3 mt-8 text-sm font-semibold text-slate-900">Upcoming departures</h2>
      <Table
        headers={['Route', 'Hotel', 'Departs', { label: 'Seats', align: 'right' }, 'Status']}
        empty="No upcoming departures."
      >
        {slotRows.map((s) => {
          const route = Array.isArray(s.transport_routes) ? s.transport_routes[0] : s.transport_routes;
          const hotel = Array.isArray(s.hotels) ? s.hotels[0] : s.hotels;
          const free = s.seat_capacity - s.booked_seats;

          return (
            <tr key={s.id}>
              <Td><span className="font-medium text-slate-900">{route?.name}</span></Td>
              <Td>{hotel?.name}</Td>
              <Td>{formatDate(s.depart_date)} · {formatTime(s.depart_time)}</Td>
              <Td align="right">
                <span className={free === 0 ? 'text-rose-600' : 'text-slate-900'}>
                  {free} / {s.seat_capacity}
                </span>
              </Td>
              <Td><StatusBadge status={s.status} /></Td>
            </tr>
          );
        })}
      </Table>
    </>
  );
}
