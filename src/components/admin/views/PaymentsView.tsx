import Link from 'next/link';
import type { AdminSession } from '@/lib/auth/session';
import { createAdminSupabase } from '@/lib/supabase/admin';
import { listPayments, paymentTotals, type LedgerFilters } from '@/services/payment-ledger.service';
import { PageHeader, Table, Td, StatTile } from '@/components/admin/shared';
import { FilterForm } from '@/components/admin/FilterForm';
import { SearchSelect } from '@/components/admin/SearchSelect';
import { StatusBadge } from '@/components/ui';
import { formatCurrency } from '@/lib/utils';
import { paymentMethodLabel } from '@/lib/payment-labels';

export interface PaymentsSearch {
  q?: string;
  hotel?: string;
  status?: string;
  method?: string;
  from?: string;
  to?: string;
}

/**
 * Payment ledger (PRD §27), for the platform or one hotel.
 *
 * Every payment — through the gateway or taken at the desk — with refunds
 * shown against the payment they came out of. The tiles are totals over every
 * payment matching the filters, not just the rows listed.
 */
export async function PaymentsView({
  session,
  searchParams,
  hotelId,
  bookingHref,
  bookingsHref,
  paymentHref,
  newHref,
}: {
  session: AdminSession;
  searchParams: PaymentsSearch;
  hotelId?: string;
  bookingHref: (bookingId: string) => string;
  /** The bookings list, for "outstanding" to link to. */
  bookingsHref: string;
  /** Each payment's own page. */
  paymentHref: (paymentId: string) => string;
  /** Set when the admin may record payments taken at the hotel. */
  newHref?: string;
}) {
  const filters: LedgerFilters = {
    scope: session.hotelScope,
    hotelId: hotelId ?? searchParams.hotel,
    q: searchParams.q,
    status: searchParams.status,
    method: searchParams.method,
    from: searchParams.from,
    to: searchParams.to,
  };

  const [{ rows, refundedBy }, totals, hotels] = await Promise.all([
    listPayments(filters),
    paymentTotals(filters),
    hotelId
      ? Promise.resolve([] as { id: string; name: string; city: string | null }[])
      : (async () => {
          let q = createAdminSupabase().from('hotels').select('id, name, city').order('name');
          if (session.hotelScope.length) q = q.in('id', session.hotelScope);
          return ((await q).data ?? []) as { id: string; name: string; city: string | null }[];
        })(),
  ]);

  const outstandingLink = `${bookingsHref}?payment=PENDING${!hotelId && searchParams.hotel ? `&hotel=${searchParams.hotel}` : ''}`;

  return (
    <>
      <PageHeader
        title="Payments"
        description="Every payment — online and at the hotel — with refunds against the payment they came from."
        action={newHref ? <Link href={newHref} className="btn-primary">+ Record payment</Link> : null}
      />

      <div className="mb-5 grid gap-3 sm:gap-4 grid-cols-2 xl:grid-cols-4">
        <StatTile
          label="Received"
          value={formatCurrency(totals.net)}
          hint={totals.refunded ? `${formatCurrency(totals.received)} taken − ${formatCurrency(totals.refunded)} refunded` : `${totals.count} payment${totals.count === 1 ? '' : 's'}`}
        />
        <StatTile label="Refunded" value={formatCurrency(totals.refunded)} href={`?status=REFUNDED`} />
        {totals.outstandingShown ? (
          <StatTile
            label="Still owed"
            value={formatCurrency(totals.outstanding)}
            hint={`${totals.outstandingCount} live booking${totals.outstandingCount === 1 ? '' : 's'} with a balance`}
            href={outstandingLink}
          />
        ) : (
          <StatTile label="Still owed" value="—" hint="Clear the payment filters to see it" />
        )}
        <StatTile
          label="Failed / unfinished"
          value={`${totals.failed} / ${totals.awaiting}`}
          hint="Online payments that failed or were never completed"
        />
      </div>

      <FilterForm className="mb-4 flex flex-wrap gap-2">
        <input
          name="q"
          type="search"
          className="input max-w-xs"
          placeholder="Booking reference, guest or email"
          defaultValue={searchParams.q ?? ''}
          aria-label="Search payments"
        />
        {hotelId ? null : (
          <SearchSelect
            name="hotel"
            label="Hotel"
            placeholder="Search hotel or city"
            allLabel="All hotels"
            defaultValue={searchParams.hotel ?? ''}
            options={hotels.map((h) => ({ value: h.id, label: h.name, hint: h.city }))}
            className="w-full sm:w-64"
          />
        )}
        <select name="status" className="input max-w-[11rem]" defaultValue={searchParams.status ?? ''} aria-label="Status">
          <option value="">All statuses</option>
          <option value="PAID">Paid</option>
          <option value="PARTIALLY_REFUNDED">Partly refunded</option>
          <option value="REFUNDED">Refunded</option>
          <option value="PENDING">Not completed</option>
          <option value="FAILED">Failed</option>
        </select>
        <select name="method" className="input max-w-[11rem]" defaultValue={searchParams.method ?? ''} aria-label="Method">
          <option value="">All methods</option>
          <option value="online">Online</option>
          <option value="cash">Cash</option>
          <option value="upi">UPI</option>
          <option value="card">Card</option>
          <option value="bank_transfer">Bank transfer</option>
        </select>
        <input name="from" type="date" className="input max-w-[10rem]" defaultValue={searchParams.from ?? ''} aria-label="Paid from" />
        <input name="to" type="date" className="input max-w-[10rem]" defaultValue={searchParams.to ?? ''} aria-label="Paid to" />
      </FilterForm>

      <p className="mb-2 text-sm text-slate-500">
        {totals.count > rows.length ? `Latest ${rows.length} of ${totals.count} payments` : `${rows.length} payment${rows.length === 1 ? '' : 's'}`}
      </p>

      <Table
        headers={['Booking', ...(hotelId ? [] : ['Hotel']), 'Method', 'Status', 'Paid at', { label: 'Amount', align: 'right' as const }, { label: '', align: 'right' as const }]}
        empty="No payments match these filters."
      >
        {rows.map((p) => {
          const booking = Array.isArray(p.bookings) ? p.bookings[0] : p.bookings;
          const hotel = Array.isArray(p.hotels) ? p.hotels[0] : p.hotels;
          const refunded = refundedBy.get(p.id) ?? 0;
          const at = p.paid_at ? new Date(p.paid_at) : null;
          return (
            <tr key={p.id}>
              <Td>
                <Link href={bookingHref(booking?.id)} className="whitespace-nowrap font-medium text-slate-900 hover:underline">
                  {booking?.reference}
                </Link>
                <p className="text-xs text-slate-400">{booking?.guest_name}</p>
              </Td>
              {hotelId ? null : <Td>{hotel?.name}</Td>}
              <Td>
                {paymentMethodLabel(p)}
                {p.provider_payment_id ? <p className="text-xs text-slate-400">{p.provider_payment_id}</p> : null}
              </Td>
              <Td><StatusBadge status={p.status} /></Td>
              <Td className="whitespace-nowrap">
                {at ? (
                  <>
                    {at.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                    <p className="text-xs text-slate-400">{at.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' })}</p>
                  </>
                ) : (
                  '—'
                )}
              </Td>
              <Td align="right">
                <Link href={paymentHref(p.id)} className="font-medium text-slate-900 hover:underline">
                  {formatCurrency(Number(p.amount), p.currency)}
                </Link>
                {refunded > 0 ? (
                  <p className="text-xs text-rose-600">−{formatCurrency(refunded, p.currency)} refunded</p>
                ) : null}
              </Td>
              <Td align="right">
                <Link href={paymentHref(p.id)} className="whitespace-nowrap text-sm font-medium text-blue-600 hover:underline">
                  View →
                </Link>
              </Td>
            </tr>
          );
        })}
      </Table>
    </>
  );
}
