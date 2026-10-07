import type { CSSProperties } from 'react';
import { ArrowRight, BarChart3, CalendarDays, Megaphone, Settings, UserRound, Zap } from 'lucide-react';
import { AqossMark } from '@/components/platform/Art';
import { Reveal } from '@/components/platform/Reveal';
import { cn } from '@/lib/utils';

const ITEMS = [
  {
    id: 'website',
    href: '/ai-website',
    icon: CalendarDays,
    title: 'AI Website',
    short: 'AI Website',
    text: 'Get a modern, high-converting hotel website',
    tile: 'from-sky-400 to-blue-600',
    soft: 'bg-blue-50',
    // Centre of its card on the orbit, as % of the art, and its tilt.
    at: { x: 28.5, y: 21, r: -12 },
  },
  {
    id: 'marketing',
    href: '/ai-marketing',
    icon: Megaphone,
    title: 'AI Marketing',
    short: 'AI Marketing',
    text: 'Automate campaigns & boost your visibility',
    tile: 'from-violet-400 to-purple-600',
    soft: 'bg-violet-50',
    at: { x: 71, y: 19, r: 12 },
  },
  {
    id: 'sales',
    href: '/ai-sales',
    icon: BarChart3,
    title: 'AI Sales',
    short: 'AI Sales',
    text: 'Turn more leads into bookings',
    tile: 'from-pink-400 to-pink-600',
    soft: 'bg-pink-50',
    at: { x: 86, y: 53.5, r: -10 },
  },
  {
    id: 'booking',
    href: '/booking-engine',
    icon: Settings,
    title: 'AI Booking Engine',
    short: 'Booking Engine',
    text: 'Seamless, fast and secure reservations',
    tile: 'from-emerald-400 to-green-600',
    soft: 'bg-emerald-50',
    at: { x: 16.5, y: 54, r: -10 },
  },
  {
    id: 'reputation',
    href: '/reputation',
    icon: UserRound,
    title: 'AI Reputation Management',
    short: 'Reputation Management',
    text: 'Build trust and get more 5-star reviews',
    tile: 'from-orange-300 to-orange-500',
    soft: 'bg-orange-50',
    at: { x: 50, y: 83, r: 0 },
  },
] as const;

/** Where the small dots sit on the dashed ring, in degrees (0 = right, clockwise). */
const DOTS = [-90, -22, 32, 128, 152, 205];
const RING = 34.5; // ring radius, % of the art

