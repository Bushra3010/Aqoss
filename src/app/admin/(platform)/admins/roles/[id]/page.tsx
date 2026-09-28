import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getAdminSession } from '@/lib/auth/session';
import { listPermissions, listRoles } from '@/services/staff.service';
import { NoAccess, PageHeader } from '@/components/admin/shared';
import { RoleForm } from '@/components/admin/StaffForms';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Edit role · AQOSS CRM' };

export default async function EditRolePage({ params }: { params: { id: string } }) {
  const session = await getAdminSession();
  if (!session?.permissions.has('*') || session.hotelScope.length) return <NoAccess />;

  const [roles, permissions] = await Promise.all([listRoles(), listPermissions()]);
  const role = roles.find((r) => r.id === params.id);
  if (!role || role.permissions.includes('*')) notFound();

  return (
    <>
      <PageHeader
        title={`Edit ${role.name}`}
        description={`${role.users} ${role.users === 1 ? 'person has' : 'people have'} this role — changes apply to them straight away.`}
      />
      <RoleForm role={{ id: role.id, name: role.name, description: role.description, permissions: role.permissions }} permissions={permissions} />
    </>
  );
}
