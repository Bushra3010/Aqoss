import Link from 'next/link';
import { cn } from '@/lib/utils';

/** Shared CRM chrome: page headers, stat tiles and tables. */

export function PageHeader({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">{title}</h1>
        {description ? <p className="mt-1 text-sm text-slate-500">{description}</p> : null}
      </div>
      {action ? <div className="flex gap-2">{action}</div> : null}
    </div>
  );
}

export function StatTile({
  label,
  value,
  hint,
  href,
}: {
  label: string;
  value: string | number;
  hint?: string;
  href?: string;
}) {
  const body = (
    <div className="card h-full p-4 transition hover:border-slate-300">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-400">{label}</p>
      <p className="mt-1.5 text-2xl font-bold tabular-nums text-slate-900">{value}</p>
      {hint ? <p className="mt-0.5 text-xs text-slate-500">{hint}</p> : null}
    </div>
  );

  return href ? <Link href={href}>{body}</Link> : body;
}

export function Table({
  headers,
  children,
  empty,
}: {
  headers: (string | { label: string; align?: 'left' | 'right' })[];
  children: React.ReactNode;
  empty?: string;
}) {
  const hasRows = Array.isArray(children) ? children.length > 0 : Boolean(children);

  return (
    <div className="card overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="border-b border-slate-200 bg-slate-50">
          <tr>
            {headers.map((h, i) => {
              const header = typeof h === 'string' ? { label: h, align: 'left' as const } : h;
              return (
                <th
                  key={i}
                  scope="col"
                  className={cn(
                    'whitespace-nowrap px-4 py-3 font-medium text-slate-600',
                    header.align === 'right' ? 'text-right' : 'text-left',
                  )}
                >
                  {header.label}
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-200">
          {hasRows ? (
            children
          ) : (
            <tr>
              <td colSpan={headers.length} className="px-4 py-10 text-center text-slate-500">
                {empty ?? 'Nothing here yet.'}
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

export function Td({
  children,
  align = 'left',
  className,
}: {
  children: React.ReactNode;
  align?: 'left' | 'right';
  className?: string;
}) {
  return (
    <td
      className={cn(
        'px-4 py-3 text-slate-700',
        align === 'right' ? 'text-right tabular-nums' : '',
        className,
      )}
    >
      {children}
    </td>
  );
}

export function NoAccess() {
  return (
    <div className="card p-10 text-center">
      <h2 className="text-base font-semibold text-slate-900">No access</h2>
      <p className="mt-1 text-sm text-slate-500">
        Your role does not include permission for this section.
      </p>
    </div>
  );
}
