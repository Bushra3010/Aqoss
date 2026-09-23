import Link from 'next/link';
import { formatCurrency } from '@/lib/utils';
import type { AvailabilityResult, RoomTypeSummary } from '@/types';

/**
 * A room type that the server has confirmed is bookable (PRD §7, §8).
 * The price shown is the same one the booking API will charge.
 */
export function AvailabilityCard({
  result,
  details,
  currency,
  search,
}: {
  result: AvailabilityResult;
  details?: RoomTypeSummary;
  currency: string;
  search: { check_in: string; check_out: string; adults: number; children: number; rooms: number };
}) {
  const cover = details?.images.find((i) => i.is_cover) ?? details?.images[0];
  const perNight = result.nightly_rates.length
    ? result.room_subtotal / search.rooms / result.nightly_rates.length
    : result.base_price;

  const bookingQuery = new URLSearchParams({
    room_type_id: result.room_type_id,
    check_in: search.check_in,
    check_out: search.check_out,
    adults: String(search.adults),
    children: String(search.children),
    rooms: String(search.rooms),
  });

  return (
    <article className="card overflow-hidden sm:flex">
      <div className="h-48 shrink-0 bg-slate-200 sm:h-auto sm:w-64">
        {cover ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={cover.url} alt={cover.alt_text ?? result.name} className="h-full w-full object-cover" loading="lazy" />
        ) : null}
      </div>

      <div className="flex flex-1 flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h3 className="text-lg font-semibold text-slate-900">{result.name}</h3>
          <p className="mt-1 text-sm text-slate-500">
            Up to {result.max_adults} adult{result.max_adults > 1 ? 's' : ''}
            {result.max_children > 0 ? `, ${result.max_children} child${result.max_children > 1 ? 'ren' : ''}` : ''}
            {result.bed_type ? ` · ${result.bed_type}` : ''}
          </p>

          {details?.amenities.length ? (
            <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1">
              {details.amenities.slice(0, 4).map((a) => (
                <li key={a.name} className="text-sm text-slate-600">✓ {a.name}</li>
              ))}
            </ul>
          ) : null}

          <p className="mt-3 text-sm font-medium text-emerald-700">
            {result.available_rooms} room{result.available_rooms === 1 ? '' : 's'} available
          </p>

          {details?.cancellation_policy ? (
            <p className="mt-1 text-xs text-slate-500">{details.cancellation_policy}</p>
          ) : null}
        </div>

        <div className="shrink-0 text-right">
          <p className="text-sm text-slate-500">
            {formatCurrency(perNight, currency)} / night
          </p>
          <p className="text-2xl font-bold text-slate-900">
            {formatCurrency(result.total_price, currency)}
          </p>
          <p className="text-xs text-slate-500">
            {result.nights} night{result.nights > 1 ? 's' : ''} · {search.rooms} room
            {search.rooms > 1 ? 's' : ''} · incl. {result.tax_percent}% tax
          </p>

          <Link
            href={`/booking?${bookingQuery.toString()}`}
            className="mt-3 block rounded-lg bg-green-700 px-5 py-2.5 text-center text-sm font-bold text-white transition hover:bg-green-800"
          >
            Book This Now
          </Link>
          {details ? (
            <Link href={`/rooms/${details.slug}`} className="mt-2 block text-xs text-slate-500 hover:text-slate-800">
              View room details
            </Link>
          ) : null}
        </div>
      </div>
    </article>
  );
}
