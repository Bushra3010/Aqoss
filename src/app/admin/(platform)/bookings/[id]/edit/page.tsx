import type { Metadata } from 'next';
import { getAdminSession, can } from '@/lib/auth/session';
import { NoAccess } from '@/components/admin/shared';
import { BookingEditView } from '@/components/admin/views/BookingEditView';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Edit booking · AQOSS CRM' };

export default async function EditBookingPage({ params }: { params: { id: string } }) {
  const session = await getAdminSession();
  if (!can(session, 'bookings.write')) return <NoAccess />;

  return <BookingEditView session={session!} bookingId={params.id} base="/admin/bookings" />;
}
