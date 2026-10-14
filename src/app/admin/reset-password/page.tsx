import type { Metadata } from 'next';
import { AdminAuthFrame } from '@/components/admin/AdminAuthFrame';
import { AdminResetPasswordForm } from '@/components/admin/AdminPasswordForms';

export const metadata: Metadata = { title: 'AQOSS CRM · Choose a new password' };

export default function AdminResetPasswordPage() {
  return (
    <AdminAuthFrame title="Choose a new password" subtitle="You will be signed in to the CRM afterwards.">
      <AdminResetPasswordForm />
    </AdminAuthFrame>
  );
}
