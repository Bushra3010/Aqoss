import type { Metadata } from 'next';
import { getAdminSession, can } from '@/lib/auth/session';
import { NoAccess } from '@/components/admin/shared';
import { PaymentDetailView } from '@/components/admin/views/PaymentDetailView';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Payment · AQOSS CRM' };

export default async function PaymentPage({ params, searchParams }: { params: { id: string }; searchParams: { recorded?: string } }) {
  const session = await getAdminSession();
  if (!can(session, 'payments.read')) return <NoAccess />;

  return (
    <PaymentDetailView
      session={session!}
      paymentId={params.id}
      paymentsHref="/admin/payments"
      bookingHref={(id) => `/admin/bookings/${id}`}
      notice={searchParams}
    />
  );
}
