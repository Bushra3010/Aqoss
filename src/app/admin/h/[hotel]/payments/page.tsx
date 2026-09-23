import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { can } from '@/lib/auth/session';
import { getHotelPanel, hotelPanelPath } from '@/lib/admin/hotel-panel';
import { NoAccess } from '@/components/admin/shared';
import { PaymentsView } from '@/components/admin/views/PaymentsView';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Payments · Hotel admin' };

export default async function HotelPaymentsPage({
  params,
  searchParams,
}: {
  params: { hotel: string };
  searchParams: { status?: string };
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
    />
  );
}
