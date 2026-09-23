import type { Metadata } from 'next';
import { getAdminSession, can } from '@/lib/auth/session';
import { PageHeader, NoAccess } from '@/components/admin/shared';
import { HotelForm } from '@/components/admin/HotelForm';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Add hotel · AQOSS CRM' };

export default async function NewHotelPage() {
  const session = await getAdminSession();
  if (!can(session, 'hotels.write')) return <NoAccess />;

  return (
    <>
      <PageHeader title="Add hotel" description="Create the property, then give it a website." />
      <HotelForm />
    </>
  );
}
