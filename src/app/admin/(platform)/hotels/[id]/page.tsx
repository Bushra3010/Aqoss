import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { getAdminSession, can, canAccessHotel } from '@/lib/auth/session';
import { createAdminSupabase } from '@/lib/supabase/admin';
import { hotelPanelPath } from '@/lib/admin/hotel-panel';
import { PageHeader, NoAccess, StatTile } from '@/components/admin/shared';
import { HotelForm } from '@/components/admin/HotelForm';
import { StatusBadge } from '@/components/ui';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Hotel · AQOSS CRM' };

export default async function HotelDetailPage({ params }: { params: { id: string } }) {
  const session = await getAdminSession();
  if (!can(session, 'hotels.read')) return <NoAccess />;
  if (!canAccessHotel(session, params.id)) return <NoAccess />;

  const supabase = createAdminSupabase();

  const { data: hotel } = await supabase
    .from('hotels')
    .select('*, websites (id, name, slug, status), room_types (id, name, base_price, is_active)')
    .eq('id', params.id)
    .maybeSingle();

  if (!hotel) notFound();

  /* eslint-disable @typescript-eslint/no-explicit-any */
  const h = hotel as any;

  return (
    <>
      <PageHeader
        title={h.name}
        description={[h.city, h.state, h.country].filter(Boolean).join(', ')}
        action={
          <>
            <StatusBadge status={h.status} />
            <Link href={hotelPanelPath(h.slug)} className="btn-primary">Open hotel admin</Link>
            <Link href="/admin/hotels" className="btn-outline">Back</Link>
          </>
        }
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <StatTile label="Websites" value={h.websites?.length ?? 0} href="/admin/websites" />
        <StatTile label="Room types" value={h.room_types?.length ?? 0} href={`/admin/rooms?hotel=${h.id}`} />
        <StatTile label="Tax rate" value={`${h.tax_percent}%`} />
      </div>

      {h.websites?.length ? (
        <section className="card mb-6 p-5">
          <h2 className="text-sm font-semibold text-slate-900">Websites</h2>
          <ul className="mt-3 space-y-2">
            {h.websites.map((w: any) => (
              <li key={w.id} className="flex items-center justify-between gap-3 text-sm">
                <Link href={`/admin/websites/${w.id}`} className="font-medium text-slate-900 hover:underline">
                  {w.name}
                </Link>
                <div className="flex items-center gap-3">
                  <StatusBadge status={w.status} />
                  <Link
                    href={`/?preview_site=${w.slug}`}
                    className="text-xs text-slate-500 hover:text-slate-900"
                    target="_blank"
                  >
                    Preview
                  </Link>
                </div>
              </li>
            ))}
          </ul>
        </section>
      ) : (
        <section className="card mb-6 p-5">
          <h2 className="text-sm font-semibold text-slate-900">No website yet</h2>
          <p className="mt-1 text-sm text-slate-500">
            Create one to put this hotel online using the shared template.
          </p>
          <Link href={`/admin/websites/new?hotel=${h.id}`} className="btn-primary mt-3">
            Create website
          </Link>
        </section>
      )}

      {can(session, 'hotels.write') ? <HotelForm hotel={h} /> : null}
    </>
  );
}
