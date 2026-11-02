import Link from 'next/link';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui';
import { PAYOUT_STATUS_LABEL, type PayoutStatus } from '@/lib/settlement';

/** A row of link tabs; the active one is marked for screen readers too. */
export function LinkTabs({
  label,
  tabs,
  active,
}: {
  label: string;
  tabs: { key: string; href: string; label: string; count?: number }[];
  active: string;
}) {
  return (
    <nav aria-label={label} className="mb-5 flex gap-1 overflow-x-auto border-b border-slate-200">
      {tabs.map((tab) => (
        <Link
          key={tab.key}
          href={tab.href}
          aria-current={active === tab.key ? 'page' : undefined}
          className={cn(
            '-mb-px whitespace-nowrap border-b-2 px-4 py-2 text-sm font-semibold',
            active === tab.key
              ? 'border-blue-600 text-blue-700'
              : 'border-transparent text-slate-500 hover:text-slate-900',
          )}
        >
          {tab.label}
          {tab.count !== undefined ? (
            <span className="ml-1.5 rounded-full bg-slate-100 px-1.5 py-0.5 text-xs tabular-nums text-slate-600">
              {tab.count}
            </span>
          ) : null}
        </Link>
      ))}
    </nav>
  );
}

/** Whether AQOSS has paid the hotel its share of a booking. */
export function PayoutBadge({ status }: { status: PayoutStatus }) {
  const tone = { PAID: 'green', PARTIAL: 'amber', PENDING: 'amber', NONE: 'slate' } as const;
  return <Badge tone={tone[status]}>{PAYOUT_STATUS_LABEL[status].toLowerCase()}</Badge>;
}
