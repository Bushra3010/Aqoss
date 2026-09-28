import Link from 'next/link';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getAdminSession, can } from '@/lib/auth/session';
import { staffFormOptions } from '@/lib/admin/staff-options';
import { assertCanManage, getStaff, scopeAllowed } from '@/services/staff.service';
import { NoAccess, PageHeader } from '@/components/admin/shared';
import { RemoveStaffButton, SetPasswordForm, StaffForm } from '@/components/admin/StaffForms';
import { StaffTabs } from '@/components/admin/StaffTabs';
import { Alert, Badge, StatusBadge } from '@/components/ui';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Staff member · AQOSS CRM' };

export default async function StaffPage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams: { created?: string; saved?: string };
}) {
  const session = await getAdminSession();
  if (!can(session, 'admins.read')) return <NoAccess />;

  const staff = await getStaff(params.id);
  // Someone outside a scoped admin's hotels does not exist for them.
  if (!staff || !scopeAllowed(session!, staff.hotel_scope)) notFound();

  const self = staff.profile_id === session!.userId;
  let manageable = can(session, 'admins.write');
  let blockedBecause: string | null = null;
  try {
    assertCanManage(session!, staff);
  } catch (err) {
    manageable = false;
    blockedBecause = (err as Error).message;
  }
  const options = manageable ? await staffFormOptions(session!) : null;
  // Keep their current role listed even if this admin could not grant it anew.
  if (options && !options.roles.some((r) => r.id === staff.role_id)) {
    options.roles.unshift({ id: staff.role.id, name: staff.role.name, description: null });
  }

  return (
    <>
      <PageHeader
        title={staff.full_name ?? staff.email}
        description={staff.email}
        action={
          <>
            <Badge tone="blue">{staff.role.name}</Badge>
            <StatusBadge status={staff.is_active ? 'ACTIVE' : 'INACTIVE'} />
            <Link href="/admin/admins" className="btn-ghost">All staff</Link>
          </>
        }
      />
      <StaffTabs active="staff" />

      <div className="space-y-6">
        {searchParams.created ? <Alert tone="success">Account created. Share the password with them privately.</Alert> : null}
        {searchParams.saved ? <Alert tone="success">Changes saved.</Alert> : null}

        {options ? (
          <StaffForm
            staff={{
              id: staff.id,
              full_name: staff.full_name,
              email: staff.email,
              mobile: staff.mobile,
              role_id: staff.role_id,
              hotel_scope: staff.hotel_scope,
              is_active: staff.is_active,
            }}
            {...options}
            self={self}
          />
        ) : (
          <Alert tone="info">
            {can(session, 'admins.write') && blockedBecause ? blockedBecause : 'Your role can view staff but not change them.'}
          </Alert>
        )}

        {options && !self ? (
          <>
            <section className="rounded-2xl border border-slate-200 bg-white p-5">
              <h2 className="text-base font-bold text-slate-900">Set a new password</h2>
              <p className="mb-4 text-sm text-slate-500">
                For someone who has forgotten theirs. Their old password stops working straight away.
              </p>
              <SetPasswordForm adminUserId={staff.id} />
            </section>

            <section className="rounded-2xl border border-rose-200 bg-white p-5">
              <h2 className="text-base font-bold text-slate-900">Remove access</h2>
              <p className="mb-4 text-sm text-slate-500">
                They can no longer sign in. Bookings and changes they made stay in the records. To pause them instead, untick Active above.
              </p>
              <RemoveStaffButton adminUserId={staff.id} name={staff.full_name ?? staff.email} />
            </section>
          </>
        ) : null}

        {self ? (
          <p className="text-sm text-slate-500">
            To change your own password, use <Link href="/admin/account" className="font-medium text-blue-600 hover:underline">My account</Link>.
          </p>
        ) : null}
      </div>
    </>
  );
}
