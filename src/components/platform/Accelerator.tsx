'use client';

import { useEffect, useState, type CSSProperties } from 'react';
import { ArrowRight, BarChart3, CalendarDays, Megaphone, Settings, UserRound } from 'lucide-react';
import { AqossMark } from '@/components/platform/Art';
import { Reveal } from '@/components/platform/Reveal';
import { cn } from '@/lib/utils';

const ITEMS = [
  {
    id: 'website',
    href: '/ai-website',
    icon: CalendarDays,
    short: 'AI Website',
    tile: 'from-sky-400 to-blue-600',
    // Centre of its card on the orbit, as % of the art, and its tilt.
    at: { x: 28.5, y: 21, r: -12 },
  },
  {
    id: 'marketing',
    href: '/ai-marketing',
    icon: Megaphone,
    short: 'AI Marketing',
    tile: 'from-violet-400 to-purple-600',
    at: { x: 71, y: 19, r: 12 },
  },
  {
    id: 'sales',
    href: '/ai-sales',
    icon: BarChart3,
    short: 'AI Sales',
    tile: 'from-pink-400 to-pink-600',
    at: { x: 86, y: 53.5, r: -10 },
  },
  {
    id: 'booking',
    href: '/booking-engine',
    icon: Settings,
    short: 'Booking Engine',
    tile: 'from-emerald-400 to-green-600',
    at: { x: 16.5, y: 54, r: -10 },
  },
  {
    id: 'reputation',
    href: '/reputation',
    icon: UserRound,
    short: 'Reputation Management',
    tile: 'from-orange-300 to-orange-500',
    at: { x: 50, y: 83, r: 0 },
  },
] as const;

/** Where the small dots sit on the dashed ring, in degrees (0 = right, clockwise). */
const DOTS = [-90, -22, 32, 128, 152, 205];
const RING = 34.5; // ring radius, % of the art

/** How long each solution stays highlighted before the next one takes over. */
const ROTATE_MS = 1000;

/**
 * "Assured Quality of Soft Solutions" (the Accelerator), the home page's hero:
 * the five solutions as an orbit round AQOSS, one highlighted at a time,
 * moving on every second.
 */
export function Accelerator() {
  const [active, setActive] = useState(0);

  useEffect(() => {
    const id = window.setInterval(() => setActive((i) => (i + 1) % ITEMS.length), ROTATE_MS);
    return () => window.clearInterval(id);
  }, []);

  return (
    <section id="solutions" className="relative isolate scroll-mt-20 overflow-hidden bg-gradient-to-b from-[#F5F8FE] to-white">
      <div className="absolute -right-48 top-24 -z-10 h-[820px] w-[1100px] rounded-full bg-[#EAF1FD]/70 blur-sm" aria-hidden="true" />

      {/* From lg up the orbit is sized by the window's height so the hero fits
          one window under the 69px header; the section is only as tall as its
          content, so the solutions follow straight after. */}
      <div className="mx-auto grid max-w-7xl items-center gap-14 px-4 pb-8 pt-20 sm:px-6 lg:grid-cols-[1fr_1.15fr] lg:gap-10 lg:pb-0 lg:pt-8">
        <Reveal className="lg:-translate-y-12">
          <h1 data-reveal style={{ '--i': 0 } as CSSProperties} className="text-5xl font-extrabold leading-[1.05] tracking-tight text-[#0B1B3F] sm:text-6xl lg:text-[clamp(2.75rem,4.5vw,4.1rem)]">
            <span className="lg:whitespace-nowrap">Assured Quality of</span>
            <span className="block bg-gradient-to-r from-blue-700 to-blue-500 bg-clip-text pb-1 text-transparent">Soft Solutions</span>
          </h1>
          <p data-reveal style={{ '--i': 1 } as CSSProperties} className="mt-5 max-w-2xl text-lg leading-relaxed text-slate-600 lg:mt-5 lg:text-xl tall:mt-6 tall:text-xl">
            AQOSS hotel solutions accelerate your hotel&apos;s productivity with smart automation, seamless management, and
            powerful tools — all in one platform.
          </p>

          <div data-reveal style={{ '--i': 2 } as CSSProperties} className="mt-8 flex flex-wrap items-center gap-x-8 gap-y-4 lg:mt-8 tall:mt-10">
            <a href="/#book-demo" className="inline-flex items-center gap-3 rounded-xl bg-blue-700 px-14 py-4 text-[17px] font-semibold text-white shadow-lg shadow-blue-700/25 hover:bg-blue-800">
              Book a Demo <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </a>
            <a href="#website" className="group inline-flex items-center gap-2 text-[17px] font-semibold text-blue-700">
              Explore All Features <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" aria-hidden="true" />
            </a>
          </div>
        </Reveal>

        <Orbit active={ITEMS[active].id} className="max-w-[720px] lg:max-w-[min(640px,calc(100svh-69px-3rem))] lg:translate-x-[8%]" />
      </div>
    </section>
  );
}

