import type { Metadata } from 'next';
import { getAdminSession, can } from '@/lib/auth/session';
import { offerHotelChoice } from '@/lib/admin/offer-choice';
import { NoAccess, PageHeader } from '@/components/admin/shared';
import { OfferForm } from '@/components/admin/OfferForms';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'New offer · AQOSS CRM' };

export default async function NewOfferFormPage() {
  const session = await getAdminSession();
  if (!can(session, 'offers.write')) return <NoAccess />;

  return (
    <>
      <PageHeader title="New offer" description="A deal shown on the hotel website." />
      <OfferForm choice={await offerHotelChoice(session!)} returnTo="/admin/offers" />
    </>
  );
}
