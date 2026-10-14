import type { Metadata } from 'next';
import Link from 'next/link';
import { AdminAuthFrame } from '@/components/admin/AdminAuthFrame';
import { AdminForgotPasswordForm } from '@/components/admin/AdminPasswordForms';

export const metadata: Metadata = { title: 'AQOSS CRM · Reset password' };

export default function AdminForgotPasswordPage({ searchParams }: { searchParams: { error?: string } }) {
  return (
    <AdminAuthFrame
      title="Reset your password"
      subtitle="We will email you a link to choose a new one."
      footer={
        <p className="mt-4 text-center text-sm text-slate-400">
          <Link href="/admin/login" className="font-semibold text-white hover:underline">
            Back to sign in
          </Link>
        </p>
      }
    >
      <AdminForgotPasswordForm
        initialError={
          searchParams.error === 'link_expired'
            ? 'That reset link has expired or was already used. Request a new one below.'
            : undefined
        }
      />
    </AdminAuthFrame>
  );
}
