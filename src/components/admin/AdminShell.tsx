import { can, type AdminSession } from '@/lib/auth/session';
import { createAdminSupabase } from '@/lib/supabase/admin';
import { AdminSidebar, type NavItem, type PanelContext } from '@/components/admin/AdminSidebar';
import { AdminTopBar } from '@/components/admin/AdminTopBar';
import { DemoBanner } from '@/components/DemoBanner';

/**
 * The CRM frame: a fixed 250px sidebar, a 72px top bar and a scrolling content
 * column. Rendered by two layouts — the platform CRM and each hotel's own
 * panel — which differ only in the navigation they pass in.
 *
 * Each is its own layout (not one layout branching on the pathname) because
 * Next does not re-run a shared layout on client navigation, so a branch on
 * the URL would keep showing whichever sidebar was rendered first.
 */
export async function AdminShell({
  session,
  main,
  admin,
  panel,
  searchAction,
  children,
}: {
  session: AdminSession;
  main: NavItem[];
  admin: NavItem[];
  panel?: PanelContext;
  searchAction?: string;
  children: React.ReactNode;
}) {
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
          <AdminSidebar main={main} admin={admin} panel={panel} />
        </aside>

        <div className="flex min-w-0 flex-1 flex-col overflow-y-auto">
          <AdminTopBar
            user={{ name: session.fullName ?? session.email ?? 'Admin', role: session.roleName }}
            notifications={unread}
            canReadNotifications={canReadNotifications}
            main={main}
            admin={admin}
            panel={panel}
            searchAction={searchAction}
          />

          <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8">{children}</main>
        </div>
      </div>
    </div>
  );
}
