import { cn } from '@/lib/utils';

export function Badge({
  children,
  tone = 'slate',
  className,
}: {
  children: React.ReactNode;
  tone?: 'slate' | 'green' | 'amber' | 'red' | 'blue';
  className?: string;
}) {
  const tones = {
    slate: 'bg-slate-100 text-slate-700',
    green: 'bg-emerald-100 text-emerald-800',
    amber: 'bg-amber-100 text-amber-800',
    red: 'bg-rose-100 text-rose-800',
    blue: 'bg-sky-100 text-sky-800',
  } as const;

  return <span className={cn('badge', tones[tone], className)}>{children}</span>;
}

/** Booking and payment statuses share one colour language across the app. */
export function StatusBadge({ status }: { status: string }) {
  const map: Record<string, 'slate' | 'green' | 'amber' | 'red' | 'blue'> = {
    PENDING: 'amber',
    CONFIRMED: 'green',
    CHECKED_IN: 'blue',
    CHECKED_OUT: 'slate',
    CANCELLED: 'red',
    REFUNDED: 'red',
    PAID: 'green',
    FAILED: 'red',
    PARTIALLY_REFUNDED: 'amber',
    APPROVED: 'green',
    HIDDEN: 'slate',
    ACTIVE: 'green',
    DRAFT: 'slate',
    INACTIVE: 'slate',
    SUSPENDED: 'red',
  };

  return <Badge tone={map[status] ?? 'slate'}>{status.replace(/_/g, ' ').toLowerCase()}</Badge>;
}

export function Stars({ rating, className }: { rating: number; className?: string }) {
  return (
    <span className={cn('inline-flex items-center gap-0.5', className)} aria-label={`${rating} out of 5`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <svg
          key={i}
          viewBox="0 0 20 20"
          aria-hidden="true"
          className={cn('h-4 w-4', i <= Math.round(rating) ? 'text-amber-400' : 'text-slate-200')}
          fill="currentColor"
        >
          <path d="M10 1.5l2.6 5.3 5.9.85-4.25 4.15 1 5.85L10 14.9l-5.25 2.75 1-5.85L1.5 7.65l5.9-.85z" />
        </svg>
      ))}
    </span>
  );
}

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="card flex flex-col items-center justify-center px-6 py-14 text-center">
      <h3 className="text-base font-semibold text-slate-900">{title}</h3>
      {description ? <p className="mt-1 max-w-sm text-sm text-slate-500">{description}</p> : null}
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}

export function Alert({
  children,
  tone = 'error',
}: {
  children: React.ReactNode;
  tone?: 'error' | 'success' | 'info';
}) {
  const tones = {
    error: 'border-rose-200 bg-rose-50 text-rose-800',
    success: 'border-emerald-200 bg-emerald-50 text-emerald-800',
    info: 'border-sky-200 bg-sky-50 text-sky-800',
  } as const;

  return (
    <div role={tone === 'error' ? 'alert' : 'status'} className={cn('rounded-lg border px-4 py-3 text-sm', tones[tone])}>
      {children}
    </div>
  );
}

export function Field({
  label,
  htmlFor,
  error,
  hint,
  children,
}: {
  label: string;
  htmlFor?: string;
  error?: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="label" htmlFor={htmlFor}>
        {label}
      </label>
      {children}
      {hint && !error ? <p className="mt-1 text-xs text-slate-500">{hint}</p> : null}
      {error ? <p className="mt-1 text-xs text-rose-600">{error}</p> : null}
    </div>
  );
}
