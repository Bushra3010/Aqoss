import Link from 'next/link';
import { ChevronRight } from 'lucide-react';

/**
 * Frame of the AQOSS website's plain-text pages (privacy, terms): breadcrumb,
 * title, last-updated date and readable prose. Sections are ordinary `h2` /
 * `p` / `ul` children.
 */
export function LegalPage({ title, updated, children }: { title: string; updated?: string; children: React.ReactNode }) {
  return (
    <section className="bg-white">
      <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6 lg:py-20">
        <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-sm text-slate-500">
          <Link href="/" className="hover:text-slate-800">Home</Link>
          <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
          <span className="font-medium text-slate-800" aria-current="page">{title}</span>
        </nav>
        <h1 className="mt-6 text-4xl font-extrabold tracking-tight text-[#0B1B3F] sm:text-5xl">{title}</h1>
        {updated ? <p className="mt-3 text-sm text-slate-500">Last updated {updated}</p> : null}
        <div className="mt-10 space-y-4 leading-relaxed text-slate-600 [&_a]:font-medium [&_a]:text-blue-700 [&_a:hover]:underline [&_h2]:pt-6 [&_h2]:text-xl [&_h2]:font-bold [&_h2]:text-[#0B1B3F] [&_ul]:list-disc [&_ul]:space-y-1.5 [&_ul]:pl-5">
          {children}
        </div>
      </div>
    </section>
  );
}
