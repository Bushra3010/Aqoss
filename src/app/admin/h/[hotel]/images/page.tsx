import Link from 'next/link';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { can } from '@/lib/auth/session';
import { createAdminSupabase } from '@/lib/supabase/admin';
import { getHotelPanel, hotelPanelPath } from '@/lib/admin/hotel-panel';
import { listImages } from '@/services/image.service';
import { NoAccess, PageHeader } from '@/components/admin/shared';
import { ImageManager } from '@/components/admin/ImageManager';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Photos · Hotel admin' };

/** Property photos, plus a way into each room type's own gallery. */
export default async function HotelImagesPage({ params }: { params: { hotel: string } }) {
  const panel = await getHotelPanel(params.hotel);
  if (!panel) notFound();
  if (!can(panel.session, 'hotels.read')) return <NoAccess />;

  const { hotel, session } = panel;
  const [images, { data: roomTypes }] = await Promise.all([
    listImages('hotel', hotel.id),
    createAdminSupabase()
      .from('room_types')
      .select('id, name, is_active, room_images (url, is_cover)')
      .eq('hotel_id', hotel.id)
      .order('sort_order'),
  ]);

  /* eslint-disable @typescript-eslint/no-explicit-any */
  const rooms = (roomTypes ?? []) as any[];

  return (
    <>
      <PageHeader
        title="Photos"
        description="The cover photo leads the gallery on the website and in search results. Order here is the order guests see."
      />

      <section className="mb-8">
        <h2 className="mb-3 text-base font-bold text-slate-900">Property photos</h2>
        <ImageManager
          kind="hotel"
          ownerId={hotel.id}
          images={images}
          canWrite={can(session, 'hotels.write')}
          altPrefix={hotel.name}
        />
      </section>

      <section>
        <h2 className="mb-3 text-base font-bold text-slate-900">Room photos</h2>
        {rooms.length ? (
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {rooms.map((rt) => {
              const cover = rt.room_images?.find((i: any) => i.is_cover) ?? rt.room_images?.[0];
              return (
                <li key={rt.id}>
                  <Link
                    href={hotelPanelPath(hotel.slug, `images/rooms/${rt.id}`)}
                    className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-3 transition hover:border-slate-300"
                  >
                    <span className="h-16 w-20 shrink-0 overflow-hidden rounded-lg bg-slate-100">
                      {cover ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={cover.url} alt="" className="h-full w-full object-cover" />
                      ) : null}
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate font-semibold text-slate-900">{rt.name}</span>
                      <span className="text-sm text-slate-500">
                        {rt.room_images?.length ?? 0} photo{rt.room_images?.length === 1 ? '' : 's'}
                        {rt.is_active ? '' : ' · inactive'}
                      </span>
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="text-sm text-slate-500">This hotel has no room types yet.</p>
        )}
      </section>
    </>
  );
}
