import type { Metadata } from 'next';
import { getAdminSession, can } from '@/lib/auth/session';
import { createAdminSupabase } from '@/lib/supabase/admin';
import { PageHeader, NoAccess } from '@/components/admin/shared';
import { ReviewModeration } from '@/components/admin/ReviewModeration';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Reviews · AQOSS CRM' };

/** Review moderation (PRD §19). */
export default async function AdminReviewsPage({ searchParams }: { searchParams: { status?: string } }) {
  const session = await getAdminSession();
  if (!can(session, 'reviews.read')) return <NoAccess />;

  let query = createAdminSupabase()
    .from('reviews')
    .select('id, author_name, rating, title, comment, status, admin_response, created_at, hotels!inner (id, name)')
    .order('created_at', { ascending: false })
    .limit(100);

  if (session!.hotelScope.length) query = query.in('hotel_id', session!.hotelScope);
  query = query.eq('status', searchParams.status ?? 'PENDING');

  const { data } = await query;

  return (
    <>
      <PageHeader
        title="Reviews"
        description="Only guests with a completed stay can leave one. Approve to publish."
      />

      <form className="mb-4 flex gap-2">
        <select name="status" className="input max-w-[12rem]" defaultValue={searchParams.status ?? 'PENDING'}>
          {['PENDING', 'APPROVED', 'HIDDEN', 'DELETED'].map((s) => (
            <option key={s} value={s}>{s.toLowerCase()}</option>
          ))}
        </select>
        <button type="submit" className="btn-outline">Filter</button>
      </form>

      <ReviewModeration
        reviews={(data ?? []) as never[]}
        canModerate={can(session, 'reviews.moderate')}
      />
    </>
  );
}
