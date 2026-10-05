import Link from 'next/link';
import type { Metadata } from 'next';
import { ArrowRight, Building2, ChevronRight, Handshake, Layers, ShieldCheck, Sparkles } from 'lucide-react';
import { createAdminSupabase } from '@/lib/supabase/admin';
import { AqossMark } from '@/components/platform/Art';
import { SOLUTION_LIST } from '@/components/platform/solution-pages';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = {
  title: { absolute: 'About AQOSS — Assured Quality of Soft Solutions' },
  description: 'AQOSS builds AI-powered software for hotels: website, marketing, sales, booking engine and reputation management on one platform.',
};

const LETTERS = [
  ['A', 'Assured'],
  ['Q', 'Quality'],
  ['O', 'of'],
  ['S', 'Soft'],
  ['S', 'Solutions'],
];

const VALUES = [
  { icon: Layers, title: 'One platform', text: 'Website, bookings, payments, offers and reviews share one database — nothing to sync, nothing to re-type.' },
  { icon: Building2, title: 'Built for hotels', text: 'Designed around how a hotel actually runs: rooms, nights, the front desk and the guest.' },
  { icon: ShieldCheck, title: 'Secure by design', text: 'Staff roles and permissions, hotel-level access and an audit trail of every change.' },
  { icon: Handshake, title: 'Direct business', text: 'Every booking on your website is yours — no commission to an online travel agent.' },
];

