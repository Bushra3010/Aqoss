import Link from 'next/link';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { isDemoMode } from '@/lib/env';
import { createAdminSupabase } from '@/lib/supabase/admin';
import { DEMO_ACCOUNTS } from '@/lib/demo/store';
import { formatCurrency } from '@/lib/utils';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Demo directory · AQOSS' };

/**
 * A way in to the demo dataset: every hotel website, and the accounts you can
 * sign in with. Only exists while demo mode is on.
 */
export default async function DemoIndexPage() {
  if (!isDemoMode) notFound();

  const supabase = createAdminSupabase();

  const { data } = await supabase
    .from('websites')
    .select('id, name, slug, primary_color, hotels!inner (id, name, city, state, star_rating, currency)')
    .eq('status', 'ACTIVE')
    .order('created_at');

  /* eslint-disable @typescript-eslint/no-explicit-any */
  const sites = (data ?? []) as any[];

  const { data: roomTypes } = await supabase.from('room_types').select('hotel_id, base_price');
  const cheapest = new Map<string, number>();
  for (const rt of (roomTypes ?? []) as any[]) {
    const current = cheapest.get(rt.hotel_id);
    if (current == null || rt.base_price < current) cheapest.set(rt.hotel_id, rt.base_price);
  }

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-10">
      <div className="mx-auto w-full max-w-5xl">
        <header>
          <p className="text-sm font-semibold uppercase tracking-widest text-slate-400">
            AQOSS Hotel · demo mode
          </p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-900">
            {sites.length} hotel websites, one codebase
          </h1>
          <p className="mt-3 max-w-2xl text-slate-600">
            Every property below is a database record rendered through the same template. Open any
            of them to see hotel-specific content, live availability and a working booking flow.
            Data lives in memory — restart the server to reset it.
          </p>
        </header>

        <section className="mt-8">
          <h2 className="text-sm font-semibold text-slate-900">Sign in with</h2>
          <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {DEMO_ACCOUNTS.map((account) => (
              <div key={account.email} className="card p-4">
                <p className="font-mono text-xs text-slate-900">{account.email}</p>
                <p className="mt-0.5 font-mono text-xs text-slate-500">{account.password}</p>
                <p className="mt-2 text-xs text-slate-600">{account.description}</p>
              </div>
            ))}
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <Link href="/admin" className="btn-primary">Open the CRM</Link>
            <Link href="/dashboard" className="btn-outline">Customer dashboard</Link>
          </div>
        </section>

        <section className="mt-10">
          <h2 className="text-sm font-semibold text-slate-900">Hotel websites</h2>
          <ul className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {sites.map((site) => {
              const hotel = Array.isArray(site.hotels) ? site.hotels[0] : site.hotels;
              const from = cheapest.get(hotel.id);

              return (
                <li key={site.id} className="card p-4">
                  <span className="flex items-start gap-2.5">
                    <span
                      className="mt-1 h-3 w-3 shrink-0 rounded-full"
                      style={{ backgroundColor: site.primary_color }}
                      aria-hidden="true"
                    />
                    <span className="min-w-0">
                      <a
                        href={`http://${site.slug}.localhost:3000`}
                        className="font-medium text-slate-900 hover:underline"
                      >
                        {hotel.name}
                      </a>
                      <span className="block text-xs text-slate-500">
                        {[hotel.city, hotel.state].filter(Boolean).join(', ')}
                        {hotel.star_rating ? ` · ${hotel.star_rating}★` : ''}
                        {from ? ` · from ${formatCurrency(from, hotel.currency)}` : ''}
                      </span>
                      <code className="mt-1 block truncate text-[11px] text-slate-400">
                        {site.slug}.localhost:3000
                      </code>
                    </span>
                  </span>
                </li>
              );
            })}
          </ul>
        </section>
      </div>
    </main>
  );
}
