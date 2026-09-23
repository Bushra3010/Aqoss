import Link from 'next/link';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { can } from '@/lib/auth/session';
import { createAdminSupabase } from '@/lib/supabase/admin';
import { getHotelPanel, hotelPanelPath } from '@/lib/admin/hotel-panel';
import { listImages } from '@/services/image.service';
import { NoAccess, PageHeader } from '@/components/admin/shared';
import { ImageManager } from '@/components/admin/ImageManager';
import { Alert } from '@/components/ui';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Room photos · Hotel admin' };

export default async function RoomImagesPage({
  params,
  searchParams,
}: {
  params: { hotel: string; roomType: string };
  searchParams: { created?: string; failed?: string };
}) {
  const panel = await getHotelPanel(params.hotel);
  if (!panel) notFound();
  if (!can(panel.session, 'rooms.read')) return <NoAccess />;

  const { hotel, session } = panel;
  const { data: roomType } = await createAdminSupabase()
    .from('room_types')
    .select('id, name, hotel_id')
    .eq('id', params.roomType)
    .maybeSingle();
  // A room type from another hotel does not exist as far as this panel is concerned.
  if (!roomType || roomType.hotel_id !== hotel.id) notFound();

  const images = await listImages('room', roomType.id);

  return (
    <>
      <PageHeader
        title={`${roomType.name} photos`}
        description="Shown on the room card and the room's own page."
        action={
          <>
            <Link href={hotelPanelPath(hotel.slug, 'rooms')} className="btn-outline">
              Rooms
            </Link>
            <Link href={hotelPanelPath(hotel.slug, 'images')} className="btn-ghost">
              All photos
            </Link>
          </>
        }
      />
      {searchParams.created ? (
        <div className="mb-4">
          <Alert tone="success">
            {roomType.name} is created and open for booking.{' '}
            {images.length
              ? `${images.length} photo${images.length > 1 ? 's' : ''} added.`
              : 'Add a few photos so guests can see it.'}
          </Alert>
          {Number(searchParams.failed) > 0 ? (
            <div className="mt-3">
              <Alert>
                {searchParams.failed} photo{Number(searchParams.failed) > 1 ? 's' : ''} could not be uploaded. Add{' '}
                {Number(searchParams.failed) > 1 ? 'them' : 'it'} again below.
              </Alert>
            </div>
          ) : null}
        </div>
      ) : null}
      <ImageManager
        kind="room"
        ownerId={roomType.id}
        images={images}
        canWrite={can(session, 'rooms.write')}
        altPrefix={`${roomType.name} at ${hotel.name}`}
      />
    </>
  );
}
