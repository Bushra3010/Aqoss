import type { Metadata } from 'next';
import { getAdminSession, can } from '@/lib/auth/session';
import { offerHotelChoice } from '@/lib/admin/offer-choice';
import { NoAccess, PageHeader } from '@/components/admin/shared';
import { CouponForm } from '@/components/admin/OfferForms';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'New coupon · AQOSS CRM' };

export default async function NewCouponFormPage() {
  const session = await getAdminSession();
  if (!can(session, 'offers.write')) return <NoAccess />;

  return (
    <>
      <PageHeader title="New coupon" description="A code guests enter at checkout for a discount." />
      <CouponForm choice={await offerHotelChoice(session!)} returnTo="/admin/offers" />
    </>
  );
}
