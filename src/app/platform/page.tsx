import type { Metadata } from 'next';
import {
  ArrowRight,
  BarChart3,
  BrainCircuit,
  Building2,
  CalendarCheck,
  Clock3,
  Home,
  MapPin,
  Megaphone,
  MessageSquareHeart,
  MonitorPlay,
  MousePointerClick,
  Percent,
} from 'lucide-react';
import { createAdminSupabase } from '@/lib/supabase/admin';
import { websiteUrl } from '@/lib/site-url';
import { Accelerator } from '@/components/platform/Accelerator';
import { Solutions } from '@/components/platform/Solutions';
import { AboutDemo } from '@/components/platform/AboutDemo';
import { HeroSearch, type HeroSearchValues } from '@/components/platform/HeroSearch';
import { OffersDeals, type PlatformOffer } from '@/components/platform/OffersDeals';
import { formatCurrency, todayISO } from '@/lib/utils';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = {
  title: { absolute: 'AQOSS — AI software that accelerates your hotel' },
  description:
    'AQOSS gives hotels an AI-powered website, marketing, sales, booking engine and reputation management — run from one place.',
};

const QUICK_LINKS = [
  { href: '#book-demo', icon: Home, title: 'List Your Property', text: 'Grow your hotel business', tint: 'text-amber-500' },
  { href: '#marketing', icon: Megaphone, title: 'AI Marketing', text: 'Reach more guests', tint: 'text-blue-600' },
  { href: '#booking', icon: CalendarCheck, title: 'Booking Engine', text: 'Commission-free bookings', tint: 'text-violet-600' },
  { href: '#reputation', icon: MessageSquareHeart, title: 'Reputation', text: 'Reviews from real guests', tint: 'text-rose-500' },
];

const WHY = [
  { icon: BrainCircuit, title: 'AI-Powered Solutions', text: 'Smart automation for hotels' },
  { icon: MousePointerClick, title: 'Increase Direct Bookings', text: 'Reduce OTA dependency' },
  { icon: MessageSquareHeart, title: 'Boost Online Reputation', text: 'Reviews from verified stays' },
  { icon: BarChart3, title: 'Data-Driven Insights', text: 'Reports on bookings and revenue' },
];

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

/** Read the hero search from the URL, never trusting it beyond its shape. */
function readSearch(params: Record<string, string | string[] | undefined>): HeroSearchValues {
  const one = (key: string) => {
    const v = params[key];
    return (Array.isArray(v) ? v[0] : v) ?? '';
  };
  const count = (key: string, min: number, max: number, fallback: number) => {
    const n = Number.parseInt(one(key), 10);
    return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : fallback;
  };
  const today = todayISO();
  let checkIn = ISO_DATE.test(one('check_in')) && one('check_in') >= today ? one('check_in') : '';
  let checkOut = ISO_DATE.test(one('check_out')) ? one('check_out') : '';
  if (!checkIn || !checkOut || checkOut <= checkIn) {
    checkIn = '';
    checkOut = '';
  }
  return {
    q: one('q').trim().slice(0, 80),
    checkIn,
    checkOut,
    adults: count('adults', 1, 12, 2),
    children: count('children', 0, 8, 0),
    rooms: count('rooms', 1, 6, 1),
  };
}

/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * The AQOSS website on the main domain (aqoss.com). Hotel websites live on its
 * subdomains; middleware sends the main domain's home page here.
 */
