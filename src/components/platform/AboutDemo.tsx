import { Caveat } from 'next/font/google';
import { Building2, Headset, ShieldCheck } from 'lucide-react';
import { AqossMark } from '@/components/platform/Art';
import { DemoRequestForm } from '@/components/platform/PlatformClient';

const script = Caveat({ subsets: ['latin'], weight: ['600'], display: 'swap' });

const POINTS = [
  {
    icon: Building2,
    title: 'Built for Hotels',
    text: 'Everything you need to manage your hotel, in one powerful platform.',
    tint: 'bg-blue-50 text-blue-600',
  },
  {
    icon: ShieldCheck,
    title: 'Trusted & Secure',
    text: 'Your data and guest information are protected with secure sign-in, staff roles and an audit trail.',
    tint: 'bg-emerald-50 text-emerald-600',
  },
  {
    icon: Headset,
    title: 'Dedicated Support',
    text: 'We’re here whenever you need us — our team is your success partner.',
    tint: 'bg-violet-50 text-violet-600',
  },
];

/** About AQOSS beside the "Book a demo" form, over a resort photo. */
export function AboutDemo() {
  return (
    <section id="about" className="relative isolate scroll-mt-20 overflow-hidden bg-[#F5F8FE]">
      {/* The photo fills the right side and fades into the page on its left. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/platform/hero.jpg" alt="" className="absolute inset-y-0 right-0 -z-10 hidden h-full w-[58%] object-cover lg:block" />
      <div className="absolute inset-y-0 right-0 -z-10 hidden w-[58%] bg-gradient-to-r from-[#F5F8FE] via-[#F5F8FE]/30 to-transparent lg:block" aria-hidden="true" />

      <div id="book-demo" className="mx-auto grid max-w-7xl scroll-mt-20 items-center gap-12 px-4 py-16 sm:px-6 lg:grid-cols-[1fr_1.15fr] lg:py-20">
        <div className="max-w-lg">
          <div className="flex items-center gap-3">
            <AqossMark className="h-14 w-auto" />
            <span>
              <span className="block text-3xl font-extrabold leading-none tracking-tight text-[#0B1B3F]">AQOSS</span>
              <span className="mt-1 flex items-center gap-2 text-[11px] font-semibold tracking-[0.45em] text-[#0B1B3F]">
                <span className="h-px w-4 bg-[#0B1B3F]/40" aria-hidden="true" />
                HOTEL
                <span className="h-px w-4 bg-[#0B1B3F]/40" aria-hidden="true" />
              </span>
            </span>
          </div>

          <h2 className="mt-8 text-4xl font-extrabold tracking-tight text-[#0B1B3F] sm:text-5xl">
            About <span className="bg-gradient-to-r from-blue-700 to-blue-500 bg-clip-text text-transparent">AQOSS</span>
          </h2>
          <p className="mt-5 leading-relaxed text-slate-600">
            AQOSS — Assured Quality of Soft Solutions — builds software for hotels. Our platform helps{' '}
            <strong className="font-semibold text-slate-800">every property streamline</strong> bookings, payments, guest
            reviews and revenue, so hoteliers can grow direct business without juggling tools.
          </p>

          <ul className="mt-8 space-y-5">
            {POINTS.map((p) => (
              <li key={p.title} className="flex gap-4">
                <span className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${p.tint}`}>
                  <p.icon className="h-6 w-6" aria-hidden="true" />
                </span>
                <span>
                  <span className="block font-semibold text-[#0B1B3F]">{p.title}</span>
                  <span className="block text-sm leading-relaxed text-slate-500">{p.text}</span>
                </span>
              </li>
            ))}
          </ul>

          <div className="mt-10 flex items-end gap-4">
            <div>
              <p className={`${script.className} -rotate-3 text-3xl text-blue-700`}>See it on your hotel!</p>
              <p className="mt-2 max-w-xs text-sm leading-relaxed text-slate-500">
                Book a quick demo and see how AQOSS can transform your hotel&apos;s online presence and operations.
              </p>
            </div>
            <svg viewBox="0 0 90 60" className="mb-6 hidden h-14 w-20 shrink-0 text-blue-600 sm:block" fill="none" aria-hidden="true">
              <path d="M4 10C20 44 50 52 82 40" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
              <path d="M70 32L83 40L70 48" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
        </div>

        <DemoRequestForm />
      </div>
    </section>
  );
}
