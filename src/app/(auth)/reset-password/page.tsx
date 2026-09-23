import type { Metadata } from 'next';
import { ResetPasswordForm } from '@/components/website/AuthForms';

export const metadata: Metadata = { title: 'Choose a new password' };

export default function ResetPasswordPage() {
  return (
    <div className="card p-7">
      <h1 className="text-xl font-bold text-slate-900">Choose a new password</h1>
      <p className="mt-1 text-sm text-slate-500">Use at least 8 characters.</p>
      <ResetPasswordForm />
    </div>
  );
}
