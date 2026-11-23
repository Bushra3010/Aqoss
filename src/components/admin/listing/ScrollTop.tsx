'use client';

import { useEffect, useRef } from 'react';
import { Alert } from '@/components/ui';

/**
 * The CRM scrolls inside its content pane, not the window, so neither Next's
 * navigation nor window.scrollTo brings a new step to the top. Find the pane
 * and move it.
 */
export function scrollPaneToTop(from: Element | null) {
  let pane = from?.parentElement ?? null;
  while (pane && getComputedStyle(pane).overflowY !== 'auto') pane = pane.parentElement;
  pane?.scrollTo({ top: 0 });
}

/** Opens each step at the top. */
export function ScrollTop({ watch }: { watch: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => scrollPaneToTop(ref.current), [watch]);
  return <span ref={ref} hidden />;
}

/**
 * A failed save's message, scrolled into sight — the button is at the bottom.
 * `state` can be undefined: after an action redirects back to the same page,
 * React hands the form no state.
 */
export function ErrorBanner({ state }: { state?: { error?: string } }) {
  const ref = useRef<HTMLDivElement>(null);
  const error = state?.error;
  useEffect(() => {
    if (error) scrollPaneToTop(ref.current);
  }, [state, error]);
  // `hidden` when empty, so it takes no space in the step's spacing.
  return (
    <div ref={ref} hidden={!error}>
      {error ? <Alert>{error}</Alert> : null}
    </div>
  );
}
