'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard, Building2, Globe, BedDouble, Tag, CalendarDays, User,
  CreditCard, Ticket, Star, BarChart3, Bell, ShieldCheck, Settings, ScrollText,
  type LucideIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';

export interface NavItem {
  href: string;
  label: string;
  icon: string;
}

/** Icon names are passed from the server layout, which cannot send components. */
const ICONS: Record<string, LucideIcon> = {
  dashboard: LayoutDashboard,
  hotels: Building2,
  websites: Globe,
  rooms: BedDouble,
  pricing: Tag,
  bookings: CalendarDays,
  customers: User,
  payments: CreditCard,
  offers: Ticket,
  reviews: Star,
  reports: BarChart3,
  notifications: Bell,
  users: ShieldCheck,
  settings: Settings,
  audit: ScrollText,
};

export function AdminSidebar({
  main,
  admin,
  onNavigate,
}: {
  main: NavItem[];
  admin: NavItem[];
  onNavigate?: () => void;
}) {
  const pathname = usePathname();

  const isActive = (href: string) =>
    href === '/admin' ? pathname === '/admin' : pathname.startsWith(href);

  const renderItem = (item: NavItem) => {
    const Icon = ICONS[item.icon] ?? LayoutDashboard;
    const active = isActive(item.href);

    return (
      <li key={item.href}>
        <Link
          href={item.href}
          onClick={onNavigate}
          aria-current={active ? 'page' : undefined}
          className={cn(
            'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition',
            active
              ? 'bg-blue-50 text-blue-600'
              : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900',
          )}
        >
          <Icon className={cn('h-[18px] w-[18px] shrink-0', active ? 'text-blue-600' : 'text-slate-400')} />
          <span className="truncate">{item.label}</span>
        </Link>
      </li>
    );
  };

  return (
    <div className="flex h-full flex-col bg-white">
      <div className="flex items-center gap-3 px-5 py-5">
        <span
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-blue-700"
          aria-hidden="true"
        >
          <svg viewBox="0 0 24 24" className="h-5 w-5 text-white" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 20 12 4l8 16" />
            <path d="M8.5 14h7" />
          </svg>
        </span>
        <span className="min-w-0">
          <span className="block text-lg font-bold leading-tight tracking-tight text-slate-900">AQOSS</span>
          <span className="block text-xs text-slate-400">Hotel CRM</span>
        </span>
      </div>

      <nav aria-label="CRM" className="flex-1 overflow-y-auto px-3 pb-4">
        <ul className="space-y-1">{main.map(renderItem)}</ul>

        {admin.length ? (
          <>
            <p className="px-3 pb-2 pt-6 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
              Admin
            </p>
            <ul className="space-y-1">{admin.map(renderItem)}</ul>
          </>
        ) : null}
      </nav>

      <div className="border-t border-slate-100 p-3">
        <div className="flex items-center gap-2.5 rounded-xl border border-slate-200 bg-white px-3 py-2.5">
          <span className="relative flex h-2 w-2 shrink-0" aria-hidden="true">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
          </span>
          <span className="min-w-0">
            <span className="block text-sm font-semibold leading-tight text-slate-900">System Online</span>
            <span className="block text-xs text-slate-400">v1.0.0</span>
          </span>
        </div>
      </div>
    </div>
  );
}
