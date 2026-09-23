import { redirect } from 'next/navigation';
import { headers } from 'next/headers';
import { getAdminSession, can } from '@/lib/auth/session';
import { createAdminSupabase } from '@/lib/supabase/admin';
import { AdminSidebar, type NavItem } from '@/components/admin/AdminSidebar';
import { AdminTopBar } from '@/components/admin/AdminTopBar';
import { DemoBanner } from '@/components/DemoBanner';

export const dynamic = 'force-dynamic';

/**
 * CRM shell (PRD §31, §32).
 *
 * Navigation is derived from the signed-in role's permissions, which live in
 * the database — a role that cannot see payments never sees the link, and the
 * page itself re-checks the permission anyway.
 */
const MAIN_NAV: (NavItem & { permission: string })[] = [
  { href: '/admin', label: 'Dashboard', icon: 'dashboard', permission: 'dashboard.read' },
  { href: '/admin/hotels', label: 'Hotels & Properties', icon: 'hotels', permission: 'hotels.read' },
  { href: '/admin/websites', label: 'Websites', icon: 'websites', permission: 'websites.read' },
  { href: '/admin/rooms', label: 'Rooms & Inventory', icon: 'rooms', permission: 'rooms.read' },
  { href: '/admin/inventory', label: 'Pricing & Availability', icon: 'pricing', permission: 'inventory.read' },
  { href: '/admin/bookings', label: 'Bookings', icon: 'bookings', permission: 'bookings.read' },
  { href: '/admin/customers', label: 'Customers (CRM)', icon: 'customers', permission: 'customers.read' },
  { href: '/admin/payments', label: 'Payments', icon: 'payments', permission: 'payments.read' },
  { href: '/admin/offers', label: 'Offers & Coupons', icon: 'offers', permission: 'offers.read' },
  { href: '/admin/reviews', label: 'Reviews', icon: 'reviews', permission: 'reviews.read' },
  { href: '/admin/reports', label: 'Reports', icon: 'reports', permission: 'reports.read' },
  { href: '/admin/notifications', label: 'Notifications', icon: 'notifications', permission: 'notifications.read' },
];

const ADMIN_NAV: (NavItem & { permission: string })[] = [
  { href: '/admin/admins', label: 'Users & Roles', icon: 'users', permission: 'admins.read' },
  { href: '/admin/settings', label: 'System Settings', icon: 'settings', permission: 'settings.write' },
  { href: '/admin/audit', label: 'Audit Logs', icon: 'audit', permission: 'audit.read' },
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = headers().get('x-aqoss-pathname') ?? '';

  // The login page renders inside this segment but must stay reachable.
  if (pathname.startsWith('/admin/login')) {
    return <>{children}</>;
  }

  const session = await getAdminSession();
  if (!session) redirect(`/admin/login?redirect=${encodeURIComponent(pathname || '/admin')}`);

  // Drop the permission key; the client component only needs the link itself.
  const strip = ({ permission: _permission, ...item }: NavItem & { permission: string }) => item;
  const main = MAIN_NAV.filter((i) => can(session, i.permission)).map(strip);
  const admin = ADMIN_NAV.filter((i) => can(session, i.permission)).map(strip);

  // Unread count for the bell.
  const canReadNotifications = can(session, 'notifications.read');
  let unread = 0;
  if (canReadNotifications) {
    const { count } = await createAdminSupabase()
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('state', 'QUEUED');
    unread = count ?? 0;
  }

  return (
    /*
     * A fixed-height shell rather than a tall page: the banner keeps its own
     * row, the sidebar fills exactly what is left, and the content column does
     * the scrolling. Sizing the sidebar with `h-screen` instead would push its
     * footer below the fold by the height of whatever sits above it.
     */
    <div className="flex h-screen flex-col overflow-hidden bg-[#F8FAFC]">
      <DemoBanner />

      <div className="flex min-h-0 flex-1">
        <aside className="hidden w-[250px] shrink-0 border-r border-slate-200 lg:block">
          <AdminSidebar main={main} admin={admin} />
        </aside>

        <div className="flex min-w-0 flex-1 flex-col overflow-y-auto">
          <AdminTopBar
            user={{ name: session.fullName ?? session.email ?? 'Admin', role: session.roleName }}
            notifications={unread}
            canReadNotifications={canReadNotifications}
            main={main}
            admin={admin}
          />

          <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8">{children}</main>
        </div>
      </div>
    </div>
  );
}
