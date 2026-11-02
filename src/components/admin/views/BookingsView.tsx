import Link from 'next/link';
import type { AdminSession } from '@/lib/auth/session';
import { createAdminSupabase } from '@/lib/supabase/admin';
import { PageHeader, Table, Td } from '@/components/admin/shared';
import { StatusBadge } from '@/components/ui';
import { formatCurrency, formatDate, nightsBetween, todayISO } from '@/lib/utils';
import { FilterForm } from '@/components/admin/FilterForm';
import { SearchSelect } from '@/components/admin/SearchSelect';
import { LinkTabs } from '@/components/admin/LinkTabs';
import { ilikeTerm } from '@/lib/admin/search-term';
import { settle } from '@/lib/settlement';

export interface BookingsSearch {
  q?: string;
  status?: string;
  payment?: string;
  hotel?: string;
  from?: string;
  to?: string;
  filter?: string;
  tab?: string;
}

export type BookingsTab = 'all' | 'upcoming' | 'completed' | 'cancelled';

const TABS: { key: BookingsTab; label: string }[] = [
  { key: 'upcoming', label: 'Upcoming' },
  { key: 'completed', label: 'Completed' },
  { key: 'cancelled', label: 'Cancelled' },
  { key: 'all', label: 'All' },
];

/**
 * Booking list with the filters from PRD §26.
 *
 * Shared by the platform CRM (every hotel in scope) and a hotel's own panel,
 * where `hotelId` pins the list to one property and the hotel column and
 * filter disappear. `bookingHref` keeps detail links inside whichever panel
 * the list is shown in.
 *
 * Tabs: Upcoming is every live booking whose stay has not ended, Completed is
 * checked out or past its check-out date, Cancelled includes refunded ones.
 */