/**
 * AQOSS at the centre of its five solutions. Text is sized in container units
 * (`cqw`) so the art scales as one piece at any width it is given.
 */
function Orbit({ active, className = 'max-w-[720px]' }: { active: string; className?: string }) {
  return (
    <div
      className={cn('orbit relative mx-auto aspect-square w-full', className)}
      style={{ containerType: 'inline-size' }}
      role="img"
      aria-label="AQOSS at the centre of its five hotel solutions"
    >
      {/* Soft halo */}
      <div className="absolute left-1/2 top-1/2 h-[50%] w-[50%] -translate-x-1/2 -translate-y-1/2 rounded-full bg-blue-100/50 shadow-[0_0_80px_30px_rgba(191,219,254,.35)]" />

      {/* The dashed ring, its dots and the five solutions turn clockwise round the centre */}
      <div className="orbit-spin absolute inset-0">
        <div
          className="absolute rounded-full border-2 border-dashed border-sky-400/70"
          style={{ inset: `${50 - RING}%` }}
        />
        {DOTS.map((deg) => {
          const rad = (deg * Math.PI) / 180;
          return (
            <span
              key={deg}
              className="absolute h-[1.8%] w-[1.8%] -translate-x-1/2 -translate-y-1/2 rounded-full bg-sky-500 ring-4 ring-sky-100"
              style={{ left: `${50 + RING * Math.cos(rad)}%`, top: `${50 + RING * Math.sin(rad)}%` }}
            />
          );
        })}

        {/* The five solutions; each counter-turns so its label stays upright */}
        {ITEMS.map((s) => (
          <a
            key={s.id}
            href={s.href}
            className={cn(
              'absolute w-[19%] -translate-x-1/2 -translate-y-1/2 transition-transform duration-300 ease-out',
              s.id === active && 'z-10 scale-110',
            )}
            style={{ left: `${s.at.x}%`, top: `${s.at.y}%` }}
            tabIndex={-1}
          >
            <span className="orbit-counter block">
              <span
                className={cn(
                  'block rounded-[18%] border bg-white/95 p-[9%] shadow-xl shadow-blue-900/10 transition-[border-color,box-shadow] duration-300',
                  s.id === active ? 'border-blue-500 ring-2 ring-blue-500/30' : 'border-white',
                )}
                style={{ transform: `rotate(${s.at.r}deg)` }}
              >
                <span className={`flex aspect-[1.2] items-center justify-center rounded-[20%] bg-gradient-to-br ${s.tile} text-white shadow-lg`}>
                  <s.icon className="h-[42%] w-[42%]" strokeWidth={2.25} aria-hidden="true" />
                </span>
                <span
                  className={`mt-[10%] block text-center font-semibold leading-tight text-[#1E3A8A] ${s.id === 'reputation' ? '' : 'whitespace-nowrap'}`}
                  style={{ fontSize: 'clamp(8px, 1.9cqw, 14px)' }}
                >
                  {s.short}
                </span>
              </span>
            </span>
          </a>
        ))}
      </div>

      {/* Centre: the AQOSS mark */}
      <div className="absolute left-1/2 top-1/2 flex aspect-square w-[27%] -translate-x-1/2 -translate-y-1/2 flex-col items-center justify-center gap-[6%] rounded-[22%] border border-white bg-white shadow-2xl shadow-blue-900/15">
        <AqossMark className="h-[44%] w-auto" />
        <span className="font-extrabold tracking-tight text-[#0B1B3F]" style={{ fontSize: 'clamp(13px, 4cqw, 29px)' }}>
          AQOSS
        </span>
      </div>
    </div>
  );
}