/** "Assured Quality of Soft Solutions" (the Accelerator): the five solutions, as a list and an orbit. */
export function Accelerator() {
  return (
    <section id="solutions" className="relative isolate scroll-mt-20 overflow-hidden bg-gradient-to-b from-[#F5F8FE] to-white">
      <div className="absolute -right-48 top-24 -z-10 h-[820px] w-[1100px] rounded-full bg-[#EAF1FD]/70 blur-sm" aria-hidden="true" />

      <div className="mx-auto grid max-w-7xl items-center gap-14 px-4 py-20 sm:px-6 lg:grid-cols-[1fr_1.15fr] lg:py-24">
        <Reveal>
          <p data-reveal style={{ '--i': 0 } as CSSProperties} className="inline-flex items-center gap-2 rounded-full bg-blue-100/70 px-4 py-2 text-sm font-medium text-blue-700">
            <Zap className="h-4 w-4 fill-blue-600 text-blue-600" aria-hidden="true" />
            AI-Powered Hotel Solutions
          </p>
          <h2 data-reveal style={{ '--i': 1 } as CSSProperties} className="mt-6 text-5xl font-extrabold leading-[1.05] tracking-tight text-[#0B1B3F] sm:text-6xl">
            Assured Quality of
            <span className="block bg-gradient-to-r from-blue-700 to-blue-500 bg-clip-text pb-1 text-transparent">Soft Solutions</span>
          </h2>
          <p data-reveal style={{ '--i': 2 } as CSSProperties} className="mt-5 max-w-xl text-lg leading-relaxed text-slate-600">
            AQOSS hotel solutions accelerate your hotel&apos;s productivity with smart automation, seamless management, and
            powerful tools — all in one platform.
          </p>

          <ul className="mt-8 max-w-[630px] space-y-3">
            {ITEMS.map((s, i) => (
              <li key={s.id} data-reveal style={{ '--i': 3 + i } as CSSProperties}>
                <a
                  href={s.href}
                  className="group flex items-center gap-4 rounded-xl border border-slate-100 bg-white px-3 py-3 shadow-sm shadow-slate-900/[0.03] transition hover:border-blue-100 hover:shadow-md"
                >
                  <span className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-xl ${s.soft}`}>
                    <span className={`flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br ${s.tile} text-white shadow-sm`}>
                      <s.icon className="h-5 w-5" aria-hidden="true" />
                    </span>
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block font-semibold text-slate-900">{s.title}</span>
                    <span className="block text-sm text-slate-500">{s.text}</span>
                  </span>
                  <ArrowRight className="mr-3 h-5 w-5 shrink-0 text-blue-600 transition group-hover:translate-x-1" aria-hidden="true" />
                </a>
              </li>
            ))}
          </ul>

          <div data-reveal style={{ '--i': 3 + ITEMS.length } as CSSProperties} className="mt-8 flex flex-wrap items-center gap-x-8 gap-y-4">
            <a href="/#book-demo" className="inline-flex items-center gap-3 rounded-xl bg-blue-700 px-14 py-4 text-[15px] font-semibold text-white shadow-lg shadow-blue-700/25 hover:bg-blue-800">
              Book a Demo <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </a>
            <a href="#website" className="group inline-flex items-center gap-2 text-[15px] font-semibold text-blue-700">
              Explore All Features <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" aria-hidden="true" />
            </a>
          </div>
        </Reveal>

        <Orbit />
      </div>
    </section>
  );
}

/**
 * AQOSS at the centre of its five solutions. Text is sized in container units
 * (`cqw`) so the art scales as one piece at any width it is given.
 */
function Orbit({ className = 'max-w-[720px]' }: { className?: string }) {
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
            className="absolute w-[23%] -translate-x-1/2 -translate-y-1/2"
            style={{ left: `${s.at.x}%`, top: `${s.at.y}%` }}
            tabIndex={-1}
          >
            <span className="orbit-counter block">
              <span
                className="block rounded-[18%] border border-white bg-white/95 p-[9%] shadow-xl shadow-blue-900/10"
                style={{ transform: `rotate(${s.at.r}deg)` }}
              >
                <span className={`flex aspect-[1.2] items-center justify-center rounded-[20%] bg-gradient-to-br ${s.tile} text-white shadow-lg`}>
                  <s.icon className="h-[42%] w-[42%]" strokeWidth={2.25} aria-hidden="true" />
                </span>
                <span
                  className={`mt-[10%] block text-center font-semibold leading-tight text-[#1E3A8A] ${s.id === 'reputation' ? '' : 'whitespace-nowrap'}`}
                  style={{ fontSize: 'clamp(8px, 2.2cqw, 16px)' }}
                >
                  {s.short}
                </span>
              </span>
            </span>
          </a>
        ))}
      </div>

      {/* Centre: the AQOSS mark */}
      <div className="absolute left-1/2 top-1/2 flex aspect-square w-[32%] -translate-x-1/2 -translate-y-1/2 flex-col items-center justify-center gap-[6%] rounded-[22%] border border-white bg-white shadow-2xl shadow-blue-900/15">
        <AqossMark className="h-[44%] w-auto" />
        <span className="font-extrabold tracking-tight text-[#0B1B3F]" style={{ fontSize: 'clamp(14px, 4.7cqw, 34px)' }}>
          AQOSS
        </span>
      </div>
    </div>
  );
}
