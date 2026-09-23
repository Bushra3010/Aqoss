import type { Metadata } from 'next';
import { getAdminSession, can } from '@/lib/auth/session';
import { NoAccess } from '@/components/admin/shared';
import { RoomsView } from '@/components/admin/views/RoomsView';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Rooms · AQOSS CRM' };

export default async function AdminRoomsPage({ searchParams }: { searchParams: { hotel?: string } }) {
  const session = await getAdminSession();
  if (!can(session, 'rooms.read')) return <NoAccess />;

  return <RoomsView session={session!} searchParams={searchParams} />;
}
