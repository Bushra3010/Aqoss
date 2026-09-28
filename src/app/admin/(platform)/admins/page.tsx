import Link from 'next/link';
import type { Metadata } from 'next';
import { getAdminSession, can } from '@/lib/auth/session';
import { createAdminSupabase } from '@/lib/supabase/admin';
import { scopeAllowed } from '@/services/staff.service';
import { PageHeader, Table, Td, NoAccess } from '@/components/admin/shared';
import { FilterForm } from '@/components/admin/FilterForm';
import { StaffTabs } from '@/components/admin/StaffTabs';
import { Alert, Badge, StatusBadge } from '@/components/ui';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Staff · AQOSS CRM' };

/** Staff accounts (PRD §31). */
export default async function AdminsPage({
  searchParams,
}: {
  searchParams: { q?: string; role?: string; status?: string; removed?: string };
}) {
  const session = await getAdminSession();
  if (!can(session, 'admins.read')) return <NoAccess />;

  const supabase = createAdminSupabase();
  const [{ data: admins }, { data: roles }, { data: hotels }] = await Promise.all([
    supabase
      .from('admin_users')
      .select('id, profile_id, is_active, hotel_scope, created_at, profiles!inner (full_name, email, mobile), roles!inner (id, key, name)')
      .order('created_at', { ascending: false }),
    supabase.from('roles').select('id, name').order('name'),
    supabase.from('hotels').select('id, name'),
  ]);

  /* eslint-disable @typescript-eslint/no-explicit-any */
  const hotelName = new Map(((hotels ?? []) as any[]).map((h) => [h.id, h.name as string]));
  const term = (searchParams.q ?? '').trim().toLowerCase();

  const rows = ((admins ?? []) as any[])
    .map((a) => ({
      ...a,
      profile: Array.isArray(a.profiles) ? a.profiles[0] : a.profiles,
      role: Array.isArray(a.roles) ? a.roles[0] : a.roles,
    }))
    // A hotel-scoped admin sees only staff who work within their hotels.
    .filter((a) => scopeAllowed(session!, a.hotel_scope ?? []))
    .filter((a) => !searchParams.role || a.role?.id === searchParams.role)
    .filter((a) => !searchParams.status || (searchParams.status === 'active') === a.is_active)
    .filter((a) => !term || `${a.profile?.full_name ?? ''} ${a.profile?.email ?? ''} ${a.profile?.mobile ?? ''}`.toLowerCase().includes(term));

  const hotelsLabel = (ids: string[]) =>
    !ids?.length ? 'All hotels' : ids.length <= 2 ? ids.map((id) => hotelName.get(id) ?? 'Unknown').join(', ') : `${ids.length} hotels`;

  return (
    <>
      <PageHeader
        title="Users & roles"
        description="Who can sign in to the CRM, what they can do, and which hotels they work in."
        action={can(session, 'admins.write') ? <Link href="/admin/admins/new" className="btn-primary">+ Add staff</Link> : null}
      />
      <StaffTabs active="staff" />

      {searchParams.removed ? (
        <div className="mb-4">
          <Alert tone="success">{searchParams.removed} no longer has access.</Alert>
        </div>
      ) : null}

      <FilterForm className="mb-4 flex flex-wrap gap-2">
        <input name="q" type="search" className="input max-w-xs" placeholder="Name, email or phone" defaultValue={searchParams.q ?? ''} aria-label="Search staff" />
        <select name="role" className="input max-w-[14rem]" defaultValue={searchParams.role ?? ''} aria-label="Role">
          <option value="">All roles</option>
          {((roles ?? []) as any[]).map((r) => (
            <option key={r.id} value={r.id}>{r.name}</option>
          ))}
        </select>
        <select name="status" className="input max-w-[10rem]" defaultValue={searchParams.status ?? ''} aria-label="Status">
          <option value="">Any status</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
      </FilterForm>

      <Table headers={['Name', 'Email', 'Role', 'Hotels', 'Status']} empty="No staff match these filters.">
        {rows.map((a) => (
          <tr key={a.id}>
            <Td>
              <Link href={`/admin/admins/${a.id}`} className="font-medium text-slate-900 hover:underline">
                {a.profile?.full_name ?? '—'}
              </Link>
              {a.profile_id === session!.userId ? <span className="ml-2 text-xs text-slate-400">(you)</span> : null}
              {a.profile?.mobile ? <p className="text-xs text-slate-400">{a.profile.mobile}</p> : null}
            </Td>
            <Td>{a.profile?.email}</Td>
            <Td><Badge tone="blue">{a.role?.name}</Badge></Td>
            <Td>{hotelsLabel(a.hotel_scope)}</Td>
            <Td><StatusBadge status={a.is_active ? 'ACTIVE' : 'INACTIVE'} /></Td>
          </tr>
        ))}
      </Table>
    </>
  );
}