export default async function AboutPage() {
  const { data } = await createAdminSupabase()
    .from('websites')
    .select('slug, hotels!inner (city)')
    .eq('status', 'ACTIVE')
    .limit(1000);

  /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
  const rows = (data ?? []) as any[];
  const cities = new Set(
    rows.map((w) => (Array.isArray(w.hotels) ? w.hotels[0] : w.hotels)?.city?.trim().toLowerCase()).filter(Boolean),
  ).size;

  const stats = [
    { value: String(rows.length), label: `Hotel website${rows.length === 1 ? '' : 's'} live` },
    { value: String(cities), label: `Cit${cities === 1 ? 'y' : 'ies'}` },
    { value: '5', label: 'Solutions, one platform' },
    { value: '0%', label: 'Commission on direct bookings' },
  ];

  return (
    <>
      {/* ---- Hero ------------------------------------------------------ */}
      <section className="relative isolate overflow-hidden bg-gradient-to-br from-[#F4F8FF] via-white to-[#EEF4FD]">
        <div className="absolute -right-40 -top-40 -z-10 h-[640px] w-[640px] rounded-full bg-[#E6EFFC]/70" aria-hidden="true" />
        <div className="mx-auto grid max-w-7xl items-center gap-14 px-4 py-16 sm:px-6 lg:grid-cols-[1.2fr_1fr] lg:py-24">
          <div>
            <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-sm text-slate-500">
              <Link href="/" className="hover:text-slate-800">Home</Link>
              <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
              <span className="font-medium text-slate-800" aria-current="page">About Us</span>
            </nav>
            <p className="mt-6 inline-flex items-center gap-2 rounded-full bg-blue-100/70 px-4 py-2 text-sm font-medium text-blue-700">
              <Sparkles className="h-4 w-4" aria-hidden="true" />
              About AQOSS
            </p>
            <h1 className="mt-5 text-4xl font-extrabold leading-[1.1] tracking-tight text-[#0B1B3F] sm:text-[52px]">
              Software that lets hoteliers
              <span className="block bg-gradient-to-r from-blue-700 to-blue-500 bg-clip-text pb-1 text-transparent">focus on guests</span>
            </h1>
            <p className="mt-5 max-w-xl text-lg leading-relaxed text-slate-600">
              AQOSS builds AI-powered software for hotels. One platform runs every property&apos;s website, bookings,
              payments, offers and reviews — so hotel teams can grow direct business without juggling tools.
            </p>
          </div>

          <div className="rounded-3xl border border-white bg-white p-8 shadow-2xl shadow-blue-900/10">
            <AqossMark className="h-14 w-auto" />
            <p className="mt-6 text-sm font-semibold uppercase tracking-wider text-slate-500">What our name stands for</p>
            <ul className="mt-4 space-y-2">
              {LETTERS.map(([letter, word], i) => (
                <li key={i} className="flex items-baseline gap-4">
                  <span className="w-8 bg-gradient-to-br from-blue-700 to-blue-500 bg-clip-text text-3xl font-extrabold text-transparent">{letter}</span>
                  <span className="text-xl font-semibold text-[#0B1B3F]">{word}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* ---- Numbers ---------------------------------------------------- */}
      <section className="bg-[#0B1B3F] text-white">
        <ul className="mx-auto grid max-w-7xl grid-cols-2 gap-8 px-4 py-12 sm:px-6 md:grid-cols-4">
          {stats.map((s) => (
            <li key={s.label} className="text-center">
              <p className="text-4xl font-extrabold">{s.value}</p>
              <p className="mt-1 text-sm text-white/60">{s.label}</p>
            </li>
          ))}
        </ul>
      </section>

      {/* ---- Mission + values ------------------------------------------- */}
      <section className="bg-white">
        <div className="mx-auto grid max-w-7xl gap-12 px-4 py-20 sm:px-6 lg:grid-cols-[1fr_1.4fr]">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wider text-blue-700">Our mission</p>
            <h2 className="mt-2 text-3xl font-extrabold tracking-tight text-[#0B1B3F] sm:text-4xl">
              Every hotel deserves software as good as the big chains have
            </h2>
            <p className="mt-5 leading-relaxed text-slate-600">
              Independent hotels lose bookings and margin to scattered tools and commission-hungry channels. AQOSS gives
              each property its own website, booking engine and CRM on one platform, so the guest relationship — and the
              revenue — stays with the hotel.
            </p>
          </div>
          <ul className="grid gap-5 sm:grid-cols-2">
            {VALUES.map((v) => (
              <li key={v.title} className="rounded-2xl border border-slate-100 bg-white p-6 shadow-lg shadow-blue-900/[0.05]">
                <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                  <v.icon className="h-6 w-6" aria-hidden="true" />
                </span>
                <h3 className="mt-4 text-lg font-bold text-[#0B1B3F]">{v.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-500">{v.text}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* ---- Solutions -------------------------------------------------- */}
      <section className="bg-[#F5F8FE]">
        <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6">
          <h2 className="text-3xl font-extrabold tracking-tight text-[#0B1B3F]">What we build</h2>
          <ul className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-5">
            {SOLUTION_LIST.map((s) => (
              <li key={s.slug}>
                <Link href={`/${s.slug}`} className="group flex h-full flex-col rounded-2xl border border-white bg-white p-5 shadow-lg shadow-blue-900/[0.05] transition hover:-translate-y-0.5">
                  <span className={`flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br ${s.tint} text-white`}>
                    <s.icon className="h-5 w-5" aria-hidden="true" />
                  </span>
                  <span className="mt-4 font-bold text-[#0B1B3F]">{s.name}</span>
                  <span className="mt-1 flex-1 text-sm text-slate-500">{s.headline.join(' ')}</span>
                  <span className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-blue-700">
                    Learn more <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" aria-hidden="true" />
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* ---- CTA -------------------------------------------------------- */}
      <section className="bg-white">
        <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6">
          <div className="relative overflow-hidden rounded-3xl bg-[#0B1B3F] px-8 py-14 text-center text-white">
            <div className="absolute -left-20 -top-20 h-72 w-72 rounded-full bg-blue-600/30 blur-3xl" aria-hidden="true" />
            <div className="absolute -bottom-20 -right-20 h-72 w-72 rounded-full bg-violet-600/30 blur-3xl" aria-hidden="true" />
            <h2 className="relative text-3xl font-extrabold tracking-tight">See AQOSS with your hotel in mind</h2>
            <p className="relative mx-auto mt-3 max-w-xl text-white/70">
              A short demo of the website, booking engine and admin panel — set up around your rooms and your guests.
            </p>
            <Link href="/#book-demo" className="relative mt-8 inline-flex items-center gap-2 rounded-lg bg-blue-700 px-6 py-3 text-sm font-semibold hover:bg-blue-800">
              Book a Demo <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
