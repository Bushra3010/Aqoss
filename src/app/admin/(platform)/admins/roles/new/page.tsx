import type { Metadata } from 'next';
import { getAdminSession } from '@/lib/auth/session';
import { listPermissions } from '@/services/staff.service';
import { NoAccess, PageHeader } from '@/components/admin/shared';
import { RoleForm } from '@/components/admin/StaffForms';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'New role · AQOSS CRM' };

export default async function NewRolePage() {
  const session = await getAdminSession();
  if (!session?.permissions.has('*') || session.hotelScope.length) return <NoAccess />;

  return (
    <>
      <PageHeader title="New role" description="Pick what people with this role can see and do." />
      <RoleForm permissions={await listPermissions()} />
    </>
  );
}
