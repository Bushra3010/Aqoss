import Link from 'next/link';
import { Check, Clock, Users } from 'lucide-react';
import { formatCurrency, formatTime, money, todayISO } from '@/lib/utils';
import type { HotelSiteData } from '@/types';

/**
 * The booking card in the sidebar (PRD §7).
 *
 * Shows the cheapest sellable room as a headline price. Every figure is
 * derived from the room's own rate and the hotel's tax rate — the authoritative
 * total is recomputed server-side at checkout, this is the shop window.
 */
export function RoomOfferCard({ site }: { site: HotelSiteData }) {
  const rooms = site.roomTypes;
  if (!rooms.length) return null;

  const cheapest = rooms.reduce((best, room) =>
    room.base_price * (1 - room.discount_percent / 100) <
    best.base_price * (1 - best.discount_percent / 100)
      ? room
      : best,
  );

  const nightly = money(cheapest.base_price * (1 - cheapest.discount_percent / 100));
  const taxes = money((nightly * site.hotel.tax_percent) / 100);
  const currency = site.hotel.currency;

  const freeCancellation = /free cancellation/i.test(cheapest.cancellation_policy ?? '');

  const bookingQuery = new URLSearchParams({
    room_type_id: cheapest.id,
    check_in: todayISO(),
    check_out: todayISO(1),
    adults: String(Math.min(cheapest.max_adults, 2)),
    children: '0',
    rooms: '1',
  });

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5">
      <h2 className="text-lg font-bold text-slate-900">{cheapest.name}</h2>

      <ul className="mt-3 space-y-2.5 text-sm">
        <li className="flex items-start gap-2.5 text-slate-700">
          <Users className="mt-0.5 h-[18px] w-[18px] shrink-0 text-slate-400" aria-hidden="true" />
          {cheapest.max_adults} Adult{cheapest.max_adults > 1 ? 's' : ''}
          {cheapest.max_children > 0
            ? `, up to ${cheapest.max_children} child${cheapest.max_children > 1 ? 'ren' : ''}`
            : ''}
        </li>

        <li className="flex items-start gap-2.5 text-slate-600">
          <Clock className="mt-0.5 h-[18px] w-[18px] shrink-0 text-slate-400" aria-hidden="true" />
          Check-in from {formatTime(site.hotel.check_in_time)}, check-out by{' '}
          {formatTime(site.hotel.check_out_time)}
        </li>

        {cheapest.cancellation_policy ? (
          <li
            className={`flex items-start gap-2.5 ${
              freeCancellation ? 'font-medium text-green-700' : 'text-slate-600'
            }`}
          >
            <Check
              className={`mt-0.5 h-[18px] w-[18px] shrink-0 ${
                freeCancellation ? 'text-green-600' : 'text-slate-400'
              }`}
              aria-hidden="true"
            />
            {cheapest.cancellation_policy}
          </li>
        ) : null}
      </ul>

      <div className="mt-5">
        {cheapest.discount_percent > 0 ? (
          <p className="text-sm text-slate-400">
            <s>{formatCurrency(cheapest.base_price, currency)}</s>{' '}
            <span className="text-slate-500">Per Night</span>
          </p>
        ) : (
          <p className="text-sm text-slate-500">Per Night</p>
        )}

        <p className="mt-0.5 flex flex-wrap items-baseline gap-2">
          <span className="text-[32px] font-bold leading-none tracking-tight text-slate-900">
            {formatCurrency(nightly, currency)}
          </span>
          <span className="text-sm text-slate-500">
            + {formatCurrency(taxes, currency)} taxes &amp; fees
          </span>
        </p>
      </div>

      <Link
        href={`/booking?${bookingQuery.toString()}`}
        className="mt-4 block rounded-lg bg-green-700 px-4 py-3 text-center text-sm font-bold text-white transition hover:bg-green-800"
      >
        Book This Now
      </Link>

      {rooms.length > 1 ? (
        <div className="mt-4 flex items-center gap-3 rounded-lg bg-green-50 p-3">
          <p className="min-w-0 flex-1 text-sm text-slate-700">
            More options available with{' '}
            <span className="font-medium text-green-700">Free Cancellation</span>
          </p>
          <Link
            href="/rooms"
            className="shrink-0 rounded-md border border-green-700 bg-white px-3 py-1.5 text-xs font-bold uppercase tracking-wide text-green-700 transition hover:bg-green-700 hover:text-white"
          >
            View all ({rooms.length})
          </Link>
        </div>
      ) : null}
    </section>
  );
}
