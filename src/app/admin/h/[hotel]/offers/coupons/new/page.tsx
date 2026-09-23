import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { can } from '@/lib/auth/session';
import { getHotelPanel, hotelPanelPath } from '@/lib/admin/hotel-panel';
import { offerHotelChoice } from '@/lib/admin/offer-choice';
import { NoAccess, PageHeader } from '@/components/admin/shared';
import { CouponForm } from '@/components/admin/OfferForms';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'New coupon · Hotel admin' };

export default async function HotelNewCouponFormPage({ params }: { params: { hotel: string } }) {
  const panel = await getHotelPanel(params.hotel);
  if (!panel) notFound();
  if (!can(panel.session, 'offers.write')) return <NoAccess />;

  const { hotel } = panel;
  return (
    <>
      <PageHeader title="New coupon" description={`A code guests enter at checkout for a discount. For ${hotel.name} only.`} />
      <CouponForm
        choice={await offerHotelChoice(panel.session, { id: hotel.id, name: hotel.name })}
        returnTo={hotelPanelPath(hotel.slug, 'offers')}
      />
    </>
  );
}
