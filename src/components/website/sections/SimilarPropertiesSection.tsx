import { Star } from 'lucide-react';
import { createAdminSupabase } from '@/lib/supabase/admin';
import { formatCurrency } from '@/lib/utils';
import type { HotelSiteData } from '@/types';

/**
 * Other published properties nearby (PRD §24 cross-linking).
 *
 * Each result links to that hotel's own website — every property on the
 * platform has one, so this is a link out rather than a second listing page.
 */
export async function SimilarPropertiesSection({
  site,
  rootDomain,
}: {
  site: HotelSiteData;
  rootDomain: string;
}) {
  const { data } = await createAdminSupabase()
    .from('hotels')
    .select(
      'id, name, city, state, star_rating, currency, hotel_images (url, is_cover), room_types (base_price, discount_percent, is_active), websites (slug, status)',
    )
    .eq('status', 'ACTIVE')
    .neq('id', site.hotel.id)
    .limit(60);

  /* eslint-disable @typescript-eslint/no-explicit-any */
  const all = (data ?? []) as any[];

  // Same city first, then the same state, so the section is rarely empty.
  const nearby = [
    ...all.filter((h) => h.city && h.city === site.hotel.city),
    ...all.filter((h) => h.state === site.hotel.state && h.city !== site.hotel.city),
  ].slice(0, 6);

  return (
    <section
      id="similar-properties"
      className="scroll-mt-28 rounded-xl border border-slate-200 bg-white p-5"
    >
      <h2 className="text-xl font-bold text-slate-900">Similar properties</h2>
      <p className="mt-1 text-sm text-slate-500">
        Other places to stay {site.hotel.city ? `in and around ${site.hotel.city}` : 'nearby'}.
      </p>

      {nearby.length === 0 ? (
        <p className="mt-4 text-sm text-slate-500">
          No other published properties nearby just yet.
        </p>
      ) : (
        <ul className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {nearby.map((hotel) => {
            const website = (hotel.websites ?? []).find((w: any) => w.status === 'ACTIVE');
            if (!website) return null;

            const cover =
              hotel.hotel_images?.find((i: any) => i.is_cover)?.url ??
              hotel.hotel_images?.[0]?.url ??
              null;

            const active = (hotel.room_types ?? []).filter((r: any) => r.is_active);
            const from = active.length
              ? Math.min(
                  ...active.map(
                    (r: any) => Number(r.base_price) * (1 - Number(r.discount_percent) / 100),
                  ),
                )
              : null;

            return (
              <li key={hotel.id}>
                <a
                  href={`//${website.slug}.${rootDomain}`}
                  className="group block overflow-hidden rounded-xl border border-slate-200 transition hover:border-slate-300 hover:shadow-sm"
                >
                  <span className="block aspect-[4/3] bg-slate-100">
                    {cover ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={cover}
                        alt=""
                        className="h-full w-full object-cover transition group-hover:scale-[1.03]"
                        loading="lazy"
                      />
                    ) : null}
                  </span>

                  <span className="block p-4">
                    <span className="block truncate font-semibold text-slate-900">{hotel.name}</span>
                    <span className="mt-0.5 flex items-center gap-2 text-sm text-slate-500">
                      {[hotel.city, hotel.state].filter(Boolean).join(', ')}
                      {hotel.star_rating ? (
                        <span className="inline-flex items-center gap-0.5">
                          <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                          {hotel.star_rating}
                        </span>
                      ) : null}
                    </span>
                    {from ? (
                      <span className="mt-2 block text-sm text-slate-500">
                        From{' '}
                        <span className="font-bold text-slate-900">
                          {formatCurrency(from, hotel.currency)}
                        </span>{' '}
                        / night
                      </span>
                    ) : null}
                  </span>
                </a>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
