import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { can } from '@/lib/auth/session';
import { getHotelPanel, hotelPanelPath } from '@/lib/admin/hotel-panel';
import { createAdminSupabase } from '@/lib/supabase/admin';
import { NoAccess, PageHeader } from '@/components/admin/shared';
import { PromotionForm, type PromotionKindKey } from '@/components/admin/OfferForms';
import { PROMOTION_KINDS } from '@/services/promotion.service';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'New promotion · Hotel admin' };

export default async function HotelNewPromotionPage({
  params,
  searchParams,
}: {
  params: { hotel: string };
  searchParams: { kind?: string };
}) {
  const panel = await getHotelPanel(params.hotel);
  if (!panel) notFound();
  if (!can(panel.session, 'offers.write')) return <NoAccess />;

  const kind = (searchParams.kind && searchParams.kind in PROMOTION_KINDS ? searchParams.kind : 'BASIC') as PromotionKindKey;
  const { hotel } = panel;
  const { data: roomTypes } = await createAdminSupabase()
    .from('room_types')
    .select('id, name')
    .eq('hotel_id', hotel.id)
    .eq('is_active', true)
    .order('sort_order');

  return (
    <>
      <PageHeader title={`New ${PROMOTION_KINDS[kind].label.toLowerCase()}`} description={PROMOTION_KINDS[kind].blurb} />
      <PromotionForm
        hotel={{ id: hotel.id, name: hotel.name }}
        kind={kind}
        roomTypes={(roomTypes ?? []) as { id: string; name: string }[]}
        returnTo={hotelPanelPath(hotel.slug, 'offers')}
      />
    </>
  );
}
