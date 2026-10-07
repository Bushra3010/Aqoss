import Link from 'next/link';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { ArrowRight, Check, ChevronRight } from 'lucide-react';
import { SOLUTION_SLUGS, type SolutionSlug } from '@/components/platform/nav';
import { SOLUTION_LIST, SOLUTION_PAGES, type SolutionPage } from '@/components/platform/solution-pages';
import { SoonTag } from '@/components/platform/SoonTag';

export const dynamicParams = false;

export function generateStaticParams() {
  return SOLUTION_SLUGS.map((solution) => ({ solution }));
}

function find(slug: string): SolutionPage | undefined {
  return (SOLUTION_SLUGS as readonly string[]).includes(slug) ? SOLUTION_PAGES[slug as SolutionSlug] : undefined;
}

export function generateMetadata({ params }: { params: { solution: string } }): Metadata {
  const page = find(params.solution);
  if (!page) return {};
  return { title: { absolute: `${page.name} for hotels — AQOSS` }, description: page.metaDescription };
}

/** One page per solution in the AQOSS menu: /ai-website, /ai-marketing, … */
export default function SolutionDetailPage({ params }: { params: { solution: string } }) {
  const page = find(params.solution);
  if (!page) notFound();

  const others = SOLUTION_LIST.filter((s) => s.slug !== page.slug);

  return (
    <>
      {/* ---- Hero ------------------------------------------------------ */}
      <section className="relative isolate overflow-hidden bg-gradient-to-br from-[#F4F8FF] via-white to-[#EEF4FD]">
        <div className="absolute -right-40 -top-40 -z-10 h-[640px] w-[640px] rounded-full bg-[#E6EFFC]/70" aria-hidden="true" />
        <div className="mx-auto grid max-w-7xl items-center gap-14 px-4 py-16 sm:px-6 lg:grid-cols-[1.1fr_1fr] lg:py-24">
          <div>
            <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-sm text-slate-500">
              <Link href="/" className="hover:text-slate-800">Home</Link>
              <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
              <Link href="/#solutions" className="hover:text-slate-800">Solutions</Link>
              <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
              <span className="font-medium text-slate-800" aria-current="page">{page.name}</span>
            </nav>
            <p className={`mt-6 inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold ${page.soft}`}>
              <page.icon className="h-4 w-4" aria-hidden="true" />
              {page.name}
            </p>
            <h1 className="mt-5 text-4xl font-extrabold leading-[1.1] tracking-tight text-[#0B1B3F] sm:text-[52px]">
              {page.headline[0]}
              <span className={`block bg-gradient-to-r ${page.tint} bg-clip-text pb-1 text-transparent`}>{page.headline[1]}</span>
            </h1>
            <p className="mt-5 max-w-xl text-lg leading-relaxed text-slate-600">{page.intro}</p>
            <div className="mt-8 flex flex-wrap items-center gap-x-8 gap-y-4">
              <Link href="/#book-demo" className="inline-flex items-center gap-3 rounded-xl bg-blue-700 px-8 py-4 text-[15px] font-semibold text-white shadow-lg shadow-blue-700/25 hover:bg-blue-800">
                Book a Demo <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
              <a href="#features" className="group inline-flex items-center gap-2 text-[15px] font-semibold text-blue-700">
                See what&apos;s included <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" aria-hidden="true" />
              </a>
            </div>
          </div>
          <HeroArt page={page} />
        </div>
      </section>

      {/* ---- Features --------------------------------------------------- */}
      <section id="features" className="scroll-mt-20 bg-white">
        <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6">
          <p className={`text-sm font-semibold uppercase tracking-wider ${page.accent}`}>What&apos;s included</p>
          <h2 className="mt-2 max-w-2xl text-3xl font-extrabold tracking-tight text-[#0B1B3F] sm:text-4xl">
            Everything {page.name} gives your hotel
          </h2>
          <ul className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {page.features.map((f) => (
              <li key={f.title} className="rounded-2xl border border-slate-100 bg-white p-6 shadow-lg shadow-blue-900/[0.05] transition hover:-translate-y-0.5 hover:shadow-xl">
                <div className="flex items-start justify-between gap-3">
                  <span className={`flex h-12 w-12 items-center justify-center rounded-xl ${page.soft}`}>
                    <f.icon className="h-6 w-6" aria-hidden="true" />
                  </span>
                  {f.soon ? <SoonTag /> : null}
                </div>
                <h3 className="mt-5 text-lg font-bold text-[#0B1B3F]">{f.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-500">{f.text}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* ---- How it works ----------------------------------------------- */}
      <section className="bg-[#F5F8FE]">
        <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6">
          <h2 className="text-center text-3xl font-extrabold tracking-tight text-[#0B1B3F] sm:text-4xl">How it works</h2>
          <ol className="relative mt-12 grid gap-8 md:grid-cols-3">
            <span className="absolute left-[16%] right-[16%] top-7 hidden border-t-2 border-dashed border-sky-300 md:block" aria-hidden="true" />
            {page.steps.map((step, i) => (
              <li key={step.title} className="relative text-center">
                <span className={`mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br ${page.tint} text-xl font-bold text-white shadow-lg`}>
                  {i + 1}
                </span>
                <h3 className="mt-5 text-lg font-bold text-[#0B1B3F]">{step.title}</h3>
                <p className="mx-auto mt-2 max-w-xs text-sm leading-relaxed text-slate-500">{step.text}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* ---- Panel + CTA ------------------------------------------------ */}
      <section className="bg-white">
        <div className="mx-auto grid max-w-7xl gap-6 px-4 py-20 sm:px-6 lg:grid-cols-2">
          <div className="rounded-2xl border border-slate-100 bg-white p-8 shadow-lg shadow-blue-900/[0.05]">
            <h2 className="text-2xl font-bold text-[#0B1B3F]">{page.panel.title}</h2>
            <p className="mt-2 text-sm text-slate-500">All from the same AQOSS admin panel your team already uses for bookings.</p>
            <ul className="mt-6 space-y-3">
              {page.panel.points.map((p) => (
                <li key={p} className="flex items-start gap-3 text-slate-700">
                  <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-green-100 text-green-700">
                    <Check className="h-3.5 w-3.5" aria-hidden="true" />
                  </span>
                  {p}
                </li>
              ))}
            </ul>
          </div>
          <div className="relative overflow-hidden rounded-2xl bg-[#0B1B3F] p-8 text-white">
            <div className={`absolute -right-16 -top-16 h-56 w-56 rounded-full bg-gradient-to-br ${page.tint} opacity-30 blur-2xl`} aria-hidden="true" />
            <h2 className="relative text-2xl font-bold">See {page.name} on your hotel</h2>
            <p className="relative mt-3 max-w-md leading-relaxed text-white/70">
              Book a short demo and we&apos;ll walk you through it with your own rooms, prices and photos in mind.
            </p>
            <Link href="/#book-demo" className="relative mt-8 inline-flex items-center gap-2 rounded-lg bg-blue-700 px-6 py-3 text-sm font-semibold hover:bg-blue-800">
              Book a Demo <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </div>
        </div>
      </section>

      {/* ---- Other solutions -------------------------------------------- */}
      <section className="bg-[#F5F8FE]">
        <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6">
          <h2 className="text-2xl font-extrabold tracking-tight text-[#0B1B3F] sm:text-3xl">Works even better together</h2>
          <ul className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {others.map((s) => (
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
    </>
  );
}

/** The solution's icon tile on a dashed ring, with three of its highlights. */
function HeroArt({ page }: { page: SolutionPage }) {
  const chipAt = ['left-0 top-[14%]', 'right-0 top-[40%]', 'bottom-[10%] left-[8%]'];
  return (
    <div className="relative mx-auto aspect-square w-full max-w-[460px]" aria-hidden="true">
      <div className="absolute inset-[12%] rounded-full border-2 border-dashed border-sky-300/80" />
      <div className="absolute inset-[26%] rounded-full bg-blue-100/50 shadow-[0_0_80px_30px_rgba(191,219,254,.35)]" />
      <div className="absolute left-1/2 top-1/2 flex aspect-square w-[40%] -translate-x-1/2 -translate-y-1/2 -rotate-6 items-center justify-center rounded-[26%] border-[6px] border-white bg-white shadow-2xl shadow-blue-900/15">
        <span className={`flex h-[82%] w-[82%] items-center justify-center rounded-[22%] bg-gradient-to-br ${page.tint} text-white`}>
          <page.icon className="h-[46%] w-[46%]" strokeWidth={1.75} />
        </span>
      </div>
      {page.chips.map((chip, i) => (
        <span
          key={chip}
          className={`absolute ${chipAt[i]} flex items-center gap-2 rounded-xl border border-white bg-white/95 px-4 py-3 text-sm font-semibold text-[#0B1B3F] shadow-xl shadow-blue-900/10`}
        >
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-green-100 text-green-700">
            <Check className="h-4 w-4" />
          </span>
          {chip}
        </span>
      ))}
    </div>
  );
}
