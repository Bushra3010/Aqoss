import { ArrowDown, ArrowUp, type LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { MetricDelta } from '@/services/report.service';

const TONES = {
  blue: 'bg-blue-50 text-blue-600',
  indigo: 'bg-indigo-50 text-indigo-600',
  emerald: 'bg-emerald-50 text-emerald-600',
  amber: 'bg-amber-50 text-amber-500',
} as const;

export function StatCard({
  label,
  value,
  icon: Icon,
  tone,
  metric,
  comparison,
  suffix,
}: {
  label: string;
  value: string;
  icon: LucideIcon;
  tone: keyof typeof TONES;
  metric?: MetricDelta;
  comparison: string;
  suffix?: React.ReactNode;
}) {
  const direction = metric?.direction ?? 'flat';
  const Arrow = direction === 'down' ? ArrowDown : ArrowUp;

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5">
      <div className="flex items-start gap-3.5">
        <span
          className={cn('flex h-11 w-11 shrink-0 items-center justify-center rounded-xl', TONES[tone])}
          aria-hidden="true"
        >
          <Icon className="h-5 w-5" />
        </span>

        <div className="min-w-0">
          <p className="text-sm text-slate-500">{label}</p>
          <p className="mt-0.5 flex items-baseline gap-1.5 text-[26px] font-bold leading-tight tracking-tight text-slate-900">
            {value}
            {suffix}
          </p>
        </div>
      </div>

      <p className="mt-3.5 flex items-center gap-1.5 text-xs">
        {metric && metric.changePercent !== null ? (
          <>
            <Arrow
              className={cn(
                'h-3.5 w-3.5',
                direction === 'down' ? 'text-rose-500' : 'text-emerald-500',
              )}
            />
            <span
              className={cn(
                'font-semibold',
                direction === 'down' ? 'text-rose-500' : 'text-emerald-500',
              )}
            >
              {Math.abs(metric.changePercent) >= 999 ? '999+' : Math.abs(metric.changePercent)}%
            </span>
          </>
        ) : (
          <span className="font-semibold text-slate-400">—</span>
        )}
        <span className="text-slate-400">{comparison}</span>
      </p>
    </div>
  );
}
