import type { Metadata } from 'next';
import { getAdminSession, can } from '@/lib/auth/session';
import { NoAccess } from '@/components/admin/shared';
import { ReviewsView } from '@/components/admin/views/ReviewsView';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Reviews · AQOSS CRM' };

export default async function AdminReviewsPage({ searchParams }: { searchParams: { status?: string } }) {
  const session = await getAdminSession();
  if (!can(session, 'reviews.read')) return <NoAccess />;

  return <ReviewsView session={session!} searchParams={searchParams} />;
}
