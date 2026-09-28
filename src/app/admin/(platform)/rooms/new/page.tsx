import type { Metadata } from 'next';
import { getAdminSession, can } from '@/lib/auth/session';
import { listPanelHotels } from '@/lib/admin/hotel-panel';
import { NoAccess, PageHeader } from '@/components/admin/shared';
import { RoomTypeForm } from '@/components/admin/RoomTypeForm';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Add room type · AQOSS CRM' };

export default async function NewRoomTypePage({ searchParams }: { searchParams: { hotel?: string } }) {
  const session = await getAdminSession();
  if (!can(session, 'rooms.write')) return <NoAccess />;

  const hotels = (await listPanelHotels(session!)).map(({ id, name }) => ({ id, name }));
  const preset = hotels.find((h) => h.id === searchParams.hotel);

  return (
    <>
      <PageHeader title="Add room type" description="A new kind of room at one of your hotels. It is bookable as soon as it is active." />
      <RoomTypeForm hotel={preset} hotels={hotels} returnBase="/admin/rooms" cancelHref="/admin/rooms" />
    </>
  );
}