export default async function PlatformHome({ searchParams }: { searchParams: Record<string, string | string[] | undefined> }) {
  const search = readSearch(searchParams);
  const supabase = createAdminSupabase();
  const today = todayISO();

  const [websitesRes, offersRes, couponsRes] = await Promise.all([
    supabase
      .from('websites')
      .select('slug, hotel_id, hotels!inner (id, name, city, state, address_line1, star_rating, hotel_images (url, is_cover, sort_order))')
      .eq('status', 'ACTIVE')
      .order('name')
      .limit(500),
    supabase
      .from('offers')
      .select('id, hotel_id, title, offer_type, discount_percent, discount_amount, valid_from, valid_until, sort_order')
      .eq('is_active', true)
      .order('sort_order')
      .limit(200),
    supabase
      .from('coupons')
      .select('code, offer_id, valid_from, valid_until, usage_limit, used_count')
      .eq('is_active', true)
      .limit(500),
  ]);

  const allHotels = ((websitesRes.data ?? []) as any[]).map((w) => {
    const hotel = Array.isArray(w.hotels) ? w.hotels[0] : w.hotels;
    const images = [...(hotel?.hotel_images ?? [])].sort((a: any, b: any) => a.sort_order - b.sort_order);
    return {
      slug: w.slug as string,
      hotelId: w.hotel_id as string,
      name: hotel?.name as string,
      city: hotel?.city as string | null,
      state: hotel?.state as string | null,
      address: hotel?.address_line1 as string | null,
      stars: hotel?.star_rating as number | null,
      cover: (images.find((i: any) => i.is_cover) ?? images[0])?.url as string | undefined,
    };
  });

  // A hotel opens on its own website with the searched dates, where
  // availability and price are worked out — never here.
  const stay = search.checkIn
    ? `/?${new URLSearchParams({
        check_in: search.checkIn,
        check_out: search.checkOut,
        adults: String(search.adults),
        children: String(search.children),
        rooms: String(search.rooms),
      })}#rooms`
    : '';
  const hotelHref = (slug: string) => `${websiteUrl(slug)}${stay}`;

  const needle = search.q.toLowerCase();
  const hotels = needle
    ? allHotels.filter((h) => [h.name, h.city, h.state, h.address].some((v) => v?.toLowerCase().includes(needle)))
    : allHotels.slice(0, 6);
  const cityCount = new Set(allHotels.map((h) => h.city?.trim().toLowerCase()).filter(Boolean)).size;

  // Offers: live ones from hotels whose website is public, plus platform-wide
  // ones. A coupon is shown only if it is linked to the offer and usable now.
  const now = new Date().toISOString();
  const codeFor = new Map<string, string>();
  for (const c of (couponsRes.data ?? []) as any[]) {
    const usable =
      c.offer_id &&
      (!c.valid_from || c.valid_from <= now) &&
      (!c.valid_until || c.valid_until >= now) &&
      (c.usage_limit == null || c.used_count < c.usage_limit);
    if (usable && !codeFor.has(c.offer_id)) codeFor.set(c.offer_id, String(c.code).toUpperCase());
  }
  const bySiteHotel = new Map(allHotels.map((h) => [h.hotelId, h]));
  const liveOffers = ((offersRes.data ?? []) as any[])
    .filter((o) => (!o.valid_from || o.valid_from <= today) && (!o.valid_until || o.valid_until >= today))
    .filter((o) => o.hotel_id == null || bySiteHotel.has(o.hotel_id));
  // Take the kinds of offer in turn so the strip isn't sixteen copies of the
  // same deal from different hotels.
  const byType = new Map<string, any[]>();
  for (const o of liveOffers) byType.set(o.offer_type, [...(byType.get(o.offer_type) ?? []), o]);
  const queues = Array.from(byType.values());
  const mixed: any[] = [];
  while (mixed.length < 16 && queues.some((q) => q.length)) {
    for (const q of queues) if (q.length && mixed.length < 16) mixed.push(q.shift());
  }
  // For the cards: each offer hotel's lowest published nightly rate and its
  // approved-review rating — read as stored, the same figures its own website
  // shows. Discounted prices are never worked out here (the booking engine
  // prices a stay); the card shows the offer beside the rate.
  const offerHotelIds = Array.from(new Set(mixed.map((o) => o.hotel_id).filter(Boolean)));
  const [ratesRes, reviewsRes] = offerHotelIds.length
    ? await Promise.all([
        supabase.from('room_types').select('hotel_id, base_price').in('hotel_id', offerHotelIds).eq('is_active', true),
        supabase.from('reviews').select('hotel_id, rating').in('hotel_id', offerHotelIds).eq('status', 'APPROVED'),
      ])
    : [{ data: [] }, { data: [] }];
  const fromRate = new Map<string, number>();
  for (const r of (ratesRes.data ?? []) as any[]) {
    const price = Number(r.base_price);
    if (!fromRate.has(r.hotel_id) || price < fromRate.get(r.hotel_id)!) fromRate.set(r.hotel_id, price);
  }
  const ratings = new Map<string, { sum: number; count: number }>();
  for (const r of (reviewsRes.data ?? []) as any[]) {
    const t = ratings.get(r.hotel_id) ?? { sum: 0, count: 0 };
    t.sum += Number(r.rating);
    t.count += 1;
    ratings.set(r.hotel_id, t);
  }

  const offers: PlatformOffer[] = mixed
    .map((o) => {
      const hotel = o.hotel_id ? bySiteHotel.get(o.hotel_id) : undefined;
      const rating = o.hotel_id ? ratings.get(o.hotel_id) : undefined;
      return {
        id: o.id,
        type: o.offer_type,
        headline:
          o.discount_percent != null
            ? `${Number(o.discount_percent)}% OFF`
            : `Save ${formatCurrency(Number(o.discount_amount))}`,
        title: o.title,
        hotelName: hotel ? `${hotel.name}${hotel.city ? `, ${hotel.city}` : ''}` : 'At AQOSS hotels',
        code: codeFor.get(o.id) ?? null,
        href: hotel ? hotelHref(hotel.slug) : '#hotels',
        image: hotel?.cover ?? '/platform/hero.jpg',
        hotel: hotel?.name ?? null,
        // "Goa", not "Goa, Goa" when the city and state share a name.
        place: hotel ? Array.from(new Set([hotel.city, hotel.state].filter(Boolean))).join(', ') || null : null,
        rating: rating ? Math.round((rating.sum / rating.count) * 10) / 10 : null,
        reviews: rating?.count ?? 0,
        fromRate: o.hotel_id && fromRate.has(o.hotel_id) ? formatCurrency(fromRate.get(o.hotel_id)!) : null,
      };
    });

  const badges = [
    { icon: Clock3, title: '24/7 Online Booking', text: 'Always open for guests' },
    { icon: Building2, title: `${allHotels.length} Hotel${allHotels.length === 1 ? '' : 's'} on AQOSS`, text: `Across ${cityCount} cit${cityCount === 1 ? 'y' : 'ies'}` },
    { icon: Percent, title: 'Commission-free', text: 'Direct bookings, every time' },
  ];

  return (
    <>
        {/* ---- Hero ------------------------------------------------------ */}
        <section className="relative isolate overflow-hidden bg-[#0B1F3A] max-sm:-mt-[72px]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/platform/hero.jpg" alt="" className="absolute inset-0 -z-10 h-full w-full object-cover object-[center_40%]" />
          <div className="absolute inset-0 -z-10 bg-gradient-to-r from-[#081A33]/80 via-[#081A33]/40 to-transparent" aria-hidden="true" />
          <div className="absolute inset-x-0 bottom-0 -z-10 h-1/3 bg-gradient-to-t from-[#081A33]/50 to-transparent" aria-hidden="true" />

          <div className="mx-auto max-w-7xl px-4 pb-20 pt-10 max-sm:pt-[104px] sm:px-6 sm:pt-12">
            <div className="flex flex-col gap-8 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <h1 className="max-w-[680px] text-4xl font-bold leading-[1.15] tracking-tight text-white drop-shadow sm:text-[44px]">
                  AI-Powered Hotel Solutions for Modern Hoteliers
                </h1>
                <p className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-1 text-base font-medium text-white/95 sm:text-lg">
                  {['Website', 'Marketing', 'Booking Engine', 'Reputation', 'Sales'].map((item, i) => (
                    <span key={item} className="flex items-center gap-3">
                      {i ? <span className="h-1 w-1 rounded-full bg-white" aria-hidden="true" /> : null}
                      {item}
                    </span>
                  ))}
                </p>
              </div>
              <ul className="grid grid-cols-3 gap-2 sm:flex sm:flex-wrap sm:gap-3 lg:max-w-[460px] lg:justify-end xl:max-w-[520px]">
                {badges.map((b) => (
                  <li key={b.title} className="flex flex-col items-start gap-1.5 rounded-xl border border-white/25 bg-white/15 px-2.5 py-2.5 text-white backdrop-blur-md sm:flex-row sm:items-center sm:gap-3 sm:px-4">
                    <b.icon className="h-5 w-5 shrink-0" aria-hidden="true" />
                    <span className="min-w-0">
                      <span className="block text-xs font-semibold leading-tight sm:text-sm">{b.title}</span>
                      <span className="mt-0.5 block text-[11px] leading-tight text-white/75 sm:mt-0 sm:text-xs">{b.text}</span>
                    </span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="mt-10">
              <HeroSearch initial={{ ...search, checkIn: search.checkIn || todayISO(1), checkOut: search.checkOut || todayISO(2) }} />
            </div>
          </div>
        </section>

        {/* ---- Quick links ---------------------------------------------- */}
        <div className="relative z-10 mx-auto -mt-10 max-w-6xl px-4 sm:px-6">
          {/* Phones: five upright tiles across. md up: one bar of five. */}
          <ul className="grid grid-cols-5 gap-1 rounded-2xl border border-slate-200 bg-white p-1.5 shadow-lg shadow-slate-900/5 md:gap-0 md:divide-x md:divide-slate-100 md:p-3">
            {QUICK_LINKS.map((q, i) => (
              <li key={q.title} className="min-w-0">
                <a
                  href={q.href}
                  className={`flex h-full flex-col items-center gap-1.5 rounded-xl px-1 py-2.5 text-center hover:bg-slate-50 md:flex-row md:gap-3 md:px-4 md:py-3 md:text-left ${i === 0 ? 'max-md:bg-blue-50/70' : ''}`}
                >
                  <q.icon className={`h-6 w-6 shrink-0 md:h-7 md:w-7 ${q.tint}`} aria-hidden="true" />
                  <span className="min-w-0">
                    <span className="block text-[11px] font-semibold leading-tight text-slate-900 md:truncate md:text-sm">{q.title}</span>
                    <span className="mt-0.5 block text-[10px] leading-tight text-slate-500 md:mt-0 md:truncate md:text-xs">{q.text}</span>
                  </span>
                </a>
              </li>
            ))}
            <li className="min-w-0 md:pl-3">
              <a href="#book-demo" className="flex h-full flex-col items-center gap-1.5 rounded-xl border border-blue-200 bg-blue-50/60 px-1 py-2.5 text-center hover:bg-blue-50 md:flex-row md:gap-3 md:px-4 md:py-3 md:text-left">
                <MonitorPlay className="h-6 w-6 shrink-0 text-blue-700 md:h-7 md:w-7" aria-hidden="true" />
                <span className="min-w-0">
                  <span className="block text-[11px] font-semibold leading-tight text-blue-800 md:text-sm">Book a Demo</span>
                  <span className="mt-0.5 block text-[10px] leading-tight text-slate-500 md:mt-0 md:text-xs">See AQOSS in Action</span>
                </span>
              </a>
            </li>
          </ul>
        </div>

        {/* ---- Offers & deals ------------------------------------------- */}
        {offers.length ? (
          <section id="offers" className="scroll-mt-20">
            <div className="mx-auto max-w-7xl px-4 pb-6 pt-14 sm:px-6">
              <OffersDeals offers={offers} />
            </div>
          </section>
        ) : null}

        {/* ---- Why AQOSS ------------------------------------------------ */}
        <section id="why-aqoss" className="scroll-mt-20">
          <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-12 sm:px-6 lg:flex-row lg:items-center">
            <h2 className="shrink-0 text-2xl font-bold leading-tight tracking-tight text-slate-900 lg:w-40">Why Choose AQOSS?</h2>
            <ul className="grid flex-1 gap-6 rounded-2xl border border-slate-200 bg-white px-6 py-6 shadow-sm sm:grid-cols-2 lg:grid-cols-4">
              {WHY.map((w) => (
                <li key={w.title} className="flex items-center gap-4">
                  <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-blue-50 text-blue-700">
                    <w.icon className="h-6 w-6" aria-hidden="true" />
                  </span>
                  <span>
                    <span className="block text-[15px] font-semibold text-slate-900">{w.title}</span>
                    <span className="block text-sm text-slate-500">{w.text}</span>
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* ---- Hotels on AQOSS / search results ------------------------- */}
        <section id="hotels" className="scroll-mt-20 bg-slate-50">
          <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
            {search.q ? (
              <>
                <h2 className="text-2xl font-bold tracking-tight text-slate-900">
                  {hotels.length} hotel{hotels.length === 1 ? '' : 's'} for &ldquo;{search.q}&rdquo;
                </h2>
                <p className="mt-2 text-slate-600">
                  Each one opens on its own website{search.checkIn ? ' with your dates, where you can pick a room' : ''}.{' '}
                  <a href="/#hotels" className="font-semibold text-blue-700 hover:underline">Clear search</a>
                </p>
              </>
            ) : (
              <>
                <h2 className="text-2xl font-bold tracking-tight text-slate-900">Hotels running on AQOSS</h2>
                <p className="mt-2 text-slate-600">Every hotel gets its own website on an AQOSS address. Take a look:</p>
              </>
            )}
            {hotels.length ? (
              <ul className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {hotels.map((h) => (
                  <li key={h.slug}>
                    <a href={hotelHref(h.slug)} className="group block overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:shadow-md">
                      <div className="aspect-[16/9] bg-slate-200">
                        {h.cover ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={h.cover} alt="" className="h-full w-full object-cover transition group-hover:scale-[1.02]" loading="lazy" />
                        ) : null}
                      </div>
                      <div className="p-4">
                        <p className="font-semibold text-slate-900">{h.name}</p>
                        <p className="mt-0.5 flex items-center gap-1 text-sm text-slate-500">
                          <MapPin className="h-3.5 w-3.5" aria-hidden="true" />
                          {h.city}
                          {h.stars ? ` · ${h.stars}★` : ''}
                        </p>
                        <p className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-blue-700">
                          {search.checkIn ? 'See rooms' : 'Visit website'}
                          <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" aria-hidden="true" />
                        </p>
                      </div>
                    </a>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-8 rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center text-slate-600">
                No AQOSS hotel matches that yet — try a city or a different name.
              </p>
            )}
          </div>
        </section>

        {/* ---- Hotel Productivity Accelerator ----------------------------- */}
        <Accelerator />

        {/* ---- The five solutions --------------------------------------- */}
        <Solutions />

        {/* ---- About + Book demo ---------------------------------------- */}
        <AboutDemo />
    </>
  );
}
