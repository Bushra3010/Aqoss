import { Mail, Phone, Sparkles, Tag } from 'lucide-react';
import { formatDate, formatTime } from '@/lib/utils';
import type { HotelSiteData } from '@/types';

/**
 * The rest of the booking rail.
 *
 * Each card renders only when the hotel actually has that content, so a
 * sparsely configured property shows a shorter rail rather than empty boxes.
 */

export function OffersCard({ site }: { site: HotelSiteData }) {
  if (!site.offers.length) return null;

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5">
      <h2 className="flex items-center gap-2 text-base font-bold text-slate-900">
        <Tag className="h-[18px] w-[18px]" style={{ color: 'var(--brand-700)' }} aria-hidden="true" />
        Offers you can use
      </h2>

      <ul className="mt-3 space-y-3">
        {site.offers.slice(0, 4).map((offer) => (
          <li key={offer.id} className="rounded-lg bg-[var(--brand-50)] p-3">
            <p className="text-sm font-semibold text-slate-900">{offer.title}</p>
            {offer.description ? (
              <p className="mt-0.5 text-xs leading-relaxed text-slate-600">{offer.description}</p>
            ) : null}
            {offer.valid_until ? (
              <p className="mt-1 text-xs text-slate-400">
                Valid until {formatDate(offer.valid_until)}
              </p>
            ) : null}
          </li>
        ))}
      </ul>
    </section>
  );
}

export function HighlightsCard({ site }: { site: HotelSiteData }) {
  const { highlights } = site.hotel;
  if (!highlights?.length && !site.nearby.length) return null;

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5">
      <h2 className="flex items-center gap-2 text-base font-bold text-slate-900">
        <Sparkles className="h-[18px] w-[18px]" style={{ color: 'var(--brand-700)' }} aria-hidden="true" />
        Why guests pick us
      </h2>

      {highlights?.length ? (
        <ul className="mt-3 space-y-2">
          {highlights.map((highlight) => (
            <li key={highlight} className="flex items-start gap-2 text-sm text-slate-700">
              <span
                className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full"
                style={{ backgroundColor: 'var(--brand-700)' }}
                aria-hidden="true"
              />
              {highlight}
            </li>
          ))}
        </ul>
      ) : null}

      {site.nearby.length ? (
        <>
          <h3 className="mt-4 text-xs font-semibold uppercase tracking-wide text-slate-400">
            Getting around
          </h3>
          <ul className="mt-2 space-y-1.5 text-sm">
            {site.nearby.slice(0, 4).map((place) => (
              <li key={place.id} className="flex items-start justify-between gap-3">
                <span className="text-slate-700">{place.name}</span>
                <span className="shrink-0 text-slate-500">
                  {place.distance_km ? `${place.distance_km} km` : (place.travel_time ?? '')}
                </span>
              </li>
            ))}
          </ul>
        </>
      ) : null}
    </section>
  );
}

export function ContactCard({ site }: { site: HotelSiteData }) {
  const { hotel } = site;
  if (!hotel.phone && !hotel.email) return null;

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5">
      <h2 className="text-base font-bold text-slate-900">Need a hand?</h2>
      <p className="mt-0.5 text-sm text-slate-500">
        The front desk can arrange early check-in, transport and special requests.
      </p>

      <dl className="mt-3 space-y-1.5 text-sm">
        <div className="flex justify-between gap-3">
          <dt className="text-slate-500">Check-in</dt>
          <dd className="font-medium text-slate-900">From {formatTime(hotel.check_in_time)}</dd>
        </div>
        <div className="flex justify-between gap-3">
          <dt className="text-slate-500">Check-out</dt>
          <dd className="font-medium text-slate-900">By {formatTime(hotel.check_out_time)}</dd>
        </div>
      </dl>

      <div className="mt-4 space-y-2">
        {hotel.phone ? (
          <a
            href={`tel:${hotel.phone}`}
            className="flex items-center gap-2.5 rounded-lg border border-slate-200 px-3 py-2.5 text-sm text-slate-700 transition hover:bg-slate-50"
          >
            <Phone className="h-4 w-4 shrink-0 text-slate-400" />
            <span className="truncate">{hotel.phone}</span>
          </a>
        ) : null}

        {hotel.email ? (
          <a
            href={`mailto:${hotel.email}`}
            className="flex items-center gap-2.5 rounded-lg border border-slate-200 px-3 py-2.5 text-sm text-slate-700 transition hover:bg-slate-50"
          >
            <Mail className="h-4 w-4 shrink-0 text-slate-400" />
            <span className="truncate">{hotel.email}</span>
          </a>
        ) : null}
      </div>
    </section>
  );
}
