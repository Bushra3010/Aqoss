import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { can } from '@/lib/auth/session';
import { getHotelPanel, hotelPanelPath } from '@/lib/admin/hotel-panel';
import { offerHotelChoice } from '@/lib/admin/offer-choice';
import { NoAccess, PageHeader } from '@/components/admin/shared';
import { OfferForm } from '@/components/admin/OfferForms';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'New offer · Hotel admin' };

export default async function HotelNewOfferFormPage({ params }: { params: { hotel: string } }) {
  const panel = await getHotelPanel(params.hotel);
  if (!panel) notFound();
  if (!can(panel.session, 'offers.write')) return <NoAccess />;

  const { hotel } = panel;
  return (
    <>
      <PageHeader title="New offer" description={`A deal shown on the hotel website. For ${hotel.name} only.`} />
      <OfferForm
        choice={await offerHotelChoice(panel.session, { id: hotel.id, name: hotel.name })}
        returnTo={hotelPanelPath(hotel.slug, 'offers')}
      />
    </>
  );
}
