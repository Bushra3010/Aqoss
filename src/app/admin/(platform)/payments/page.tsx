import type { Metadata } from 'next';
import { getAdminSession, can } from '@/lib/auth/session';
import { NoAccess } from '@/components/admin/shared';
import { PaymentsView } from '@/components/admin/views/PaymentsView';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Payments · AQOSS CRM' };

export default async function PaymentsPage({ searchParams }: { searchParams: { status?: string } }) {
  const session = await getAdminSession();
  if (!can(session, 'payments.read')) return <NoAccess />;

  return (
    <PaymentsView
      session={session!}
      searchParams={searchParams}
      bookingHref={(id) => `/admin/bookings/${id}`}
    />
  );
}
