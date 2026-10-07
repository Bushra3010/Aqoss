import Link from 'next/link';
import { headers } from 'next/headers';
import { notFound } from 'next/navigation';
import { Plus_Jakarta_Sans } from 'next/font/google';
import { isPlatformHost } from '@/lib/site-url';
import { DemoBanner } from '@/components/DemoBanner';
import { AqossMark } from '@/components/platform/Art';
import { PlatformHeader } from '@/components/platform/PlatformClient';
import { ABOUT, NAV, RESOURCES } from '@/components/platform/nav';

const jakarta = Plus_Jakarta_Sans({ subsets: ['latin'], display: 'swap' });

/**
 * Frame of the AQOSS website on the main domain: header, footer and font for
 * the home page and every page in the menu. Middleware rewrites `/`, `/about`
 * and the solution paths here; on a hotel subdomain all of it is a 404.
 */
export default function PlatformLayout({ children }: { children: React.ReactNode }) {
  if (!isPlatformHost(headers().get('x-aqoss-host') ?? headers().get('host') ?? '')) notFound();

  return (
    <div className={`${jakarta.className} min-h-screen bg-white text-slate-900`}>
      <DemoBanner />
      <PlatformHeader />
      <main>{children}</main>

      <footer className="border-t border-slate-200 bg-[#0B1B3F] text-white">
        <div className="mx-auto grid max-w-7xl gap-10 px-4 py-14 sm:px-6 md:grid-cols-[1.4fr_1fr_1fr_1fr]">
          <div>
            <Link href="/" className="flex items-center gap-2.5" aria-label="AQOSS home">
              <AqossMark tone="white" className="h-9 w-auto" />
              <span className="text-xl font-extrabold tracking-tight">AQOSS</span>
            </Link>
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-white/60">
              Assured Quality of Soft Solutions — AI-powered software that runs a hotel&apos;s website, marketing, sales,
              bookings and reviews from one place.
            </p>
            <Link href="/#book-demo" className="mt-6 inline-flex rounded-lg bg-blue-700 px-4 py-2.5 text-sm font-semibold hover:bg-blue-800">
              Book a Demo
            </Link>
          </div>
          <FooterColumn title="Solutions" links={NAV} />
          <FooterColumn title="Resources" links={RESOURCES} />
          <FooterColumn
            title="Company"
            links={[ABOUT, { href: '/admin/login', label: 'Hotel Sign In' }, { href: '/admin/register', label: 'Register your hotel' }]}
          />
        </div>
        <p className="border-t border-white/10 py-6 text-center text-xs text-white/40">
          © {new Date().getFullYear()} AQOSS. All rights reserved.
        </p>
      </footer>
    </div>
  );
}

function FooterColumn({ title, links }: { title: string; links: { href: string; label: string }[] }) {
  return (
    <nav aria-label={title}>
      <p className="text-sm font-semibold">{title}</p>
      <ul className="mt-4 space-y-2.5 text-sm text-white/60">
        {links.map((l) => (
          <li key={l.href}>
            <Link href={l.href} className="hover:text-white">
              {l.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
