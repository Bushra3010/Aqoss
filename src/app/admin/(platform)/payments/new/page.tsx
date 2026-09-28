import type { Metadata } from 'next';
import { getAdminSession, can } from '@/lib/auth/session';
import { NoAccess, PageHeader } from '@/components/admin/shared';
import { RecordPaymentPicker } from '@/components/admin/PaymentForms';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Record payment · AQOSS CRM' };

export default async function RecordPaymentPage() {
  const session = await getAdminSession();
  if (!can(session, 'payments.write')) return <NoAccess />;

  return (
    <>
      <PageHeader title="Record payment" description="Money taken at the hotel — cash, UPI, card or bank transfer — against a booking that still owes." />
      <RecordPaymentPicker returnBase="/admin/payments" />
    </>
  );
}
