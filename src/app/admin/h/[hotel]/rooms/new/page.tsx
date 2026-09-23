import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { can } from '@/lib/auth/session';
import { getHotelPanel, hotelPanelPath } from '@/lib/admin/hotel-panel';
import { NoAccess, PageHeader } from '@/components/admin/shared';
import { RoomTypeForm } from '@/components/admin/RoomTypeForm';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Add room type · Hotel admin' };

export default async function NewRoomTypePage({ params }: { params: { hotel: string } }) {
  const panel = await getHotelPanel(params.hotel);
  if (!panel) notFound();
  if (!can(panel.session, 'rooms.write')) return <NoAccess />;

  return (
    <>
      <PageHeader
        title="Add room type"
        description={`A new kind of room at ${panel.hotel.name} — e.g. "Deluxe Sea View". It appears on the website as soon as it is active.`}
      />
      <RoomTypeForm hotelId={panel.hotel.id} cancelHref={hotelPanelPath(panel.hotel.slug, 'rooms')} />
    </>
  );
}
