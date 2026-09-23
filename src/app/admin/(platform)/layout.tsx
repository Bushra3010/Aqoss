import { redirect } from 'next/navigation';
import { headers } from 'next/headers';
import { getAdminSession, can } from '@/lib/auth/session';
import { AdminShell } from '@/components/admin/AdminShell';
import type { NavItem } from '@/components/admin/AdminSidebar';

export const dynamic = 'force-dynamic';

/**
 * CRM shell for the whole platform (PRD §31, §32). Each hotel's own panel
 * lives beside this under `admin/h/[hotel]` with its own navigation.
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

export default async function PlatformLayout({ children }: { children: React.ReactNode }) {
  const session = await getAdminSession();
  if (!session) {
    const pathname = headers().get('x-aqoss-pathname') || '/admin';
    redirect(`/admin/login?redirect=${encodeURIComponent(pathname)}`);
  }

  // Drop the permission key; the client component only needs the link itself.
  const strip = ({ permission: _permission, ...item }: NavItem & { permission: string }) => item;

  return (
    <AdminShell
      session={session}
      main={MAIN_NAV.filter((i) => can(session, i.permission)).map(strip)}
      admin={ADMIN_NAV.filter((i) => can(session, i.permission)).map(strip)}
    >
      {children}
    </AdminShell>
  );
}
