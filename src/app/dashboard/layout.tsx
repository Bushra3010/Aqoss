import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getUser } from '@/lib/auth/session';
import { createAdminSupabase } from '@/lib/supabase/admin';
import { initials } from '@/lib/utils';

const NAV = [
  { href: '/dashboard', label: 'Overview' },
  { href: '/dashboard/bookings', label: 'My bookings' },
  { href: '/dashboard/payments', label: 'Payments & invoices' },
  { href: '/dashboard/profile', label: 'Profile' },
];

/** Customer dashboard shell (PRD §12). */
export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const user = await getUser();
  if (!user) redirect('/login?redirect=/dashboard');

  const { data: profile } = await createAdminSupabase()
    .from('profiles')
    .select('full_name, email, profile_photo')
    .eq('id', user.id)
    .maybeSingle();

  const name = profile?.full_name ?? user.email ?? 'Guest';

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="container-page flex h-16 items-center justify-between">
          <Link href="/" className="text-sm font-semibold text-slate-900">
            ← Back to the hotel
          </Link>

          <div className="flex items-center gap-3">
            <span className="hidden text-sm text-slate-600 sm:block">{name}</span>
            <span
              className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-900 text-xs font-semibold text-white"
              aria-hidden="true"
            >
              {initials(name)}
            </span>
            <form action="/auth/signout" method="post">
              <button type="submit" className="btn-ghost text-sm">Sign out</button>
            </form>
          </div>
        </div>
      </header>

      <div className="container-page grid max-w-[1400px] gap-8 py-8 lg:grid-cols-[200px_1fr]">
        <nav aria-label="Dashboard" className="lg:sticky lg:top-8 lg:self-start">
          <ul className="flex gap-1 overflow-x-auto lg:flex-col lg:overflow-visible">
            {NAV.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className="block whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium text-slate-600 hover:bg-white hover:text-slate-900"
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div className="min-w-0">{children}</div>
      </div>
    </div>
  );
}
