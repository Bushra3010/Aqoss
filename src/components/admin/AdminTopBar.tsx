'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { Bell, ChevronDown, Menu, Search, X } from 'lucide-react';
import { AdminSidebar, type NavItem, type PanelContext } from './AdminSidebar';
import { initials } from '@/lib/utils';

export function AdminTopBar({
  user,
  notifications,
  canReadNotifications,
  main,
  admin,
  panel,
  searchAction = '/admin/bookings',
}: {
  user: { name: string; role: string };
  notifications: number;
  /** Roles without the permission get no bell — it would only 404 them. */
  canReadNotifications: boolean;
  main: NavItem[];
  admin: NavItem[];
  panel?: PanelContext;
  /** Where the search box submits; a hotel panel searches its own bookings. */
  searchAction?: string;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // ⌘K / Ctrl+K focuses search, matching the hint in the field.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        searchRef.current?.focus();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) setMenuOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  return (
    <>
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white">
        <div className="flex h-[72px] items-center gap-3 px-4 sm:px-6">
          <button
            type="button"
            onClick={() => setDrawerOpen(true)}
            className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 lg:hidden"
            aria-label="Open navigation"
          >
            <Menu className="h-5 w-5" />
          </button>

          <form
            action={searchAction}
            className="relative hidden max-w-xl flex-1 sm:block"
            role="search"
          >
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-slate-400" />
            <input
              ref={searchRef}
              name="q"
              type="search"
              placeholder={panel ? `Search ${panel.title} bookings...` : 'Search hotels, bookings, customers...'}
              aria-label="Search"
              className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-11 pr-16 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-300 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-100"
            />
            <kbd className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 rounded-md border border-slate-200 bg-white px-1.5 py-0.5 text-[11px] font-medium text-slate-400">
              ⌘ K
            </kbd>
          </form>

          {/* ml-auto, not flex-1: the search field is width-capped, so without
              this the leftover space collects to the right of the avatar
              instead of before it. */}
          <div className="ml-auto flex shrink-0 items-center gap-2">
            {canReadNotifications ? (
              <Link
                href="/admin/notifications"
                className="relative rounded-lg p-2 text-slate-500 transition hover:bg-slate-100"
                aria-label={`Notifications${notifications ? `, ${notifications} unread` : ''}`}
              >
                <Bell className="h-5 w-5" />
                {notifications > 0 ? (
                  <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-blue-600 px-1 text-[10px] font-semibold text-white">
                    {notifications > 9 ? '9+' : notifications}
                  </span>
                ) : null}
              </Link>
            ) : null}

            <span className="mx-1 hidden h-8 w-px bg-slate-200 sm:block" aria-hidden="true" />

            <div className="relative" ref={menuRef}>
              <button
                type="button"
                onClick={() => setMenuOpen((v) => !v)}
                aria-expanded={menuOpen}
                aria-haspopup="menu"
                className="flex items-center gap-2.5 rounded-lg p-1.5 transition hover:bg-slate-100"
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-100 text-xs font-bold text-blue-700">
                  {initials(user.name)}
                </span>
                <span className="hidden text-left sm:block">
                  <span className="block text-sm font-semibold leading-tight text-slate-900">
                    {user.name}
                  </span>
                  <span className="block text-xs text-slate-400">{user.role}</span>
                </span>
                <ChevronDown className="hidden h-4 w-4 text-slate-400 sm:block" />
              </button>

              {menuOpen ? (
                <div
                  role="menu"
                  className="absolute right-0 top-full z-50 mt-2 w-52 overflow-hidden rounded-xl border border-slate-200 bg-white py-1 shadow-lg"
                >
                  <div className="border-b border-slate-100 px-3 py-2 sm:hidden">
                    <p className="text-sm font-semibold text-slate-900">{user.name}</p>
                    <p className="text-xs text-slate-400">{user.role}</p>
                  </div>
                  {admin.some((item) => item.href === '/admin/settings') ? (
                    <Link
                      href="/admin/settings"
                      role="menuitem"
                      className="block px-3 py-2 text-sm text-slate-600 hover:bg-slate-50"
                      onClick={() => setMenuOpen(false)}
                    >
                      System settings
                    </Link>
                  ) : null}
                  <Link
                    href="/"
                    role="menuitem"
                    className="block px-3 py-2 text-sm text-slate-600 hover:bg-slate-50"
                    onClick={() => setMenuOpen(false)}
                  >
                    View a hotel website
                  </Link>
                  <form action="/auth/signout" method="post" className="border-t border-slate-100">
                    <button
                      type="submit"
                      role="menuitem"
                      className="w-full px-3 py-2 text-left text-sm text-rose-600 hover:bg-rose-50"
                    >
                      Sign out
                    </button>
                  </form>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </header>

      {/* Mobile navigation drawer */}
      {drawerOpen ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-slate-900/40"
            onClick={() => setDrawerOpen(false)}
            aria-label="Close navigation"
          />
          <div className="absolute inset-y-0 left-0 w-[260px] border-r border-slate-200 bg-white shadow-xl">
            <button
              type="button"
              onClick={() => setDrawerOpen(false)}
              className="absolute right-3 top-5 rounded-lg p-1.5 text-slate-400 hover:bg-slate-100"
              aria-label="Close navigation"
            >
              <X className="h-5 w-5" />
            </button>
            <AdminSidebar main={main} admin={admin} panel={panel} onNavigate={() => setDrawerOpen(false)} />
          </div>
        </div>
      ) : null}
    </>
  );
}
