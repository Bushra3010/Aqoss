/** The AQOSS logo, cut from public/Logo.png into public/brand/. */

/**
 * The AQOSS building mark (from public/Logo.png). `navy` sits on light
 * backgrounds, `white` on the brand navy.
 */
export function AqossMark({ className, tone = 'navy' }: { className?: string; tone?: 'navy' | 'white' }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={`/brand/aqoss-mark-${tone}.png`} alt="" aria-hidden="true" className={className ?? 'h-9 w-auto'} />
  );
}

/** The full stacked logo — mark, AQOSS, HOTEL. */
export function AqossLogo({ className, tone = 'navy' }: { className?: string; tone?: 'navy' | 'white' }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={`/brand/aqoss-logo-${tone}.png`} alt="AQOSS Hotel" className={className ?? 'h-24 w-auto'} />
  );
}