export async function BookingsView({
  session,
  searchParams,
  hotelId,
  bookingHref,
  newHref,
  listHref,
  defaultTab = 'all',
}: {
  session: AdminSession;
  searchParams: BookingsSearch;
  hotelId?: string;
  bookingHref: (bookingId: string) => string;
  /** Set when the admin may take bookings. */
  newHref?: string;
  /** This list's own path, for the tab links. */
  listHref: string;
  defaultTab?: BookingsTab;
}) {
  const supabase = createAdminSupabase();

  let hotels: { id: string; name: string; city: string | null }[] = [];
  if (!hotelId) {
    let hotelsQuery = supabase.from('hotels').select('id, name, city').order('name');
    if (session.hotelScope.length) hotelsQuery = hotelsQuery.in('id', session.hotelScope);
    hotels = ((await hotelsQuery).data ?? []) as typeof hotels;
  }

  let query = supabase
    .from('bookings')
    .select(
      'id, reference, guest_name, guest_email, check_in, check_out, status, payment_status, total_amount, tax_total, amount_paid, amount_refunded, commission_percent, currency, created_at, hotels!inner (id, name, commission_percent)',
    )
    .limit(200);

  const tab = (TABS.some((t) => t.key === searchParams.tab) ? searchParams.tab : defaultTab) as BookingsTab;
  const today = todayISO();
  if (tab === 'upcoming') {
    query = query.in('status', ['PENDING', 'CONFIRMED', 'CHECKED_IN']).gte('check_out', today);
  } else if (tab === 'completed') {
    query = query.or(`status.eq.CHECKED_OUT,and(status.in.(CONFIRMED,CHECKED_IN),check_out.lt.${today})`);
  } else if (tab === 'cancelled') {
    query = query.in('status', ['CANCELLED', 'REFUNDED']);
  }
  // Upcoming reads soonest first; the others newest first.
  query = tab === 'upcoming'
    ? query.order('check_in', { ascending: true })
    : query.order('created_at', { ascending: false });

  if (session.hotelScope.length) query = query.in('hotel_id', session.hotelScope);
  const hotelFilter = hotelId ?? searchParams.hotel;
  if (hotelFilter) query = query.eq('hotel_id', hotelFilter);
  if (searchParams.status) query = query.eq('status', searchParams.status);
  if (searchParams.payment) query = query.eq('payment_status', searchParams.payment);
  if (searchParams.from) query = query.gte('check_in', searchParams.from);
  if (searchParams.to) query = query.lte('check_in', searchParams.to);
  if (searchParams.filter === 'checkin') query = query.eq('check_in', todayISO());
  if (searchParams.filter === 'checkout') query = query.eq('check_out', todayISO());
  const term = ilikeTerm(searchParams.q);
  if (term) query = query.or(`reference.ilike.${term},guest_name.ilike.${term},guest_email.ilike.${term}`);

  const { data } = await query;
  /* eslint-disable @typescript-eslint/no-explicit-any */
  const bookings = (data ?? []) as any[];

  // Tab links keep every other filter.
  const tabHref = (key: BookingsTab) => {
    const params = new URLSearchParams(
      Object.entries(searchParams).filter(([k, v]) => k !== 'tab' && typeof v === 'string' && v) as [string, string][],
    );
    if (key !== defaultTab) params.set('tab', key);
    const qs = params.toString();
    return qs ? `${listHref}?${qs}` : listHref;
  };

  return (
    <>
      <PageHeader
        title="Bookings"
        description={`${bookings.length} booking(s) shown.`}
        action={newHref ? <Link href={newHref} className="btn-primary">+ New booking</Link> : null}
      />

      <LinkTabs
        label="Booking lists"
        active={tab}
        tabs={TABS.map((t) => ({ key: t.key, label: t.label, href: tabHref(t.key) }))}
      />

      <FilterForm className={`mb-4 grid gap-2 sm:grid-cols-3 ${hotelId ? 'lg:grid-cols-5' : 'lg:grid-cols-6'}`}>
        {tab !== defaultTab ? <input type="hidden" name="tab" value={tab} /> : null}
        <input name="q" className="input" placeholder="Reference, name or email" defaultValue={searchParams.q ?? ''} />

        {hotelId ? null : (
          <SearchSelect
            name="hotel"
            label="Hotel"
            placeholder="Search hotel or city"
            allLabel="All hotels"
            defaultValue={searchParams.hotel ?? ''}
            options={hotels.map((h) => ({ value: h.id, label: h.name, hint: h.city }))}
            className=""
          />
        )}

        <select name="status" className="input" defaultValue={searchParams.status ?? ''}>
          <option value="">All statuses</option>
          {['PENDING', 'CONFIRMED', 'CHECKED_IN', 'CHECKED_OUT', 'CANCELLED', 'REFUNDED'].map((s) => (
            <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>
          ))}
        </select>

        <select name="payment" className="input" defaultValue={searchParams.payment ?? ''}>
          <option value="">All payments</option>
          {['PENDING', 'PAID', 'FAILED', 'PARTIALLY_REFUNDED', 'REFUNDED'].map((s) => (
            <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>
          ))}
        </select>

        <input name="from" type="date" className="input" defaultValue={searchParams.from ?? ''} aria-label="Check-in from" />
        <div className="flex gap-2">
          <input name="to" type="date" className="input" defaultValue={searchParams.to ?? ''} aria-label="Check-in to" />
        </div>
      </FilterForm>

      <Table
        headers={[
          'Booking ID',
          'Guest name',
          ...(hotelId ? [] : ['Hotel']),
          'Stay duration',
          { label: 'Booking amount', align: 'right' as const },
          { label: 'Payable to property', align: 'right' as const },
          'Payment status',
        ]}
        empty="No bookings match this filter."
      >
        {bookings.map((b) => {
          const hotel = Array.isArray(b.hotels) ? b.hotels[0] : b.hotels;
          const nights = nightsBetween(b.check_in, b.check_out);
          const { payable, commission, commissionPercent } = settle(b, hotel?.commission_percent);
          return (
            <tr key={b.id}>
              <Td>
                <Link href={bookingHref(b.id)} className="whitespace-nowrap font-medium text-slate-900 hover:underline">
                  {b.reference}
                </Link>
                <div className="mt-1"><StatusBadge status={b.status} /></div>
              </Td>
              <Td>
                {b.guest_name}
                <p className="text-xs text-slate-400">{b.guest_email}</p>
              </Td>
              {hotelId ? null : <Td>{hotel?.name}</Td>}
              <Td className="whitespace-nowrap">
                {formatDate(b.check_in)} → {formatDate(b.check_out)}
                <p className="text-xs text-slate-400">{nights} night{nights === 1 ? '' : 's'}</p>
              </Td>
              <Td align="right">
                <span className="font-medium text-slate-900">
                  {formatCurrency(Number(b.total_amount), b.currency)}
                </span>
                {Number(b.amount_paid) - Number(b.amount_refunded) < Number(b.total_amount) ? (
                  <p className="text-xs text-amber-600">
                    {formatCurrency(Number(b.amount_paid) - Number(b.amount_refunded), b.currency)} paid
                  </p>
                ) : null}
              </Td>
              <Td align="right">
                <span className="font-medium text-slate-900">{formatCurrency(payable, b.currency)}</span>
                {commission > 0 ? (
                  <p className="text-xs text-slate-400">
                    after {commissionPercent}% commission
                  </p>
                ) : null}
              </Td>
              <Td><StatusBadge status={b.payment_status} /></Td>
            </tr>
          );
        })}
      </Table>
    </>
  );
}
