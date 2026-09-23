import type { Metadata } from 'next';
import { getAdminSession, can } from '@/lib/auth/session';
import { NoAccess } from '@/components/admin/shared';
import { BookingDetailView } from '@/components/admin/views/BookingDetailView';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Booking · AQOSS CRM' };

export default async function AdminBookingDetail({ params }: { params: { id: string } }) {
  const session = await getAdminSession();
  if (!can(session, 'bookings.read')) return <NoAccess />;

  return <BookingDetailView session={session!} bookingId={params.id} backHref="/admin/bookings" />;
}
