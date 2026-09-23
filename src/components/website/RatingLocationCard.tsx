import Link from 'next/link';
import { MapPin } from 'lucide-react';
import type { HotelSiteData } from '@/types';

/** Rating summary and location, beneath the booking card (PRD §17, §19). */
export function RatingLocationCard({ site }: { site: HotelSiteData }) {
  const { hotel, reviewSummary } = site;

  const area = [hotel.city, hotel.state].filter(Boolean).join(', ');
  const street = [hotel.address_line1, hotel.address_line2, hotel.postal_code]
    .filter(Boolean)
    .join(', ');

  const mapsHref =
    hotel.google_maps_url ??
    (hotel.latitude && hotel.longitude
      ? `https://www.google.com/maps/search/?api=1&query=${hotel.latitude},${hotel.longitude}`
      : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${hotel.name} ${area}`)}`);

  return (
    <section className="rounded-xl border border-slate-200 bg-white">
      {reviewSummary.count > 0 ? (
        <div className="flex items-center gap-3 border-b border-slate-100 p-5">
          <span
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg text-lg font-bold text-white"
            style={{ backgroundColor: 'var(--brand-700)' }}
          >
            {reviewSummary.average.toFixed(1)}
          </span>

          <div className="min-w-0 flex-1">
            <p className="font-bold text-slate-900">{scoreWord(reviewSummary.average)}</p>
            <p className="text-sm text-slate-500">
              ({reviewSummary.count} rating{reviewSummary.count > 1 ? 's' : ''})
            </p>
          </div>

          <Link
            href="/reviews"
            className="shrink-0 text-sm font-medium"
            style={{ color: 'var(--brand-700)' }}
          >
            All Reviews
          </Link>
        </div>
      ) : null}

      <div className="flex items-center gap-3 p-5">
        <span
          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-[var(--brand-50)]"
          aria-hidden="true"
        >
          <MapPin className="h-5 w-5" style={{ color: 'var(--brand-700)' }} />
        </span>

        <div className="min-w-0 flex-1">
          <p className="truncate font-bold text-slate-900">{area || hotel.name}</p>
          {street ? <p className="truncate text-sm text-slate-500">{street}</p> : null}
        </div>

        <a
          href={mapsHref}
          target="_blank"
          rel="noopener noreferrer"
          className="shrink-0 text-sm font-medium"
          style={{ color: 'var(--brand-700)' }}
        >
          See on Map
        </a>
      </div>
    </section>
  );
}

/** Booking sites label a score as well as showing it; so does this. */
function scoreWord(score: number): string {
  if (score >= 4.5) return 'Excellent';
  if (score >= 4) return 'Very Good';
  if (score >= 3.5) return 'Good';
  if (score >= 3) return 'Pleasant';
  return 'Average';
}
