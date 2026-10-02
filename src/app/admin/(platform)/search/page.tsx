import Link from 'next/link';
import type { Metadata } from 'next';
import { ArrowRight, Building2, CalendarDays, Globe, Search, User } from 'lucide-react';
import { getAdminSession, can } from '@/lib/auth/session';
import { createAdminSupabase } from '@/lib/supabase/admin';
import { ilikeTerm } from '@/lib/admin/search-term';
import { PageHeader } from '@/components/admin/shared';
import { StatusBadge } from '@/components/ui';
import { formatDate } from '@/lib/utils';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Search · AQOSS CRM' };

const PER_GROUP = 8;

/* eslint-disable @typescript-eslint/no-explicit-any */

/**
 * The top bar's search: hotels, websites, bookings and customers at once.
 * Each group appears only with its read permission, and hotel-scoped admins
 * only see their own hotels' rows — the same rules as the list pages.
 */
export default async function SearchPage({ searchParams }: { searchParams: { q?: string } }) {
  const session = await getAdminSession();
  const q = (searchParams.q ?? '').trim();
  const term = ilikeTerm(q);
  const scope = session?.hotelScope ?? [];
  const supabase = createAdminSupabase();

  const scoped = <T,>(query: T & { in: (c: string, v: string[]) => T }, column: string): T =>
    scope.length ? query.in(column, scope) : query;

  const [hotels, websites, bookings, customers] = term
    ? await Promise.all([
        can(session, 'hotels.read')
          ? scoped(
              supabase.from('hotels').select('id, name, city, status').or(`name.ilike.${term},city.ilike.${term}`).order('name').limit(PER_GROUP) as any,
              'id',
            )
          : null,
        can(session, 'websites.read')
          ? scoped(
              supabase.from('websites').select('id, name, slug, status').or(`name.ilike.${term},slug.ilike.${term}`).order('name').limit(PER_GROUP) as any,
              'hotel_id',
            )
          : null,
        can(session, 'bookings.read')
          ? scoped(
              supabase
                .from('bookings')
                .select('id, reference, guest_name, check_in, status, hotels (name)')
                .or(`reference.ilike.${term},guest_name.ilike.${term},guest_email.ilike.${term}`)
                .order('created_at', { ascending: false })
                .limit(PER_GROUP) as any,
              'hotel_id',
            )
          : null,
        // Customers are platform-wide rows, so only unscoped admins search them.
        can(session, 'customers.read') && !scope.length
          ? supabase
              .from('profiles')
              .select('id, full_name, email, mobile')
              .eq('is_admin', false)
              .or(`full_name.ilike.${term},email.ilike.${term},mobile.ilike.${term}`)
              .limit(PER_GROUP)
          : null,
      ])
    : [null, null, null, null];

  const rows = (r: any) => ((r?.data ?? []) as any[]);
  const groups = [
    {
      key: 'hotels',
      title: 'Hotels',
      icon: Building2,
      all: `/admin/hotels?q=${encodeURIComponent(q)}`,
      items: rows(hotels).map((h) => ({ href: `/admin/hotels/${h.id}`, title: h.name, sub: h.city, status: h.status })),
      shown: Boolean(hotels),
    },
    {
      key: 'websites',
      title: 'Websites',
      icon: Globe,
      all: `/admin/websites?q=${encodeURIComponent(q)}`,
      items: rows(websites).map((w) => ({ href: `/admin/websites/${w.id}`, title: w.name, sub: `/${w.slug}`, status: w.status })),
      shown: Boolean(websites),
    },
    {
      key: 'bookings',
      title: 'Bookings',
      icon: CalendarDays,
      all: `/admin/bookings?q=${encodeURIComponent(q)}`,
      items: rows(bookings).map((b) => {
        const hotel = Array.isArray(b.hotels) ? b.hotels[0] : b.hotels;
        return {
          href: `/admin/bookings/${b.id}`,
          title: `${b.reference} · ${b.guest_name}`,
          sub: `${hotel?.name ?? ''} · ${formatDate(b.check_in)}`,
          status: b.status,
        };
      }),
      shown: Boolean(bookings),
    },
    {
      key: 'customers',
      title: 'Customers',
      icon: User,
      all: `/admin/customers?q=${encodeURIComponent(q)}`,
      items: rows(customers).map((c) => ({ href: `/admin/customers/${c.id}`, title: c.full_name ?? c.email, sub: [c.email, c.mobile].filter(Boolean).join(' · '), status: null })),
      shown: Boolean(customers),
    },
  ].filter((g) => g.shown);

  const total = groups.reduce((n, g) => n + g.items.length, 0);

  return (
    <>
      <PageHeader
        title={q ? `Results for “${q}”` : 'Search'}
        description={q ? `${total} match${total === 1 ? '' : 'es'} across hotels, websites, bookings and customers.` : 'Type in the search bar above to find hotels, websites, bookings and customers.'}
      />

      {q && !total ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center">
          <Search className="mx-auto h-8 w-8 text-slate-300" aria-hidden="true" />
          <p className="mt-3 font-semibold text-slate-900">Nothing matches “{q}”</p>
          <p className="mt-1 text-sm text-slate-500">Try a hotel name, city, booking reference, guest name or email.</p>
        </div>
      ) : null}

      <div className="grid gap-5 lg:grid-cols-2">
        {groups
          .filter((g) => g.items.length)
          .map((g) => (
            <section key={g.key} className="rounded-2xl border border-slate-200 bg-white">
              <header className="flex items-center justify-between border-b border-slate-100 px-5 py-3.5">
                <h2 className="flex items-center gap-2 text-base font-bold text-slate-900">
                  <g.icon className="h-4 w-4 text-slate-400" aria-hidden="true" />
                  {g.title}
                </h2>
                <Link href={g.all} className="inline-flex items-center gap-1 text-sm font-medium text-blue-700 hover:underline">
                  See all <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                </Link>
              </header>
              <ul className="divide-y divide-slate-100">
                {g.items.map((item) => (
                  <li key={item.href}>
                    <Link href={item.href} className="flex items-center justify-between gap-3 px-5 py-3 hover:bg-slate-50">
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-medium text-slate-900">{item.title}</span>
                        {item.sub ? <span className="block truncate text-xs text-slate-500">{item.sub}</span> : null}
                      </span>
                      {item.status ? <StatusBadge status={item.status} /> : null}
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          ))}
      </div>
    </>
  );
}
