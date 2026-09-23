import type { Metadata } from 'next';
import { getAdminSession, can } from '@/lib/auth/session';
import { NoAccess } from '@/components/admin/shared';
import { OffersView } from '@/components/admin/views/OffersView';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Offers & coupons · AQOSS CRM' };

/** Offers and coupons (PRD §30). */
export default async function OffersPage() {
  const session = await getAdminSession();
  if (!can(session, 'offers.read')) return <NoAccess />;

  return <OffersView session={session!} basePath="/admin/offers" />;
}
