import type { Metadata } from 'next';
import { getAdminSession, can } from '@/lib/auth/session';
import { NoAccess } from '@/components/admin/shared';
import { RoomsView } from '@/components/admin/views/RoomsView';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Rooms · AQOSS CRM' };

export default async function AdminRoomsPage({ searchParams }: { searchParams: { hotel?: string; q?: string; status?: string } }) {
  const session = await getAdminSession();
  if (!can(session, 'rooms.read')) return <NoAccess />;

  return (
    <RoomsView
      session={session!}
      searchParams={searchParams}
      base="/admin/rooms"
      pricingHref="/admin/inventory"
      newHref={can(session, 'rooms.write') ? `/admin/rooms/new${searchParams.hotel ? `?hotel=${searchParams.hotel}` : ''}` : undefined}
    />
  );
}
