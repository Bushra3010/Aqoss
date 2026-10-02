import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { safeLocalPath } from '@/lib/safe-path';
import { getAdminSession } from '@/lib/auth/session';
import { AdminLoginForm } from '@/components/admin/AdminLoginForm';
import { DemoSignIn } from '@/components/DemoSignIn';
import { isDemoMode } from '@/lib/env';
import { DEMO_ACCOUNTS } from '@/lib/demo/store';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'AQOSS CRM · Sign in' };

export default async function AdminLoginPage({
  searchParams,
}: {
  searchParams: { redirect?: string; error?: string };
}) {
  const session = await getAdminSession();
  const redirectTo = safeLocalPath(searchParams.redirect, '/admin');
  // Sent here by a protected page while already signed in: carry on. Opened
  // directly ("Hotel Sign In" on the website) it always shows the form —
  // signing in replaces the current session and lands on the dashboard.
  if (session && searchParams.redirect) redirect(redirectTo);

  // Super Admin and the single-property manager, which show the two ends of
  // hotel scope. The other staff roles still exist and can be signed into by
  // typing their credentials — see DEMO_ACCOUNTS.
  const demoAccounts = isDemoMode
    ? DEMO_ACCOUNTS.filter((a) => a.role === 'super_admin' || a.role === 'property_manager').map((a) => ({
        email: a.email,
        label: roleLabel(a.role!),
        description: a.description,
      }))
    : [];

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-900 px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex flex-col items-center text-center">
          <span className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-[#003358]" aria-hidden="true">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/brand/aqoss-mark-white.png" alt="" className="h-[62%] w-auto" />
          </span>
          <p className="text-2xl font-bold text-white">AQOSS</p>
          <p className="text-sm text-slate-400">Hotel management CRM</p>
        </div>

        <div className="rounded-2xl bg-white p-7 shadow-xl">
          <h1 className="text-lg font-bold text-slate-900">Sign in</h1>
          <p className="mt-1 text-sm text-slate-500">Staff access only.</p>

          <AdminLoginForm
            redirectTo={redirectTo}
            initialError={
              searchParams.error === 'not_admin'
                ? 'This account does not have CRM access.'
                : undefined
            }
          />

          <DemoSignIn accounts={demoAccounts} redirectTo={redirectTo} />
        </div>

        {session ? (
          <p className="mt-4 text-center text-sm text-slate-400">
            Already signed in as {session.fullName ?? session.email}.{' '}
            <Link href="/admin" className="font-semibold text-white hover:underline">
              Go to dashboard
            </Link>
          </p>
        ) : null}
      </div>
    </div>
  );
}

function roleLabel(key: string): string {
  return key
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}
