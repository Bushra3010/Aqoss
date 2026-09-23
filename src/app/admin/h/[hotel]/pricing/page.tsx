import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { can } from '@/lib/auth/session';
import { getHotelPanel } from '@/lib/admin/hotel-panel';
import { NoAccess } from '@/components/admin/shared';
import { InventoryView, type InventorySearch } from '@/components/admin/views/InventoryView';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Pricing & availability · Hotel admin' };

export default async function HotelPricingPage({
  params,
  searchParams,
}: {
  params: { hotel: string };
  searchParams: InventorySearch;
}) {
  const panel = await getHotelPanel(params.hotel);
  if (!panel) notFound();
  if (!can(panel.session, 'inventory.read')) return <NoAccess />;

  return <InventoryView session={panel.session} searchParams={searchParams} lockedHotelId={panel.hotel.id} />;
}
