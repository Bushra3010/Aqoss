import Link from 'next/link';
import { ArrowRight, ChevronRight, type LucideIcon } from 'lucide-react';

/**
 * A Resources page whose content does not exist yet. Says so plainly rather
 * than showing sample posts or videos that look real.
 */
export function ComingSoon({ icon: Icon, title, text }: { icon: LucideIcon; title: string; text: string }) {
  return (
    <section className="relative isolate overflow-hidden bg-gradient-to-br from-[#F4F8FF] via-white to-[#EEF4FD]">
      <div className="absolute -right-40 -top-40 -z-10 h-[640px] w-[640px] rounded-full bg-[#E6EFFC]/70" aria-hidden="true" />
      <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6 lg:py-24">
        <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-sm text-slate-500">
          <Link href="/" className="hover:text-slate-800">Home</Link>
          <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
          <span>Resources</span>
          <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
          <span className="font-medium text-slate-800" aria-current="page">{title}</span>
        </nav>

        <span className="mt-10 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-sky-400 to-blue-600 text-white shadow-lg shadow-blue-700/20">
          <Icon className="h-8 w-8" aria-hidden="true" />
        </span>
        <p className="mt-6 inline-flex rounded-full bg-blue-100/70 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-blue-700">
          Coming soon
        </p>
        <h1 className="mt-4 text-4xl font-extrabold tracking-tight text-[#0B1B3F] sm:text-5xl">{title}</h1>
        <p className="mt-5 max-w-xl text-lg leading-relaxed text-slate-600">{text}</p>

        <div className="mt-8 flex flex-wrap items-center gap-x-8 gap-y-4">
          <Link href="/#book-demo" className="inline-flex items-center gap-3 rounded-xl bg-blue-700 px-8 py-4 text-[15px] font-semibold text-white shadow-lg shadow-blue-700/25 hover:bg-blue-800">
            Book a Demo <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
          <Link href="/" className="group inline-flex items-center gap-2 text-[15px] font-semibold text-blue-700">
            Back to home <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" aria-hidden="true" />
          </Link>
        </div>
      </div>
    </section>
  );
}
