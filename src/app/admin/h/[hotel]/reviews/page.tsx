import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { can } from '@/lib/auth/session';
import { getHotelPanel } from '@/lib/admin/hotel-panel';
import { NoAccess } from '@/components/admin/shared';
import { ReviewsView } from '@/components/admin/views/ReviewsView';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Reviews · Hotel admin' };

export default async function HotelReviewsPage({
  params,
  searchParams,
}: {
  params: { hotel: string };
  searchParams: { status?: string };
}) {
  const panel = await getHotelPanel(params.hotel);
  if (!panel) notFound();
  if (!can(panel.session, 'reviews.read')) return <NoAccess />;

  return <ReviewsView session={panel.session} searchParams={searchParams} hotelId={panel.hotel.id} />;
}
