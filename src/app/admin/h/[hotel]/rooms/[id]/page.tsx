import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { can } from '@/lib/auth/session';
import { getHotelPanel, hotelPanelPath } from '@/lib/admin/hotel-panel';
import { NoAccess } from '@/components/admin/shared';
import { RoomTypeEditView } from '@/components/admin/views/RoomTypeEditView';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Room type · Hotel admin' };

export default async function HotelRoomTypePage({
  params,
  searchParams,
}: {
  params: { hotel: string; id: string };
  searchParams: { created?: string; saved?: string; failed?: string };
}) {
  const panel = await getHotelPanel(params.hotel);
  if (!panel) notFound();
  if (!can(panel.session, 'rooms.read')) return <NoAccess />;

  return (
    <RoomTypeEditView
      session={panel.session}
      roomTypeId={params.id}
      hotelId={panel.hotel.id}
      base={hotelPanelPath(panel.hotel.slug, 'rooms')}
      notice={searchParams}
    />
  );
}
