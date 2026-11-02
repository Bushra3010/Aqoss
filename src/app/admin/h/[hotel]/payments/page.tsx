import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { can } from '@/lib/auth/session';
import { getHotelPanel, hotelPanelPath } from '@/lib/admin/hotel-panel';
import { NoAccess } from '@/components/admin/shared';
import { PaymentsTabs } from '@/components/admin/PaymentsTabs';
import { SettlementView, type SettlementSearch } from '@/components/admin/views/SettlementView';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Payments · Hotel admin' };

export default async function HotelPaymentsPage({
  params,
  searchParams,
}: {
  params: { hotel: string };
  searchParams: SettlementSearch;
}) {
  const panel = await getHotelPanel(params.hotel);
  if (!panel) notFound();
  if (!can(panel.session, 'payments.read')) return <NoAccess />;

  const { hotel } = panel;
  return (
    <SettlementView
      hotelId={hotel.id}
      searchParams={searchParams}
      listHref={hotelPanelPath(hotel.slug, 'payments')}
      tabs={<PaymentsTabs slug={hotel.slug} active="settlement" />}
      bookingHref={(id) => hotelPanelPath(hotel.slug, `bookings/${id}`)}
      payoutHref={
        can(panel.session, 'payouts.write')
          ? (id) => hotelPanelPath(hotel.slug, `payments/payout/${id}`)
          : undefined
      }
    />
  );
}
