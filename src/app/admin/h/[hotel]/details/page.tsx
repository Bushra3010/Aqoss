import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { can } from '@/lib/auth/session';
import { createAdminSupabase } from '@/lib/supabase/admin';
import { getHotelPanel } from '@/lib/admin/hotel-panel';
import { NoAccess, PageHeader } from '@/components/admin/shared';
import { HotelForm } from '@/components/admin/HotelForm';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Hotel details · Hotel admin' };

/** Address, contact, check-in times and tax for this hotel. */
export default async function HotelDetailsPage({ params }: { params: { hotel: string } }) {
  const panel = await getHotelPanel(params.hotel);
  if (!panel) notFound();
  if (!can(panel.session, 'hotels.read')) return <NoAccess />;

  const { data: hotel } = await createAdminSupabase()
    .from('hotels')
    .select('*')
    .eq('id', panel.hotel.id)
    .maybeSingle();
  if (!hotel) notFound();

  return (
    <>
      <PageHeader title="Hotel details" description="What guests see about the property, and the rules bookings follow." />
      {can(panel.session, 'hotels.write') ? <HotelForm hotel={hotel} /> : <NoAccess />}
    </>
  );
}
