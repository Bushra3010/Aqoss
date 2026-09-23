/* eslint-disable @typescript-eslint/no-explicit-any -- query rows are untyped until `npm run db:types` is run */
import Link from 'next/link';
import type { Metadata } from 'next';
import { getUser } from '@/lib/auth/session';
import { getCustomerProfile } from '@/services/customer.service';
import { StatusBadge, EmptyState } from '@/components/ui';
import { formatCurrency, formatDate } from '@/lib/utils';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'My bookings' };

const TABS = [
  { key: 'upcoming', label: 'Upcoming' },
  { key: 'completed', label: 'Completed' },
  { key: 'cancelled', label: 'Cancelled' },
] as const;

/** My bookings, split the way PRD §12 describes. */
export default async function BookingsPage({
  searchParams,
}: {
  searchParams: { tab?: string };
}) {
  const user = await getUser();
  const data = await getCustomerProfile(user!.id);

  const tab = (TABS.find((t) => t.key === searchParams.tab)?.key ?? 'upcoming') as
    | 'upcoming'
    | 'completed'
    | 'cancelled';

  const rows =
    tab === 'upcoming' ? data.upcoming : tab === 'completed' ? data.previous : data.cancelled;

  return (
    <div>
      <h1 className="section-title">My bookings</h1>

      <div className="mt-5 flex gap-1 border-b border-slate-200">
        {TABS.map((t) => (
          <Link
            key={t.key}
            href={`/dashboard/bookings?tab=${t.key}`}
            aria-current={tab === t.key ? 'page' : undefined}
            className={
              'border-b-2 px-4 py-2 text-sm font-medium ' +
              (tab === t.key
                ? 'border-slate-900 text-slate-900'
                : 'border-transparent text-slate-500 hover:text-slate-800')
            }
          >
            {t.label}
          </Link>
        ))}
      </div>

      {rows.length === 0 ? (
        <div className="mt-6">
          <EmptyState
            title={`No ${tab} bookings`}
            description="Bookings you make will show up here."
            action={<Link href="/rooms" className="btn-primary">Browse rooms</Link>}
          />
        </div>
      ) : (
        <ul className="mt-6 space-y-3">
          {rows.map((b: any) => (
            <li key={b.id} className="card p-5">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="min-w-0">
                  <p className="font-semibold text-slate-900">
                    {Array.isArray(b.hotels) ? b.hotels[0]?.name : b.hotels?.name}
                  </p>
                  <p className="mt-0.5 text-sm text-slate-500">
                    {formatDate(b.check_in)} → {formatDate(b.check_out)}
                  </p>
                  <p className="mt-1 text-xs text-slate-400">Booking {b.reference}</p>
                </div>

                <div className="flex flex-col items-end gap-2">
                  <div className="flex gap-2">
                    <StatusBadge status={b.status} />
                    <StatusBadge status={b.payment_status} />
                  </div>
                  <p className="font-semibold text-slate-900">
                    {formatCurrency(Number(b.total_amount))}
                  </p>
                  <Link href={`/dashboard/bookings/${b.id}`} className="btn-outline">
                    View details
                  </Link>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
