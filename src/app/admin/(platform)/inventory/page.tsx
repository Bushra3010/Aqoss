import type { Metadata } from 'next';
import { getAdminSession, can } from '@/lib/auth/session';
import { NoAccess } from '@/components/admin/shared';
import { InventoryView, type InventorySearch } from '@/components/admin/views/InventoryView';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Inventory · AQOSS CRM' };

export default async function InventoryPage({ searchParams }: { searchParams: InventorySearch }) {
  const session = await getAdminSession();
  if (!can(session, 'inventory.read')) return <NoAccess />;

  return <InventoryView session={session!} searchParams={searchParams} />;
}
