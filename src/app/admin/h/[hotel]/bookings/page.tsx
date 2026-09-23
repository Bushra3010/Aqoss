import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { can } from '@/lib/auth/session';
import { getHotelPanel, hotelPanelPath } from '@/lib/admin/hotel-panel';
import { NoAccess } from '@/components/admin/shared';
import { BookingsView, type BookingsSearch } from '@/components/admin/views/BookingsView';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Bookings · Hotel admin' };

export default async function HotelBookingsPage({
  params,
  searchParams,
}: {
  params: { hotel: string };
  searchParams: BookingsSearch;
}) {
  const panel = await getHotelPanel(params.hotel);
  if (!panel) notFound();
  if (!can(panel.session, 'bookings.read')) return <NoAccess />;

  const { hotel } = panel;
  return (
    <BookingsView
      session={panel.session}
      searchParams={searchParams}
      hotelId={hotel.id}
      bookingHref={(id) => hotelPanelPath(hotel.slug, `bookings/${id}`)}
    />
  );
}
