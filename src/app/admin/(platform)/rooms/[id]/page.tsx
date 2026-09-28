import type { Metadata } from 'next';
import { getAdminSession, can } from '@/lib/auth/session';
import { NoAccess } from '@/components/admin/shared';
import { RoomTypeEditView } from '@/components/admin/views/RoomTypeEditView';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Room type · AQOSS CRM' };

export default async function RoomTypePage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams: { created?: string; saved?: string; failed?: string };
}) {
  const session = await getAdminSession();
  if (!can(session, 'rooms.read')) return <NoAccess />;

  return <RoomTypeEditView session={session!} roomTypeId={params.id} base="/admin/rooms" notice={searchParams} />;
}
