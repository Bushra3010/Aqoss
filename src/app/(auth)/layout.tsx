import Link from 'next/link';
import { getSiteBase } from '@/lib/tenant';
import { siteHome } from '@/lib/site-url';

/** Minimal shell for the auth screens — works on any hotel domain. */
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="container-page flex h-16 items-center">
          <Link href={siteHome(getSiteBase())} className="text-sm font-semibold text-slate-900">
            ← Back to the hotel
          </Link>
        </div>
      </header>

      <main className="flex flex-1 items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">{children}</div>
      </main>
    </div>
  );
}
