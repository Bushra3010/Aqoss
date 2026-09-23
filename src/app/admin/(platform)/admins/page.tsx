import type { Metadata } from 'next';
import { getAdminSession, can } from '@/lib/auth/session';
import { createAdminSupabase } from '@/lib/supabase/admin';
import { PageHeader, Table, Td, NoAccess } from '@/components/admin/shared';
import { Badge, StatusBadge } from '@/components/ui';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Admin users · AQOSS CRM' };

/** Admin users, roles and their permissions (PRD §31). */
export default async function AdminsPage() {
  const session = await getAdminSession();
  if (!can(session, 'admins.read')) return <NoAccess />;

  const supabase = createAdminSupabase();

  const [{ data: admins }, { data: roles }] = await Promise.all([
    supabase
      .from('admin_users')
      .select('id, is_active, hotel_scope, created_at, profiles!inner (full_name, email), roles!inner (key, name)')
      .order('created_at', { ascending: false }),
    supabase
      .from('roles')
      .select('id, key, name, description, role_permissions (permissions (key))')
      .order('key'),
  ]);

  /* eslint-disable @typescript-eslint/no-explicit-any */
  const adminRows = (admins ?? []) as any[];
  const roleRows = (roles ?? []) as any[];

  return (
    <>
      <PageHeader
        title="Admin users"
        description="Role permissions live in the database, so access can change without a deploy."
      />

      <Table headers={['Name', 'Email', 'Role', 'Hotel scope', 'Status']} empty="No admin users yet.">
        {adminRows.map((a) => {
          const profile = Array.isArray(a.profiles) ? a.profiles[0] : a.profiles;
          const role = Array.isArray(a.roles) ? a.roles[0] : a.roles;
          return (
            <tr key={a.id}>
              <Td><span className="font-medium text-slate-900">{profile?.full_name ?? '—'}</span></Td>
              <Td>{profile?.email}</Td>
              <Td><Badge tone="blue">{role?.name}</Badge></Td>
              <Td>
                {a.hotel_scope?.length
                  ? `${a.hotel_scope.length} hotel${a.hotel_scope.length > 1 ? 's' : ''}`
                  : 'All hotels'}
              </Td>
              <Td><StatusBadge status={a.is_active ? 'ACTIVE' : 'INACTIVE'} /></Td>
            </tr>
          );
        })}
      </Table>

      <h2 className="mb-3 mt-8 text-sm font-semibold text-slate-900">Roles &amp; permissions</h2>
      <div className="grid gap-4 md:grid-cols-2">
        {roleRows.map((role) => {
          const permissions: string[] = (role.role_permissions ?? [])
            .map((rp: any) => (Array.isArray(rp.permissions) ? rp.permissions[0] : rp.permissions)?.key)
            .filter(Boolean)
            .sort();

          return (
            <section key={role.id} className="card p-5">
              <h3 className="font-semibold text-slate-900">{role.name}</h3>
              {role.description ? (
                <p className="mt-0.5 text-sm text-slate-500">{role.description}</p>
              ) : null}
              <ul className="mt-3 flex flex-wrap gap-1.5">
                {permissions.map((p) => (
                  <li key={p}>
                    <code className="rounded bg-slate-100 px-1.5 py-0.5 text-[11px] text-slate-600">
                      {p === '*' ? 'all permissions' : p}
                    </code>
                  </li>
                ))}
              </ul>
            </section>
          );
        })}
      </div>
    </>
  );
}
