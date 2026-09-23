import Link from 'next/link';
import { ArrowRight, CalendarDays } from 'lucide-react';
import { cn, formatDate } from '@/lib/utils';

export interface UpcomingStayRow {
  id: string;
  guest: string;
  hotel: string;
  checkIn: string;
  checkOut: string;
  status: string;
  image: string | null;
  arrivingToday: boolean;
}

export function UpcomingStays({ rows }: { rows: UpcomingStayRow[] }) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5">
      <div className="flex items-start justify-between gap-4">
        <h2 className="text-base font-bold text-slate-900">Upcoming Stays</h2>
        <Link
          href="/admin/bookings?filter=checkin"
          className="flex shrink-0 items-center gap-1 text-sm font-medium text-blue-600 hover:text-blue-700"
        >
          View All <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>

      <ul className="mt-4 space-y-3">
        {rows.map((row) => (
          <li key={row.id}>
            <Link
              href={`/admin/bookings/${row.id}`}
              className="flex items-center gap-3 rounded-xl p-1 transition hover:bg-slate-50"
            >
              <span className="h-12 w-12 shrink-0 overflow-hidden rounded-xl bg-slate-100">
                {row.image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={row.image} alt="" className="h-full w-full object-cover" loading="lazy" />
                ) : null}
              </span>

              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-semibold text-slate-900">{row.guest}</span>
                <span className="block truncate text-xs text-slate-500">{row.hotel}</span>
                <span className="mt-0.5 flex items-center gap-1 text-xs text-slate-400">
                  <CalendarDays className="h-3 w-3 shrink-0" />
                  {formatDate(row.checkIn, { day: 'numeric', month: 'short' })} –{' '}
                  {formatDate(row.checkOut)}
                </span>
              </span>

              <span
                className={cn(
                  'shrink-0 rounded-md px-2 py-1 text-xs font-medium',
                  row.arrivingToday
                    ? 'bg-blue-50 text-blue-700'
                    : row.status === 'CONFIRMED'
                      ? 'bg-emerald-50 text-emerald-700'
                      : 'bg-amber-50 text-amber-700',
                )}
              >
                {row.arrivingToday
                  ? 'Check-in Today'
                  : row.status.charAt(0) + row.status.slice(1).toLowerCase()}
              </span>
            </Link>
          </li>
        ))}

        {rows.length === 0 ? (
          <li className="py-8 text-center text-sm text-slate-500">No upcoming stays.</li>
        ) : null}
      </ul>
    </section>
  );
}
