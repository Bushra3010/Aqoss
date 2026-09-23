import Link from 'next/link';
import type { Metadata } from 'next';
import { LoginForm } from '@/components/website/AuthForms';
import { DemoSignIn } from '@/components/DemoSignIn';
import { isDemoMode } from '@/lib/env';
import { DEMO_ACCOUNTS } from '@/lib/demo/store';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Sign in' };

export default function LoginPage({
  searchParams,
}: {
  searchParams: { redirect?: string };
}) {
  const redirectTo = searchParams.redirect ?? '/dashboard';

  // Customers only — staff accounts sign in at /admin/login.
  const demoAccounts = isDemoMode
    ? DEMO_ACCOUNTS.filter((a) => !a.role).map((a) => ({
        email: a.email,
        label: a.fullName,
        description: a.description,
      }))
    : [];

  return (
    <div className="card p-7">
      <h1 className="text-xl font-bold text-slate-900">Sign in</h1>
      <p className="mt-1 text-sm text-slate-500">
        Manage your bookings, invoices and reviews.
      </p>

      <LoginForm redirectTo={redirectTo} />

      <DemoSignIn accounts={demoAccounts} redirectTo={redirectTo} />

      <p className="mt-6 text-center text-sm text-slate-600">
        New here?{' '}
        <Link href="/register" className="font-medium text-slate-900 underline">
          Create an account
        </Link>
      </p>
    </div>
  );
}
