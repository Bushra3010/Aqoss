import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
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
  const redirectTo = searchParams.redirect ?? '/admin';
  if (session) redirect(redirectTo);

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
