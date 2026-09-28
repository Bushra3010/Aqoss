import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { can } from '@/lib/auth/session';
import { getHotelPanel, hotelPanelPath } from '@/lib/admin/hotel-panel';
import { NoAccess, PageHeader } from '@/components/admin/shared';
import { RecordPaymentPicker } from '@/components/admin/PaymentForms';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Record payment · Hotel admin' };

export default async function HotelRecordPaymentPage({ params }: { params: { hotel: string } }) {
  const panel = await getHotelPanel(params.hotel);
  if (!panel) notFound();
  if (!can(panel.session, 'payments.write')) return <NoAccess />;

  const { hotel } = panel;
  return (
    <>
      <PageHeader title="Record payment" description={`Money taken at ${hotel.name} against a booking that still owes.`} />
      <RecordPaymentPicker hotelId={hotel.id} returnBase={hotelPanelPath(hotel.slug, 'payments')} />
    </>
  );
}
