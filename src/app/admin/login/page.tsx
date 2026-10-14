import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { safeLocalPath } from '@/lib/safe-path';
import { getAdminSession } from '@/lib/auth/session';
import { AdminLoginForm } from '@/components/admin/AdminLoginForm';
import { AdminAuthFrame } from '@/components/admin/AdminAuthFrame';

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

  return (
    <AdminAuthFrame
      title="Sign in"
      subtitle="Staff access only."
      footer={
        <>
          <p className="mt-4 text-center text-sm text-slate-400">
            New to AQOSS?{' '}
            <Link href="/admin/register" className="font-semibold text-white hover:underline">
              Register your hotel
            </Link>
          </p>

          {session ? (
            <p className="mt-2 text-center text-sm text-slate-400">
              Already signed in as {session.fullName ?? session.email}.{' '}
              <Link href="/admin" className="font-semibold text-white hover:underline">
                Go to dashboard
              </Link>
            </p>
          ) : null}
        </>
      }
    >
      <AdminLoginForm
        redirectTo={redirectTo}
        initialError={
          searchParams.error === 'not_admin'
            ? 'This account does not have CRM access.'
            : undefined
        }
      />
    </AdminAuthFrame>
  );
}
