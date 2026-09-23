import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { can } from '@/lib/auth/session';
import { getHotelPanel, hotelPanelPath } from '@/lib/admin/hotel-panel';
import { NoAccess } from '@/components/admin/shared';
import { OffersView } from '@/components/admin/views/OffersView';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Offers & coupons · Hotel admin' };

export default async function HotelOffersPage({ params }: { params: { hotel: string } }) {
  const panel = await getHotelPanel(params.hotel);
  if (!panel) notFound();
  if (!can(panel.session, 'offers.read')) return <NoAccess />;

  return (
    <OffersView
      session={panel.session}
      hotelId={panel.hotel.id}
      basePath={hotelPanelPath(panel.hotel.slug, 'offers')}
    />
  );
}
