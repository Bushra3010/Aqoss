import Link from 'next/link';
import { ArrowRight, MoreVertical } from 'lucide-react';
import { cn, formatCurrency, formatDate, initials } from '@/lib/utils';

/** Deterministic avatar colour, so a guest keeps the same one across renders. */
const AVATAR_TONES = [
  'bg-blue-100 text-blue-700',
  'bg-violet-100 text-violet-700',
  'bg-emerald-100 text-emerald-700',
  'bg-amber-100 text-amber-700',
  'bg-rose-100 text-rose-700',
  'bg-cyan-100 text-cyan-700',
];

function toneFor(name: string) {
  let hash = 0;
  for (const ch of name) hash = (hash + ch.charCodeAt(0)) % AVATAR_TONES.length;
  return AVATAR_TONES[hash];
}

const STATUS_TONES: Record<string, string> = {
  CONFIRMED: 'bg-emerald-50 text-emerald-700',
  PENDING: 'bg-amber-50 text-amber-700',
  CHECKED_IN: 'bg-blue-50 text-blue-700',
  CHECKED_OUT: 'bg-slate-100 text-slate-600',
  CANCELLED: 'bg-rose-50 text-rose-700',
  REFUNDED: 'bg-rose-50 text-rose-700',
};

function label(status: string) {
  return status.charAt(0) + status.slice(1).toLowerCase().replace(/_/g, ' ');
}

export interface RecentBookingRow {
  id: string;
  guest: string;
  hotel: string;
  roomType: string;
  checkIn: string;
  status: string;
  amount: number;
  currency: string;
}

export function RecentBookings({ rows }: { rows: RecentBookingRow[] }) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white">
      <div className="flex items-start justify-between gap-4 p-5 pb-4">
        <div>
          <h2 className="text-base font-bold text-slate-900">Recent Bookings</h2>
          <p className="mt-0.5 text-sm text-slate-500">Latest customer bookings across all hotels</p>
        </div>
        <Link
          href="/admin/bookings"
          className="flex shrink-0 items-center gap-1 text-sm font-medium text-blue-600 hover:text-blue-700"
        >
          View All <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-y border-slate-100 bg-slate-50/60 text-left">
              {['Guest', 'Hotel', 'Room Type', 'Check-in', 'Status', 'Amount', ''].map((h, i) => (
                <th
                  key={h || i}
                  scope="col"
                  className={cn(
                    'whitespace-nowrap px-5 py-2.5 text-xs font-medium text-slate-500',
                    h === 'Amount' && 'text-right',
                  )}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-50">
            {rows.map((row) => (
              <tr key={row.id} className="transition hover:bg-slate-50/60">
                <td className="whitespace-nowrap px-5 py-3">
                  <Link href={`/admin/bookings/${row.id}`} className="flex items-center gap-2.5">
                    <span
                      className={cn(
                        'flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[11px] font-bold',
                        toneFor(row.guest),
                      )}
                      aria-hidden="true"
                    >
                      {initials(row.guest)}
                    </span>
                    <span className="font-medium text-slate-900">{row.guest}</span>
                  </Link>
                </td>
                <td className="whitespace-nowrap px-5 py-3 text-slate-600">{row.hotel}</td>
                <td className="whitespace-nowrap px-5 py-3 text-slate-600">{row.roomType}</td>
                <td className="whitespace-nowrap px-5 py-3 text-slate-600">{formatDate(row.checkIn)}</td>
                <td className="whitespace-nowrap px-5 py-3">
                  <span
                    className={cn(
                      'inline-flex rounded-md px-2 py-1 text-xs font-medium',
                      STATUS_TONES[row.status] ?? 'bg-slate-100 text-slate-600',
                    )}
                  >
                    {label(row.status)}
                  </span>
                </td>
                <td className="whitespace-nowrap px-5 py-3 text-right font-semibold text-slate-900">
                  {formatCurrency(row.amount, row.currency)}
                </td>
                <td className="px-5 py-3 text-right">
                  <Link
                    href={`/admin/bookings/${row.id}`}
                    className="inline-flex rounded-md p-1 text-slate-300 hover:bg-slate-100 hover:text-slate-500"
                    aria-label={`Open booking for ${row.guest}`}
                  >
                    <MoreVertical className="h-4 w-4" />
                  </Link>
                </td>
              </tr>
            ))}

            {rows.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-5 py-10 text-center text-slate-500">
                  No bookings yet.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </section>
  );
}
