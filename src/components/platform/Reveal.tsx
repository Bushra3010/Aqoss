'use client';

import { useEffect, useRef, type ReactNode } from 'react';

/**
 * Plays the `.reveal` entrance (globals.css) the first time the block scrolls
 * into view. Children opt in with `data-reveal` and set `--i` for their place
 * in the stagger. Without JavaScript nothing is hidden.
 */
export function Reveal({ children, className }: { children: ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          el.dataset.shown = '';
          io.disconnect();
        }
      },
      { threshold: 0.15 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <div ref={ref} className={className ? `reveal ${className}` : 'reveal'}>
      {children}
    </div>
  );
}
