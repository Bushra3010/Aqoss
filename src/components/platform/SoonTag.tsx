import { cn } from '@/lib/utils';

/** Marks an announced feature that is not built yet, so no hotel mistakes it for a live one. */
export function SoonTag({ className }: { className?: string }) {
  return (
    <span className={cn('inline-flex shrink-0 items-center rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-amber-800', className)}>
      Coming soon
    </span>
  );
}
