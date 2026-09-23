/* eslint-disable @typescript-eslint/no-explicit-any -- query rows are untyped until `npm run db:types` is run */
import Link from 'next/link';
import type { Metadata } from 'next';
import { getUser } from '@/lib/auth/session';
import { getCustomerProfile } from '@/services/customer.service';
import { getReviewableBookings } from '@/services/review.service';
import { StatusBadge, EmptyState } from '@/components/ui';
import { formatCurrency, formatDate } from '@/lib/utils';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Dashboard' };

/** Customer dashboard overview (PRD §12). */
export default async function DashboardPage() {
  const user = await getUser();
  const data = await getCustomerProfile(user!.id);
  const reviewable = await getReviewableBookings(user!.id);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="section-title">Welcome back</h1>
        <p className="mt-1 text-slate-600">{data.profile?.full_name ?? user!.email}</p>
      </div>

      <dl className="grid gap-4 sm:grid-cols-3">
        <Stat label="Total bookings" value={String(data.stats.totalBookings)} />
        <Stat label="Total spent" value={formatCurrency(data.stats.totalSpend)} />
        <Stat label="Upcoming stays" value={String(data.upcoming.length)} />
      </dl>

      {reviewable.length ? (
        <section className="card p-5">
          <h2 className="text-base font-semibold text-slate-900">How was your stay?</h2>
          <ul className="mt-3 space-y-2">
            {reviewable.slice(0, 3).map((b: any) => (
              <li key={b.id} className="flex flex-wrap items-center justify-between gap-2 text-sm">
                <span className="text-slate-600">
                  {Array.isArray(b.hotels) ? b.hotels[0]?.name : b.hotels?.name} ·{' '}
                  {formatDate(b.check_out)}
                </span>
                <Link href={`/dashboard/bookings/${b.id}`} className="btn-outline">
                  Write a review
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section>
        <div className="flex items-end justify-between">
          <h2 className="text-lg font-semibold text-slate-900">Upcoming stays</h2>
          <Link href="/dashboard/bookings" className="text-sm font-medium text-slate-600 hover:text-slate-900">
            View all →
          </Link>
        </div>

        {data.upcoming.length === 0 ? (
          <div className="mt-4">
            <EmptyState
              title="No upcoming stays"
              description="When you book, your reservation appears here."
              action={<Link href="/rooms" className="btn-primary">Browse rooms</Link>}
            />
          </div>
        ) : (
          <ul className="mt-4 space-y-3">
            {data.upcoming.map((b: any) => (
              <li key={b.id} className="card flex flex-wrap items-center justify-between gap-4 p-5">
                <div>
                  <p className="font-semibold text-slate-900">
                    {Array.isArray(b.hotels) ? b.hotels[0]?.name : b.hotels?.name}
                  </p>
                  <p className="text-sm text-slate-500">
                    {formatDate(b.check_in)} → {formatDate(b.check_out)} · {b.reference}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <StatusBadge status={b.status} />
                  <Link href={`/dashboard/bookings/${b.id}`} className="btn-outline">
                    Details
                  </Link>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="card p-5">
      <dt className="text-sm text-slate-500">{label}</dt>
      <dd className="mt-1 text-2xl font-bold text-slate-900">{value}</dd>
    </div>
  );
}
