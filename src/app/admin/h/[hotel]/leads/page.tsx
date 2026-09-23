import Link from 'next/link';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { can } from '@/lib/auth/session';
import { getHotelPanel, hotelPanelPath } from '@/lib/admin/hotel-panel';
import { listLeads, LEAD_STATUSES, type LeadStatus } from '@/services/lead.service';
import { NoAccess, PageHeader, StatTile } from '@/components/admin/shared';
import { LeadsBoard } from '@/components/admin/LeadsBoard';
import { formatCurrency } from '@/lib/utils';
import { env } from '@/lib/env';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Leads · Hotel admin' };

/** Abandoned bookings to follow up. */
export default async function HotelLeadsPage({
  params,
  searchParams,
}: {
  params: { hotel: string };
  searchParams: { status?: string };
}) {
  const panel = await getHotelPanel(params.hotel);
  if (!panel) notFound();
  if (!can(panel.session, 'leads.read')) return <NoAccess />;

  const { hotel } = panel;
  const all = await listLeads(hotel.id);

  const status = LEAD_STATUSES.includes(searchParams.status as LeadStatus)
    ? (searchParams.status as LeadStatus)
    : null;
  // Open work by default: leads nobody has closed yet.
  const leads = status ? all.filter((l) => l.status === status) : all.filter((l) => l.status === 'NEW' || l.status === 'CONTACTED');

  const count = (s: LeadStatus) => all.filter((l) => l.status === s).length;
  const openValue = all
    .filter((l) => (l.status === 'NEW' || l.status === 'CONTACTED') && !l.stale)
    .reduce((sum, l) => sum + l.totalAmount, 0);

  const base = hotelPanelPath(hotel.slug, 'leads');
  const bookingHref = Object.fromEntries(
    leads.map((l) => [l.bookingId, hotelPanelPath(hotel.slug, `bookings/${l.bookingId}`)]),
  );

  return (
    <>
      <PageHeader
        title="Leads"
        description={`Guests who entered their details but did not pay within ${env.bookingHoldMinutes} minutes. Call or email them to finish the booking.`}
      />

      <div className="mb-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <StatTile label="New" value={count('NEW')} href={`${base}?status=NEW`} />
        <StatTile label="Contacted" value={count('CONTACTED')} href={`${base}?status=CONTACTED`} />
        <StatTile label="Converted" value={count('CONVERTED')} hint="Paid after follow-up" href={`${base}?status=CONVERTED`} />
        <StatTile label="Lost" value={count('LOST')} href={`${base}?status=LOST`} />
        <StatTile label="Open value" value={formatCurrency(openValue, hotel.currency)} hint="Upcoming stays still to win" />
      </div>

      <nav aria-label="Lead status" className="mb-4 flex flex-wrap gap-2 text-sm">
        {[
          { label: 'Open', value: null },
          ...LEAD_STATUSES.map((s) => ({ label: s.charAt(0) + s.slice(1).toLowerCase(), value: s })),
        ].map((tab) => {
          const active = tab.value === status;
          return (
            <Link
              key={tab.label}
              href={tab.value ? `${base}?status=${tab.value}` : base}
              aria-current={active ? 'page' : undefined}
              className={
                active
                  ? 'rounded-full bg-blue-600 px-3 py-1.5 font-medium text-white'
                  : 'rounded-full border border-slate-200 bg-white px-3 py-1.5 font-medium text-slate-600 hover:border-slate-300'
              }
            >
              {tab.label}
            </Link>
          );
        })}
      </nav>

      <LeadsBoard leads={leads} canWrite={can(panel.session, 'leads.write')} bookingHref={bookingHref} />
    </>
  );
}
