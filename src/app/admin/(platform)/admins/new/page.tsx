import type { Metadata } from 'next';
import { getAdminSession, can } from '@/lib/auth/session';
import { staffFormOptions } from '@/lib/admin/staff-options';
import { NoAccess, PageHeader } from '@/components/admin/shared';
import { StaffForm } from '@/components/admin/StaffForms';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Add staff · AQOSS CRM' };

export default async function NewStaffPage() {
  const session = await getAdminSession();
  if (!can(session, 'admins.write')) return <NoAccess />;

  const options = await staffFormOptions(session!);
  return (
    <>
      <PageHeader title="Add staff" description="Give someone a sign-in to the CRM. They can only do what their role allows, in the hotels you choose." />
      <StaffForm {...options} />
    </>
  );
}
