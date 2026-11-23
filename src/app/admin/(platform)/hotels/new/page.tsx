import Link from 'next/link';
import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getAdminSession, can, canAccessHotel } from '@/lib/auth/session';
import { createAdminSupabase } from '@/lib/supabase/admin';
import { PageHeader, NoAccess } from '@/components/admin/shared';
import { EmptyState } from '@/components/ui';
import { ListingStart } from '@/components/admin/listing/ListingStart';
import { listingPath } from '@/lib/listing';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'List your property · AQOSS CRM' };

/**
 * Adding a property is listing it: pick the type of property, fill in each
 * step, and the hotel and its free website go live together at the end.
 * `?hotel=<id>` opens the listing of a hotel that already exists.
 */
export default async function NewHotelPage({ searchParams }: { searchParams: { hotel?: string } }) {
  const session = await getAdminSession();
  if (!can(session, 'hotels.write')) return <NoAccess />;

  if (searchParams.hotel && canAccessHotel(session, searchParams.hotel)) {
    redirect(listingPath(searchParams.hotel, 'basic-info'));
  }

  // Only an all-hotels admin who manages websites adds a property; a hotel's
  // own admins open theirs.
  if (session!.hotelScope.length || !can(session, 'websites.write')) {
    const { data: hotels } = await createAdminSupabase()
      .from('hotels')
      .select('id, name')
      .in('id', session!.hotelScope.length ? session!.hotelScope : ['00000000-0000-0000-0000-000000000000'])
      .order('name');
    return (
      <>
        <PageHeader title="List property" description="Open the listing of one of your properties." />
        {hotels?.length ? (
          <ul className="divide-y divide-slate-100 rounded-2xl border border-slate-200 bg-white">
            {hotels.map((h) => (
              <li key={h.id} className="flex items-center justify-between gap-3 px-5 py-4">
                <span className="text-sm font-semibold text-slate-900">{h.name}</span>
                <Link href={listingPath(h.id)} className="text-sm font-semibold text-blue-700 hover:underline">
                  Open listing
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState title="No hotels assigned" description="Ask an AQOSS admin to add your property." />
        )}
      </>
    );
  }

  return (
    <>
      <PageHeader
        title="List property"
        description="Choose the type of property and fill in each step. Its free website goes live at the end."
      />
      <ListingStart />
    </>
  );
}
