import Link from 'next/link';
import { ArrowRight, CalendarCheck, Globe, Megaphone, Star, TrendingUp, Zap } from 'lucide-react';

/**
 * Only what the platform really does goes in these lists — this page sells it.
 * Each card's id is the anchor the header menu and the Accelerator link to.
 */
const SOLUTIONS = [
  {
    id: 'website',
    href: '/ai-website',
    icon: Globe,
    title: 'AI-empowered website',
    banner: 'from-sky-400 to-blue-600',
    dot: 'bg-blue-600',
    text: 'A fast, mobile-ready website for every property on its own subdomain — create, publish and update it in minutes, not days.',
    points: ['Your own subdomain, or your own domain', 'SEO-friendly, mobile-first design', 'Built to be found on search'],
  },
  {
    id: 'marketing',
    href: '/ai-marketing',
    icon: Megaphone,
    title: 'AI-empowered marketing',
    banner: 'from-violet-400 to-purple-700',
    dot: 'bg-purple-600',
    text: 'Bring guests back and fill your rooms with smart, timely offers. Reach the right guests at the right time.',
    points: ['Seasonal, early-bird and last-minute offers', 'Coupon codes checked at checkout', 'Automatic confirmation and reminder messages'],
  },
  {
    id: 'sales',
    href: '/ai-sales',
    icon: TrendingUp,
    title: 'AI-empowered sales',
    banner: 'from-sky-400 to-blue-600',
    dot: 'bg-blue-600',
    text: 'Never lose a guest who almost booked. Smart follow-ups and a unified sales dashboard help you turn interest into revenue.',
    points: ['Abandoned bookings become leads', 'Phone and walk-in bookings at the desk', 'Real-time booking insights'],
  },
  {
    id: 'booking',
    href: '/booking-engine',
    icon: CalendarCheck,
    title: 'AI-empowered booking engine',
    banner: 'from-fuchsia-400 to-purple-600',
    dot: 'bg-purple-600',
    text: 'Give guests a seamless, fast and secure booking experience — with real-time availability, secure payments and more.',
    points: ['Real-time room availability', 'Secure online payments and refunds', 'Mobile-optimized booking flow'],
  },
  {
    id: 'reputation',
    href: '/reputation',
    icon: Star,
    title: 'AI-empowered reputation',
    banner: 'from-orange-300 to-rose-400',
    dot: 'bg-orange-500',
    text: 'Build trust and get more 5-star reviews. Collect reviews from guests who really stayed and reply to them publicly.',
    points: ['Verified reviews from completed stays', 'Approve, hide and reply to reviews', 'Ratings shown on your website'],
  },
] as const;

/** "Everything a hotel needs, AI-empowered": the five solutions in detail. */
export function Solutions() {
  return (
    <section className="relative isolate overflow-hidden bg-gradient-to-br from-[#F4F8FF] via-[#F8FAFF] to-[#EEF4FD]">
      <div className="absolute -right-40 -top-24 -z-10 h-[760px] w-[760px] rounded-full bg-[#E6EFFC]/70" aria-hidden="true" />

      <div className="relative mx-auto max-w-7xl px-4 py-20 sm:px-6">
        <div className="relative">
          <p className="inline-flex items-center gap-2 rounded-full bg-blue-100/70 px-4 py-2 text-sm font-medium text-blue-700">
            <Zap className="h-4 w-4 fill-blue-600 text-blue-600" aria-hidden="true" />
            AI-Powered Hotel Solutions
          </p>
          <h2 className="mt-6 text-4xl font-extrabold leading-[1.1] tracking-tight text-[#0B1B3F] sm:text-[52px]">
            Everything a hotel needs,
            <span className="block bg-gradient-to-r from-blue-700 to-blue-500 bg-clip-text pb-1 text-transparent">AI-empowered</span>
          </h2>
          <p className="mt-5 max-w-xl text-lg leading-relaxed text-slate-600">
            From your website to your bookings, reviews to reputation — AQOSS brings it all together in one powerful
            platform.
          </p>

          <div className="mt-14 grid gap-5 md:grid-cols-6">
            {SOLUTIONS.map((s, i) => (
              <article
                key={s.id}
                id={s.id}
                className={`flex scroll-mt-24 flex-col rounded-2xl border border-white bg-white p-4 shadow-lg shadow-blue-900/[0.06] ${i < 3 ? 'md:col-span-2' : 'md:col-span-3'}`}
              >
                <div className={`flex h-[72px] items-center justify-center rounded-xl bg-gradient-to-r ${s.banner}`}>
                  <s.icon className="h-9 w-9 text-white" strokeWidth={1.75} aria-hidden="true" />
                </div>
                <div className="px-1 pb-1">
                  <h3 className="mt-5 text-[17px] font-bold text-[#0B1B3F]">{s.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-slate-500">{s.text}</p>
                  <ul className="mt-4 space-y-1.5 text-sm text-slate-600">
                    {s.points.map((p) => (
                      <li key={p} className="flex gap-2.5">
                        <span className={`mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full ${s.dot}`} aria-hidden="true" />
                        {p}
                      </li>
                    ))}
                  </ul>
                  <Link href={s.href} className="group mt-5 inline-flex items-center gap-1.5 text-sm font-semibold text-blue-700">
                    Learn more <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" aria-hidden="true" />
                  </Link>
                </div>
              </article>
            ))}
          </div>
        </div>

      </div>
    </section>
  );
}
