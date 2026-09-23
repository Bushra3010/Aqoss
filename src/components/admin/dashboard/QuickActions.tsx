import Link from 'next/link';
import { Building2, BedDouble, Globe, CalendarDays, UserPlus, BarChart3, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

const ACTIONS = [
  { href: '/admin/hotels/new', title: 'Add New Hotel', subtitle: 'Create a new property', icon: Building2, tone: 'blue', permission: 'hotels.write' },
  { href: '/admin/rooms', title: 'Manage Rooms', subtitle: 'Add / edit rooms', icon: BedDouble, tone: 'indigo', permission: 'rooms.read' },
  { href: '/admin/websites/new', title: 'Create Website', subtitle: 'Setup hotel website', icon: Globe, tone: 'blue', permission: 'websites.write' },
  { href: '/admin/bookings', title: 'View Bookings', subtitle: 'All bookings', icon: CalendarDays, tone: 'indigo', permission: 'bookings.read' },
  { href: '/admin/customers', title: 'Add Customer', subtitle: 'New customer', icon: UserPlus, tone: 'blue', permission: 'customers.read' },
  { href: '/admin/reports', title: 'Generate Report', subtitle: 'View analytics', icon: BarChart3, tone: 'indigo', permission: 'reports.read' },
] as const;

const TONES = {
  blue: 'bg-blue-50 text-blue-600',
  indigo: 'bg-indigo-50 text-indigo-600',
} as const;

/** Shortcuts, filtered to what the signed-in role may actually do. */
export function QuickActions({ permissions }: { permissions: Set<string> }) {
  const allowed = ACTIONS.filter(
    (action) => permissions.has('*') || permissions.has(action.permission),
  );

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5">
      <h2 className="text-base font-bold text-slate-900">Quick Actions</h2>
      <p className="mt-0.5 text-sm text-slate-500">Manage your hotels, bookings and more</p>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        {allowed.map((action) => (
          <Link
            key={action.href}
            href={action.href}
            className="group flex items-center gap-2.5 rounded-xl border border-slate-200 px-3 py-2.5 transition hover:border-blue-200 hover:bg-blue-50/40"
          >
            <span
              className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-lg', TONES[action.tone])}
              aria-hidden="true"
            >
              <action.icon className="h-[18px] w-[18px]" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-semibold text-slate-900">{action.title}</span>
              <span className="block truncate text-xs text-slate-400">{action.subtitle}</span>
            </span>
            <ChevronRight className="h-4 w-4 shrink-0 text-slate-300 transition group-hover:text-blue-500" />
          </Link>
        ))}
      </div>
    </section>
  );
}
