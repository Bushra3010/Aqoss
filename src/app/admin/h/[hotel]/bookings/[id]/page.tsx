import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { can } from '@/lib/auth/session';
import { getHotelPanel, hotelPanelPath } from '@/lib/admin/hotel-panel';
import { NoAccess } from '@/components/admin/shared';
import { BookingDetailView } from '@/components/admin/views/BookingDetailView';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Booking · Hotel admin' };

export default async function HotelBookingDetail({ params }: { params: { hotel: string; id: string } }) {
  const panel = await getHotelPanel(params.hotel);
  if (!panel) notFound();
  if (!can(panel.session, 'bookings.read')) return <NoAccess />;

  return (
    <BookingDetailView
      session={panel.session}
      bookingId={params.id}
      hotelId={panel.hotel.id}
      backHref={hotelPanelPath(panel.hotel.slug, 'bookings')}
    />
  );
}
