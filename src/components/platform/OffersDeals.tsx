'use client';

import { useMemo, useRef, useState } from 'react';
import { ArrowRight, ChevronLeft, ChevronRight, MapPin, Star, Tag } from 'lucide-react';
import { cn } from '@/lib/utils';

export type PlatformOffer = {
  id: string;
  type: string;
  headline: string;
  title: string;
  hotelName: string | null;
  code: string | null;
  href: string;
  image: string | null;
  /** For the phone card: the hotel, where it is, its rating and lowest nightly rate. */
  hotel: string | null;
  place: string | null;
  rating: number | null;
  reviews: number;
  fromRate: string | null;
};

const TYPE_LABEL: Record<string, string> = {
  PERCENTAGE: 'Hotel deal',
  FIXED: 'Flat discount',
  SEASONAL: 'Seasonal',
  EARLY_BIRD: 'Early bird',
  LAST_MINUTE: 'Last minute',
};

const BADGE: Record<string, string> = {
  PERCENTAGE: 'text-orange-600 bg-orange-50',
  FIXED: 'text-violet-700 bg-violet-50',
  SEASONAL: 'text-rose-600 bg-rose-50',
  EARLY_BIRD: 'text-sky-700 bg-sky-50',
  LAST_MINUTE: 'text-emerald-700 bg-emerald-50',
};

/** Offers & Deals: the hotels' live offers, filterable by kind, in a scroller. */
export function OffersDeals({ offers }: { offers: PlatformOffer[] }) {
  const [tab, setTab] = useState('ALL');
  const scroller = useRef<HTMLUListElement>(null);

  const tabs = useMemo(() => {
    const present = Array.from(new Set(offers.map((o) => o.type)));
    return [['ALL', 'All Offers'], ...present.map((t) => [t, TYPE_LABEL[t] ?? t] as const)];
  }, [offers]);

  const shown = tab === 'ALL' ? offers : offers.filter((o) => o.type === tab);

  const scroll = (dir: 1 | -1) => {
    const el = scroller.current;
    if (el) el.scrollBy({ left: dir * el.clientWidth * 0.8, behavior: 'smooth' });
  };

  return (
    <div>
      <div className="flex flex-wrap items-center gap-x-10 gap-y-3">
        <h2 className="text-2xl font-bold tracking-tight text-slate-900">Offers &amp; Deals</h2>
        <div className="order-last -mx-1 flex w-full gap-1 overflow-x-auto lg:order-none lg:w-auto lg:flex-1" role="tablist" aria-label="Offer type">
          {tabs.map(([value, label]) => (
            <button
              key={value}
              type="button"
              role="tab"
              aria-selected={tab === value}
              onClick={() => {
                setTab(value);
                scroller.current?.scrollTo({ left: 0 });
              }}
              className={cn(
                'whitespace-nowrap border-b-2 px-3 py-2 text-sm',
                tab === value ? 'border-blue-700 font-semibold text-blue-700' : 'border-transparent text-slate-600 hover:text-slate-900',
              )}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="ml-auto flex items-center gap-4 lg:ml-0">
          <a href="#hotels" className="inline-flex items-center gap-1 text-sm font-semibold text-blue-700 hover:underline">
            View All Hotels <ChevronRight className="h-4 w-4 sm:hidden" aria-hidden="true" />
          </a>
          <div className="hidden gap-2 sm:flex">
            <button type="button" onClick={() => scroll(-1)} aria-label="Previous offers" className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50">
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button type="button" onClick={() => scroll(1)} aria-label="More offers" className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50">
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      <ul ref={scroller} className="mt-6 flex snap-x snap-mandatory gap-5 overflow-x-auto pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {shown.map((o) => (
          <li key={o.id} className="w-[85%] shrink-0 snap-start sm:w-[calc(50%-10px)] lg:w-[calc(25%-15px)]">
            {/* Phones: photo on top with the offer on it, then the hotel. */}
            <a href={o.href} className="group flex h-full flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm sm:hidden">
              <span className="relative block h-36 bg-slate-200">
                {o.image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={o.image} alt="" loading="lazy" className="h-full w-full object-cover" />
                ) : null}
                <span className="absolute left-3 top-3 rounded-md bg-green-600 px-2 py-1 text-xs font-bold text-white shadow">{o.headline}</span>
              </span>
              <span className="flex flex-1 items-end justify-between gap-3 p-3.5">
                <span className="min-w-0">
                  <span className="block truncate font-semibold text-slate-900">{o.hotel ?? o.title}</span>
                  {o.place ? (
                    <span className="mt-1 flex items-center gap-1 text-xs text-slate-500">
                      <MapPin className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                      <span className="truncate">{o.place}</span>
                    </span>
                  ) : null}
                  {o.rating ? (
                    <span className="mt-1 flex items-center gap-1 text-xs text-slate-500">
                      <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" aria-hidden="true" />
                      <span className="font-semibold text-slate-800">{o.rating.toFixed(1)}</span> ({o.reviews} review{o.reviews === 1 ? '' : 's'})
                    </span>
                  ) : (
                    <span className="mt-1 block truncate text-xs text-slate-500">{o.title}</span>
                  )}
                </span>
                {o.fromRate ? (
                  <span className="shrink-0 text-right">
                    <span className="block text-[11px] text-slate-500">from</span>
                    <span className="block text-lg font-bold leading-tight text-slate-900">{o.fromRate}</span>
                    <span className="block text-[11px] text-slate-500">per night</span>
                  </span>
                ) : null}
              </span>
            </a>
            <a href={o.href} className="group hidden h-full overflow-hidden sm:flex rounded-2xl border border-slate-200 bg-gradient-to-br from-white to-slate-50 shadow-sm transition hover:shadow-md">
              <div className="flex min-w-0 flex-1 flex-col p-4">
                <span className={cn('self-start rounded px-2 py-1 text-[11px] font-bold uppercase tracking-wide', BADGE[o.type] ?? 'bg-slate-100 text-slate-700')}>
                  {TYPE_LABEL[o.type] ?? o.type}
                </span>
                <p className="mt-3 text-xl font-bold leading-tight text-slate-900">{o.headline}</p>
                <p className="mt-1 line-clamp-2 text-sm text-slate-600">{o.title}</p>
                {o.hotelName ? <p className="mt-1 truncate text-xs text-slate-500">{o.hotelName}</p> : null}
                {o.code ? (
                  <p className="mt-3 inline-flex items-center gap-1.5 self-start rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-600">
                    <Tag className="h-3.5 w-3.5" aria-hidden="true" />
                    Use Code: <span className="font-bold text-slate-900">{o.code}</span>
                  </p>
                ) : null}
                <span className="mt-auto inline-flex items-center gap-1.5 pt-4 text-sm font-semibold text-blue-700">
                  Book Now <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" aria-hidden="true" />
                </span>
              </div>
              {o.image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={o.image} alt="" loading="lazy" className="w-[42%] shrink-0 object-cover" />
              ) : null}
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}
