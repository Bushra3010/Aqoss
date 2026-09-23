import Link from 'next/link';
import type { Metadata } from 'next';
import { ForgotPasswordForm } from '@/components/website/AuthForms';

export const metadata: Metadata = { title: 'Reset your password' };

export default function ForgotPasswordPage() {
  return (
    <div className="card p-7">
      <h1 className="text-xl font-bold text-slate-900">Reset your password</h1>
      <p className="mt-1 text-sm text-slate-500">
        We will email you a link to choose a new one.
      </p>

      <ForgotPasswordForm />

      <p className="mt-6 text-center text-sm text-slate-600">
        <Link href="/login" className="font-medium text-slate-900 underline">
          Back to sign in
        </Link>
      </p>
    </div>
  );
}
