import Link from 'next/link';
import { cn } from '@/lib/utils';

/** Staff | Roles, at the top of the Users & Roles pages. */
export function StaffTabs({ active }: { active: 'staff' | 'roles' }) {
  const tab = (key: 'staff' | 'roles', href: string, label: string) => (
    <Link
      href={href}
      aria-current={active === key ? 'page' : undefined}
      className={cn(
        '-mb-px border-b-2 px-4 py-2 text-sm font-semibold',
        active === key ? 'border-blue-600 text-blue-700' : 'border-transparent text-slate-500 hover:text-slate-900',
      )}
    >
      {label}
    </Link>
  );
  return (
    <nav aria-label="Users and roles" className="mb-6 flex gap-2 border-b border-slate-200">
      {tab('staff', '/admin/admins', 'Staff')}
      {tab('roles', '/admin/admins/roles', 'Roles & permissions')}
    </nav>
  );
}
