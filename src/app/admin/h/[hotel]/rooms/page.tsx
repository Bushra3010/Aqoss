import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { can } from '@/lib/auth/session';
import { getHotelPanel, hotelPanelPath } from '@/lib/admin/hotel-panel';
import { NoAccess } from '@/components/admin/shared';
import { RoomsView } from '@/components/admin/views/RoomsView';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Rooms · Hotel admin' };

export default async function HotelRoomsPage({ params }: { params: { hotel: string } }) {
  const panel = await getHotelPanel(params.hotel);
  if (!panel) notFound();
  if (!can(panel.session, 'rooms.read')) return <NoAccess />;

  const { hotel } = panel;
  return (
    <RoomsView
      session={panel.session}
      searchParams={{}}
      hotelId={hotel.id}
      panel={{
        imagesHref: (id) => hotelPanelPath(hotel.slug, `images/rooms/${id}`),
        pricingHref: hotelPanelPath(hotel.slug, 'pricing'),
        newHref: can(panel.session, 'rooms.write') ? hotelPanelPath(hotel.slug, 'rooms/new') : undefined,
      }}
    />
  );
}
