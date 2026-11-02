import Link from 'next/link';
import { listSettlements } from '@/services/settlement.service';
import { PageHeader, StatTile, Table, Td } from '@/components/admin/shared';
import { FilterForm } from '@/components/admin/FilterForm';
import { PayoutBadge } from '@/components/admin/LinkTabs';
import { StatusBadge } from '@/components/ui';
import { formatCurrency, formatDate, nightsBetween, todayISO } from '@/lib/utils';

export interface SettlementSearch {
  period?: string;
  from?: string;
  to?: string;
}

type Period = 'till_date' | 'month' | 'custom';

const PERIODS: { key: Period; label: string }[] = [
  { key: 'till_date', label: 'Till date' },
  { key: 'month', label: 'This month' },
  { key: 'custom', label: 'Custom dates' },
];

const isDate = (v?: string) => Boolean(v && /^\d{4}-\d{2}-\d{2}$/.test(v));

/**
 * A hotel's payments from AQOSS: for every confirmed booking in the period
 * (by check-in date), what the hotel is owed after commission and whether
 * AQOSS has paid it. The tiles total every booking in the period.
 */
export async function SettlementView({
  hotelId,
  searchParams,
  listHref,
  tabs,
  bookingHref,
  payoutHref,
}: {
  hotelId: string;
  searchParams: SettlementSearch;
  /** This page, for the period links. */
  listHref: string;
  /** Shown under the header, e.g. a hotel panel's Payments tabs. */
  tabs?: React.ReactNode;
  bookingHref: (bookingId: string) => string;
  /** Set when the admin may record payouts. */
  payoutHref?: (bookingId: string) => string;
}) {
  const today = todayISO();
  const period: Period = PERIODS.some((p) => p.key === searchParams.period)
    ? (searchParams.period as Period)
    : 'till_date';

  let from: string | undefined;
  let to: string | undefined = today;
  if (period === 'month') {
    from = `${today.slice(0, 8)}01`;
  } else if (period === 'custom') {
    from = isDate(searchParams.from) ? searchParams.from : undefined;
    to = isDate(searchParams.to) ? searchParams.to : undefined;
  }

  const { rows, summary } = await listSettlements({ hotelId, from, to });
  const currency = rows[0]?.currency ?? 'INR';

  const range =
    period === 'till_date'
      ? `Stays checking in up to ${formatDate(today)}`
      : `Stays checking in ${from ? formatDate(from) : 'any time'} – ${to ? formatDate(to) : 'any time'}`;

  return (
    <>
      <PageHeader
        title="Payments"
        description="What AQOSS owes this property for each booking, after commission, and what has been paid."
      />

      {tabs}

      <div className="mb-4 flex flex-wrap gap-2" role="group" aria-label="Period">
        {PERIODS.map((p) => (
          <Link
            key={p.key}
            href={p.key === 'till_date' ? listHref : `${listHref}?period=${p.key}`}
            aria-current={period === p.key ? 'page' : undefined}
            className={period === p.key ? 'btn-primary' : 'btn-outline'}
          >
            {p.label}
          </Link>
        ))}
      </div>

      {period === 'custom' ? (
        <FilterForm className="mb-4 flex flex-wrap gap-2">
          <input type="hidden" name="period" value="custom" />
          <input name="from" type="date" className="input max-w-[11rem]" defaultValue={from ?? ''} aria-label="Check-in from" />
          <input name="to" type="date" className="input max-w-[11rem]" defaultValue={to ?? ''} aria-label="Check-in to" />
        </FilterForm>
      ) : null}

      <p className="mb-3 text-sm text-slate-500">{range}</p>

      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile label="Bookings" value={summary.bookings} />
        <StatTile label="Payable to property" value={formatCurrency(summary.payable, currency)} />
        <StatTile label="Payment done" value={formatCurrency(summary.paid, currency)} />
        <StatTile label="Payment pending" value={formatCurrency(summary.pending, currency)} />
      </div>

      <h2 className="mb-3 text-base font-bold text-slate-900">Booking-wise details</h2>
      <Table
        headers={[
          'Booking ID',
          'Guest name',
          'Stay duration',
          { label: 'Booking amount', align: 'right' as const },
          { label: 'Payable to property', align: 'right' as const },
          'Payment status',
          ...(payoutHref ? [''] : []),
        ]}
        empty="No confirmed bookings in this period."
      >
        {rows.map((r) => {
          const nights = nightsBetween(r.check_in, r.check_out);
          return (
            <tr key={r.id}>
              <Td>
                <Link href={bookingHref(r.id)} className="whitespace-nowrap font-medium text-slate-900 hover:underline">
                  {r.reference}
                </Link>
                {r.status === 'CANCELLED' || r.status === 'REFUNDED' ? (
                  <div className="mt-1"><StatusBadge status={r.status} /></div>
                ) : null}
              </Td>
              <Td>{r.guest_name}</Td>
              <Td className="whitespace-nowrap">
                {formatDate(r.check_in)} → {formatDate(r.check_out)}
                <p className="text-xs text-slate-400">{nights} night{nights === 1 ? '' : 's'}</p>
              </Td>
              <Td align="right">
                <span className="font-medium text-slate-900">{formatCurrency(r.bookingAmount, r.currency)}</span>
                {r.bookingAmount !== r.total_amount ? (
                  <p className="text-xs text-slate-400">of {formatCurrency(r.total_amount, r.currency)}, after refunds</p>
                ) : null}
              </Td>
              <Td align="right">
                <span className="font-medium text-slate-900">{formatCurrency(r.payable, r.currency)}</span>
                {r.commission > 0 ? (
                  <p className="text-xs text-slate-400">
                    −{formatCurrency(r.commission, r.currency)} commission ({r.commissionPercent}%)
                  </p>
                ) : null}
              </Td>
              <Td>
                <PayoutBadge status={r.payoutStatus} />
                {r.payoutStatus === 'PARTIAL' ? (
                  <p className="mt-1 text-xs text-slate-500">{formatCurrency(r.outstanding, r.currency)} due</p>
                ) : null}
              </Td>
              {payoutHref ? (
                <Td align="right">
                  {r.outstanding > 0 ? (
                    <Link href={payoutHref(r.id)} className="whitespace-nowrap text-sm font-semibold text-blue-700 hover:underline">
                      Record payout
                    </Link>
                  ) : null}
                </Td>
              ) : null}
            </tr>
          );
        })}
      </Table>
    </>
  );
}
