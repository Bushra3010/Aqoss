import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { can } from '@/lib/auth/session';
import { getHotelPanel, hotelPanelPath } from '@/lib/admin/hotel-panel';
import { bookableRoomTypes } from '@/lib/admin/booking-options';
import { NoAccess, PageHeader } from '@/components/admin/shared';
import { NewBookingForm } from '@/components/admin/BookingForms';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'New booking · Hotel admin' };

export default async function HotelNewBookingPage({ params }: { params: { hotel: string } }) {
  const panel = await getHotelPanel(params.hotel);
  if (!panel) notFound();
  if (!can(panel.session, 'bookings.write')) return <NoAccess />;

  const { hotel, session } = panel;
  return (
    <>
      <PageHeader title="New booking" description={`A phone or walk-in booking at ${hotel.name}.`} />
      <NewBookingForm
        hotel={{ id: hotel.id, name: hotel.name }}
        roomTypes={await bookableRoomTypes(session, hotel.id)}
        canTakePayment={can(session, 'payments.write')}
        returnBase={hotelPanelPath(hotel.slug, 'bookings')}
      />
    </>
  );
}
