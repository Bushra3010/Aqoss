import type { Metadata } from 'next';
import { getAdminSession, can } from '@/lib/auth/session';
import { listPanelHotels } from '@/lib/admin/hotel-panel';
import { bookableRoomTypes } from '@/lib/admin/booking-options';
import { NoAccess, PageHeader } from '@/components/admin/shared';
import { NewBookingForm } from '@/components/admin/BookingForms';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'New booking · AQOSS CRM' };

export default async function NewBookingPage() {
  const session = await getAdminSession();
  if (!can(session, 'bookings.write')) return <NoAccess />;

  const [hotels, roomTypes] = await Promise.all([listPanelHotels(session!), bookableRoomTypes(session!)]);

  return (
    <>
      <PageHeader title="New booking" description="For a phone or walk-in guest. Checked for availability and priced exactly like the website." />
      <NewBookingForm
        hotels={hotels}
        roomTypes={roomTypes}
        canTakePayment={can(session, 'payments.write')}
        returnBase="/admin/bookings"
      />
    </>
  );
}
