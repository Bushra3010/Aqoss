import Link from 'next/link';
import type { Metadata } from 'next';
import { getAdminSession, can } from '@/lib/auth/session';
import { listRoles } from '@/services/staff.service';
import { NoAccess, PageHeader } from '@/components/admin/shared';
import { StaffTabs } from '@/components/admin/StaffTabs';
import { DeleteRoleButton } from '@/components/admin/StaffForms';
import { Alert, Badge } from '@/components/ui';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Roles · AQOSS CRM' };

/** Roles and what each allows. Only a super admin changes them — they apply everywhere. */
export default async function RolesPage({ searchParams }: { searchParams: { saved?: string; deleted?: string } }) {
  const session = await getAdminSession();
  if (!can(session, 'admins.read')) return <NoAccess />;

  const roles = await listRoles();
  const canEdit = session!.permissions.has('*') && !session!.hotelScope.length;

  return (
    <>
      <PageHeader
        title="Users & roles"
        description="A role is a set of permissions. Changing a role changes it for everyone who has it."
        action={canEdit ? <Link href="/admin/admins/roles/new" className="btn-primary">+ New role</Link> : null}
      />
      <StaffTabs active="roles" />

      {searchParams.saved ? <div className="mb-4"><Alert tone="success">{searchParams.saved} saved.</Alert></div> : null}
      {searchParams.deleted ? <div className="mb-4"><Alert tone="success">{searchParams.deleted} deleted.</Alert></div> : null}

      <div className="grid gap-4 md:grid-cols-2">
        {roles.map((role) => {
          const everything = role.permissions.includes('*');
          return (
            <section key={role.id} className="rounded-2xl border border-slate-200 bg-white p-5">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <h2 className="font-semibold text-slate-900">{role.name}</h2>
                  {role.description ? <p className="mt-0.5 text-sm text-slate-500">{role.description}</p> : null}
                </div>
                <div className="flex items-center gap-2">
                  {role.is_system ? <Badge>built-in</Badge> : <Badge tone="blue">custom</Badge>}
                  <span className="text-xs text-slate-500">{role.users} {role.users === 1 ? 'person' : 'people'}</span>
                </div>
              </div>

              <ul className="mt-3 flex flex-wrap gap-1.5">
                {everything ? (
                  <li><code className="rounded bg-slate-100 px-1.5 py-0.5 text-[11px] text-slate-600">every permission</code></li>
                ) : (
                  role.permissions.map((p) => (
                    <li key={p}><code className="rounded bg-slate-100 px-1.5 py-0.5 text-[11px] text-slate-600">{p}</code></li>
                  ))
                )}
              </ul>

              {canEdit && !everything ? (
                <div className="mt-4 flex items-start justify-between gap-3 border-t border-slate-100 pt-3">
                  <Link href={`/admin/admins/roles/${role.id}`} className="text-sm font-semibold text-blue-600 hover:underline">
                    Edit permissions
                  </Link>
                  {!role.is_system ? <DeleteRoleButton roleId={role.id} name={role.name} /> : null}
                </div>
              ) : null}
            </section>
          );
        })}
      </div>
    </>
  );
}
