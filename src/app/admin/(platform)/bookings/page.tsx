import type { Metadata } from 'next';
import { getAdminSession, can } from '@/lib/auth/session';
import { NoAccess } from '@/components/admin/shared';
import { BookingsView, type BookingsSearch } from '@/components/admin/views/BookingsView';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Bookings · AQOSS CRM' };

/** Bookings across every hotel in the admin's scope. */
export default async function AdminBookingsPage({ searchParams }: { searchParams: BookingsSearch }) {
  const session = await getAdminSession();
  if (!can(session, 'bookings.read')) return <NoAccess />;

  return (
    <BookingsView
      session={session!}
      searchParams={searchParams}
      bookingHref={(id) => `/admin/bookings/${id}`}
    />
  );
}
