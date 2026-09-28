import Link from 'next/link';
import { notFound } from 'next/navigation';
import { can, canAccessHotel, type AdminSession } from '@/lib/auth/session';
import { createAdminSupabase } from '@/lib/supabase/admin';
import { getRoomType } from '@/services/room-type.service';
import { listImages } from '@/services/image.service';
import { websiteUrl } from '@/lib/site-url';
import { NoAccess, PageHeader } from '@/components/admin/shared';
import { RoomTypeForm } from '@/components/admin/RoomTypeForm';
import { ImageManager } from '@/components/admin/ImageManager';
import { Alert, StatusBadge } from '@/components/ui';

/**
 * One room type: its details, then its photos. `hotelId` is set when opened
 * from a hotel's panel — a room from any other hotel is a 404 there.
 */
export async function RoomTypeEditView({
  session,
  roomTypeId,
  hotelId,
  base,
  notice,
}: {
  session: AdminSession;
  roomTypeId: string;
  hotelId?: string;
  /** The rooms list this page belongs to, e.g. `/admin/rooms`. */
  base: string;
  notice?: { created?: string; saved?: string; failed?: string };
}) {
  const roomType = await getRoomType(roomTypeId);
  if (!roomType || (hotelId && roomType.hotel_id !== hotelId)) notFound();
  if (!canAccessHotel(session, roomType.hotel_id)) return <NoAccess />;

  const [{ data: hotel }, images] = await Promise.all([
    createAdminSupabase()
      .from('hotels')
      .select('id, name, websites (slug, status)')
      .eq('id', roomType.hotel_id)
      .maybeSingle(),
    listImages('room', roomType.id),
  ]);

  /* eslint-disable @typescript-eslint/no-explicit-any */
  const site = ((hotel as any)?.websites ?? []).find((w: any) => w.status === 'ACTIVE');
  const canWrite = can(session, 'rooms.write');
  const failed = Number(notice?.failed) || 0;

  return (
    <>
      <PageHeader
        title={roomType.name}
        description={`${hotel?.name ?? ''} · /${roomType.slug}`}
        action={
          <>
            <StatusBadge status={roomType.is_active ? 'ACTIVE' : 'INACTIVE'} />
            {site && roomType.is_active ? (
              <a href={`${websiteUrl(site.slug)}/rooms/${roomType.slug}`} target="_blank" rel="noreferrer" className="btn-outline">
                View on website
              </a>
            ) : null}
            <Link href={base} className="btn-ghost">All rooms</Link>
          </>
        }
      />

      <div className="space-y-4">
        {notice?.created ? (
          <Alert tone="success">
            {roomType.name} is created and open for booking.{' '}
            {images.length
              ? `${images.length} photo${images.length > 1 ? 's' : ''} added.`
              : 'Add a few photos below so guests can see it.'}
          </Alert>
        ) : null}
        {notice?.saved ? <Alert tone="success">Changes saved.</Alert> : null}
        {failed ? (
          <Alert>
            {failed} photo{failed > 1 ? 's' : ''} could not be uploaded. Add {failed > 1 ? 'them' : 'it'} again below.
          </Alert>
        ) : null}

        {canWrite ? (
          <RoomTypeForm
            key={`${roomType.id}-${notice?.saved ?? ''}`}
            hotel={{ id: roomType.hotel_id, name: hotel?.name ?? '' }}
            roomType={roomType}
            returnBase={base}
            cancelHref={base}
          />
        ) : null}

        <section id="photos" className="scroll-mt-24 rounded-2xl border border-slate-200 bg-white p-5">
          <h2 className="text-base font-bold text-slate-900">Photos</h2>
          <p className="mb-4 text-sm text-slate-500">The first photo is the cover on the room card.</p>
          <ImageManager
            kind="room"
            ownerId={roomType.id}
            images={images}
            canWrite={canWrite}
            altPrefix={`${roomType.name} at ${hotel?.name ?? ''}`}
          />
        </section>
      </div>
    </>
  );
}
