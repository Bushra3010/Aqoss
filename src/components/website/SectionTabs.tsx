'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';

const SECTIONS = [
  { id: 'overview', label: 'Overview' },
  { id: 'rooms', label: 'Rooms' },
  { id: 'location', label: 'Location' },
  { id: 'property-rules', label: 'Property Rules' },
  { id: 'user-reviews', label: 'User Reviews' },
  { id: 'similar-properties', label: 'Similar Properties' },
];

/**
 * Section navigation (PRD §5).
 *
 * The hotel website is a single page, so these scroll to anchors and follow
 * the reader: whichever section crosses a band near the top of the viewport
 * becomes the active tab. From a standalone route (kept for SEO and deep
 * links) they navigate home to that anchor instead.
 */
export function SectionTabs() {
  const pathname = usePathname();
  const onSinglePage = pathname === '/';

  const [active, setActive] = useState('overview');
  const listRef = useRef<HTMLUListElement>(null);

  useEffect(() => {
    if (!onSinglePage) return;

    /*
     * Read positions on scroll rather than using IntersectionObserver.
     * An observer only reports sections whose visibility *changed*, which
     * leaves the highlight a section behind on fast or programmatic scrolls.
     * The last heading to pass under the tab bar is unambiguous.
     */
    const compute = () => {
      const line = 160; // just below the sticky tab bar
      let current = SECTIONS[0].id;

      for (const section of SECTIONS) {
        const el = document.getElementById(section.id);
        if (el && el.getBoundingClientRect().top <= line) current = section.id;
      }

      // A short final section may never reach the line; at the foot of the
      // page it is plainly the one being read.
      const atBottom =
        window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 2;
      if (atBottom) current = SECTIONS[SECTIONS.length - 1].id;

      setActive(current);
    };

    // Called straight from the scroll listener rather than through
    // requestAnimationFrame: six getBoundingClientRect reads are cheap, and
    // rAF callbacks are throttled to zero in a backgrounded or non-compositing
    // tab, which would leave the highlight stuck.
    compute();

    // Sections settle to their final height a beat after navigation, so take a
    // second reading once images and layout have landed.
    const settle = window.setTimeout(compute, 250);

    window.addEventListener('scroll', compute, { passive: true });
    window.addEventListener('resize', compute);
    window.addEventListener('hashchange', compute);

    return () => {
      window.clearTimeout(settle);
      window.removeEventListener('scroll', compute);
      window.removeEventListener('resize', compute);
      window.removeEventListener('hashchange', compute);
    };
  }, [onSinglePage]);

  /*
   * Keep the active tab visible when the bar scrolls horizontally on mobile.
   * This nudges the strip's own scrollLeft rather than calling scrollIntoView,
   * which would also scroll the page and fight the reader for position.
   */
  useEffect(() => {
    const list = listRef.current;
    const el = list?.querySelector<HTMLElement>('[aria-current="page"]');
    if (!list || !el || list.scrollWidth <= list.clientWidth) return;

    const target = el.offsetLeft - list.clientWidth / 2 + el.clientWidth / 2;
    list.scrollTo({ left: Math.max(0, target), behavior: 'smooth' });
  }, [active]);

  return (
    <nav
      aria-label="Sections"
      className="rounded-xl border border-slate-200 bg-white shadow-sm"
    >
      <ul ref={listRef} className="flex overflow-x-auto">
        {SECTIONS.map((section) => {
          const isActive = onSinglePage && active === section.id;

          return (
            <li key={section.id} className="shrink-0">
              <Link
                href={onSinglePage ? `#${section.id}` : `/#${section.id}`}
                scroll={onSinglePage ? false : undefined}
                onClick={
                  onSinglePage
                    ? (event) => {
                        const el = document.getElementById(section.id);
                        if (!el) return; // let the link fall through

                        event.preventDefault();
                        setActive(section.id);

                        // Explicit offset rather than scrollIntoView, so the
                        // heading clears the sticky tab bar rather than hiding
                        // behind it. No `behavior` here on purpose: the global
                        // `scroll-behavior: smooth` in globals.css animates it,
                        // and its reduced-motion override applies for free.
                        window.scrollTo({
                          top: el.getBoundingClientRect().top + window.scrollY - 96,
                        });

                        history.replaceState(null, '', `#${section.id}`);
                      }
                    : undefined
                }
                aria-current={isActive ? 'page' : undefined}
                className={cn(
                  'block border-b-2 px-6 py-3.5 text-[13px] font-semibold uppercase tracking-wide transition',
                  isActive ? 'border-current' : 'border-transparent text-slate-500 hover:text-slate-900',
                )}
                style={isActive ? { color: 'var(--brand-700)' } : undefined}
              >
                {section.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
