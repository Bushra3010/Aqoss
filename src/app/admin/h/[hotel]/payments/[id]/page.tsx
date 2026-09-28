import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { can } from '@/lib/auth/session';
import { getHotelPanel, hotelPanelPath } from '@/lib/admin/hotel-panel';
import { NoAccess } from '@/components/admin/shared';
import { PaymentDetailView } from '@/components/admin/views/PaymentDetailView';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Payment · Hotel admin' };

export default async function HotelPaymentPage({
  params,
  searchParams,
}: {
  params: { hotel: string; id: string };
  searchParams: { recorded?: string };
}) {
  const panel = await getHotelPanel(params.hotel);
  if (!panel) notFound();
  if (!can(panel.session, 'payments.read')) return <NoAccess />;

  const { hotel } = panel;
  return (
    <PaymentDetailView
      session={panel.session}
      paymentId={params.id}
      hotelId={hotel.id}
      paymentsHref={hotelPanelPath(hotel.slug, 'payments')}
      bookingHref={(id) => hotelPanelPath(hotel.slug, `bookings/${id}`)}
      notice={searchParams}
    />
  );
}
