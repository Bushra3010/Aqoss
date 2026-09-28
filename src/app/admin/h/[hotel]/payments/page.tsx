import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { can } from '@/lib/auth/session';
import { getHotelPanel, hotelPanelPath } from '@/lib/admin/hotel-panel';
import { NoAccess } from '@/components/admin/shared';
import { PaymentsView, type PaymentsSearch } from '@/components/admin/views/PaymentsView';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Payments · Hotel admin' };

export default async function HotelPaymentsPage({
  params,
  searchParams,
}: {
  params: { hotel: string };
  searchParams: PaymentsSearch;
}) {
  const panel = await getHotelPanel(params.hotel);
  if (!panel) notFound();
  if (!can(panel.session, 'payments.read')) return <NoAccess />;

  const { hotel } = panel;
  return (
    <PaymentsView
      session={panel.session}
      searchParams={searchParams}
      hotelId={hotel.id}
      bookingHref={(id) => hotelPanelPath(hotel.slug, `bookings/${id}`)}
      bookingsHref={hotelPanelPath(hotel.slug, 'bookings')}
      paymentHref={(id) => hotelPanelPath(hotel.slug, `payments/${id}`)}
      newHref={can(panel.session, 'payments.write') ? hotelPanelPath(hotel.slug, 'payments/new') : undefined}
    />
  );
}
