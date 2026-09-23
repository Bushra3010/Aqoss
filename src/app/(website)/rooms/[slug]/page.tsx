import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { getPublishedTenant } from '@/lib/tenant';
import { getHotelSiteData, getRoomType } from '@/services/hotel.service';
import { Gallery } from '@/components/website/Gallery';
import { formatCurrency, todayISO } from '@/lib/utils';

export const dynamic = 'force-dynamic';

/** SEO-friendly room page: hotel-a.com/rooms/deluxe-room (PRD §45). */
export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const tenant = await getPublishedTenant();
  if (!tenant) return { title: 'Room not found' };

  const room = await getRoomType(tenant.hotelId, params.slug);
  if (!room) return { title: 'Room not found' };

  return {
    title: room.name,
    description: room.description?.slice(0, 160) ?? `Book the ${room.name}.`,
  };
}

export default async function RoomDetailPage({ params }: { params: { slug: string } }) {
  const tenant = await getPublishedTenant();
  if (!tenant) notFound();

  const [site, room] = await Promise.all([
    getHotelSiteData(tenant.websiteId),
    getRoomType(tenant.hotelId, params.slug),
  ]);

  if (!site || !room) notFound();

  /* eslint-disable @typescript-eslint/no-explicit-any */
  const r = room as any;
  const images = (r.room_images ?? [])
    .slice()
    .sort((a: any, b: any) => a.sort_order - b.sort_order)
    .map((img: any, i: number) => ({
      id: `${i}`,
      url: img.url,
      alt_text: img.alt_text,
      caption: null,
      is_cover: img.is_cover,
      sort_order: img.sort_order,
    }));

  const amenities = (r.room_amenities ?? []).slice().sort((a: any, b: any) => a.sort_order - b.sort_order);
  const price = Number(r.base_price) * (1 - Number(r.discount_percent) / 100);

  return (
    <div className="container-page max-w-[1400px] py-8">
      <nav aria-label="Breadcrumb" className="text-sm text-slate-500">
        <Link href="/" className="hover:text-slate-800">{site.hotel.name}</Link>
        <span className="mx-1.5">/</span>
        <Link href="/rooms" className="hover:text-slate-800">Rooms</Link>
        <span className="mx-1.5">/</span>
        <span className="text-slate-700">{r.name}</span>
      </nav>

      <div className="mt-4 grid gap-10 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <h1 className="section-title">{r.name}</h1>
          <p className="mt-2 text-slate-600">
            Up to {r.max_adults} adult{r.max_adults > 1 ? 's' : ''}
            {r.max_children > 0 ? `, ${r.max_children} child${r.max_children > 1 ? 'ren' : ''}` : ''}
            {r.bed_type ? ` · ${r.bed_type}` : ''}
            {r.room_size_sqft ? ` · ${r.room_size_sqft} sq ft` : ''}
          </p>

          <div className="mt-6">
            <Gallery images={images} alt={r.name} />
          </div>

          {r.description ? (
            <div className="mt-8 space-y-3 leading-relaxed text-slate-700">
              {r.description.split('\n').filter(Boolean).map((p: string, i: number) => (
                <p key={i}>{p}</p>
              ))}
            </div>
          ) : null}

          {amenities.length ? (
            <>
              <h2 className="mt-8 text-lg font-semibold text-slate-900">Room amenities</h2>
              <ul className="mt-3 grid gap-2 sm:grid-cols-2">
                {amenities.map((a: any) => (
                  <li key={a.name} className="text-sm text-slate-700">✓ {a.name}</li>
                ))}
              </ul>
            </>
          ) : null}

          <h2 className="mt-8 text-lg font-semibold text-slate-900">Cancellation policy</h2>
          <p className="mt-2 text-sm text-slate-600">
            {r.cancellation_policy ??
              (r.is_refundable
                ? 'Free cancellation as per property policy.'
                : 'This rate is non-refundable.')}
          </p>
          {r.extra_bed_allowed ? (
            <p className="mt-2 text-sm text-slate-600">
              Extra bed available at {formatCurrency(Number(r.extra_bed_price), site.hotel.currency)} per night.
            </p>
          ) : null}
        </div>

        <aside>
          <div className="card sticky top-24 p-5">
            <p className="text-sm text-slate-500">Starting from</p>
            <p className="text-3xl font-bold text-slate-900">
              {formatCurrency(price, site.hotel.currency)}
            </p>
            <p className="text-xs text-slate-500">per night, plus taxes</p>

            <Link
              href={`/booking?${new URLSearchParams({
                room_type_id: r.id,
                check_in: todayISO(),
                check_out: todayISO(1),
                adults: String(Math.min(r.max_adults, 2)),
                children: '0',
                rooms: '1',
              }).toString()}`}
              className="mt-4 block rounded-lg bg-green-700 px-4 py-3 text-center text-sm font-bold text-white transition hover:bg-green-800"
            >
              Book This Now
            </Link>

            <p className="mt-3 text-center text-xs text-slate-500">
              Or change your dates in the search bar above.
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}
