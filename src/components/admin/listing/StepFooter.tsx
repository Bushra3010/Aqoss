'use client';

import Link from 'next/link';
import { useFormStatus } from 'react-dom';

export const BAR = 'sticky bottom-0 z-10 flex flex-wrap items-center justify-between gap-3 rounded-b-2xl border-t border-slate-200 bg-white px-4 py-3 sm:px-8';

function Back({ backHref, onBack }: { backHref?: string; onBack?: () => void }) {
  if (onBack) {
    return (
      <button type="button" onClick={onBack} className="btn-ghost text-blue-700">
        Back
      </button>
    );
  }
  return backHref ? (
    <Link href={backHref} className="btn-ghost text-blue-700">
      Back
    </Link>
  ) : (
    <span />
  );
}

/** Back on the left, "Save & continue" on the right; sits inside a <form>. */
export function StepFooter({
  backHref,
  onBack,
  skipHref,
  submitLabel = 'Save & continue',
}: {
  backHref?: string;
  onBack?: () => void;
  skipHref?: string;
  submitLabel?: string;
}) {
  const { pending } = useFormStatus();
  return (
    <div className={BAR}>
      <Back backHref={backHref} onBack={onBack} />
      <div className="flex items-center gap-2">
        {skipHref ? (
          <Link href={skipHref} className="btn-ghost">
            Skip for now
          </Link>
        ) : null}
        <button type="submit" className="btn-primary min-w-36" disabled={pending}>
          {pending ? 'Saving…' : submitLabel}
        </button>
      </div>
    </div>
  );
}

/** For steps that save as you go (rooms, photos): plain navigation. */
export function LinkFooter({ backHref, nextHref, nextLabel = 'Continue' }: { backHref?: string; nextHref: string; nextLabel?: string }) {
  return (
    <div className={BAR}>
      <Back backHref={backHref} />
      <Link href={nextHref} className="btn-primary min-w-36">
        {nextLabel}
      </Link>
    </div>
  );
}
