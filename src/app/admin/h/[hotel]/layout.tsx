import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { headers } from 'next/headers';
import { ExternalLink } from 'lucide-react';
import { getAdminSession, can } from '@/lib/auth/session';
import { getHotelPanel, hotelPanelPath, listPanelHotels } from '@/lib/admin/hotel-panel';
import { AdminShell } from '@/components/admin/AdminShell';
import type { NavItem } from '@/components/admin/AdminSidebar';
import { HotelSwitcher } from '@/components/admin/HotelSwitcher';
import { StatusBadge } from '@/components/ui';

export const dynamic = 'force-dynamic';

/**
 * One hotel's own admin panel, at /admin/h/<hotel-slug>/….
 *
 * Paths are relative to the panel root. Same permission model as the platform
 * CRM; every page additionally re-checks the hotel is in the admin's scope,
 * since a layout is not re-run on every client navigation.
 */
const HOTEL_NAV: (Omit<NavItem, 'href'> & { path: string; permission: string })[] = [
  { path: '', label: 'Overview', icon: 'dashboard', permission: 'dashboard.read', exact: true },
  { path: 'bookings', label: 'Bookings', icon: 'bookings', permission: 'bookings.read' },
  { path: 'leads', label: 'Leads', icon: 'leads', permission: 'leads.read' },
  { path: 'pricing', label: 'Pricing & Availability', icon: 'pricing', permission: 'inventory.read' },
  { path: 'rooms', label: 'Rooms', icon: 'rooms', permission: 'rooms.read' },
  { path: 'images', label: 'Photos', icon: 'images', permission: 'hotels.read' },
  { path: 'offers', label: 'Offers & Coupons', icon: 'offers', permission: 'offers.read' },
  { path: 'reviews', label: 'Reviews', icon: 'reviews', permission: 'reviews.read' },
  { path: 'payments', label: 'Payments', icon: 'payments', permission: 'payments.read' },
  { path: 'website', label: 'Website', icon: 'websites', permission: 'websites.read' },
  { path: 'details', label: 'Hotel details', icon: 'settings', permission: 'hotels.read' },
];

export default async function HotelPanelLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: { hotel: string };
}) {
  const session = await getAdminSession();
  if (!session) {
    const pathname = headers().get('x-aqoss-pathname') || hotelPanelPath(params.hotel);
    redirect(`/admin/login?redirect=${encodeURIComponent(pathname)}`);
  }

  // Unknown hotel and out-of-scope hotel look the same, on purpose.
  const panel = await getHotelPanel(params.hotel);
  if (!panel) notFound();

  const { hotel } = panel;
  const singleHotel = session.hotelScope.length === 1;
  const hotels = singleHotel ? [] : await listPanelHotels(session);

  const main = HOTEL_NAV.filter((i) => can(session, i.permission)).map(
    ({ path, permission: _permission, ...item }) => ({ ...item, href: hotelPanelPath(hotel.slug, path) }),
  );

  return (
    <AdminShell
      session={session}
      main={main}
      admin={[]}
      panel={{
        title: hotel.name,
        subtitle: [hotel.city, hotel.state].filter(Boolean).join(', ') || undefined,
        // A manager of one property has nowhere else to go.
        backHref: singleHotel ? undefined : '/admin/hotels',
      }}
      searchAction={hotelPanelPath(hotel.slug, 'bookings')}
    >
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-5 py-4">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Hotel admin</p>
          <div className="mt-0.5 flex flex-wrap items-center gap-2">
            <p className="truncate text-lg font-bold text-slate-900">{hotel.name}</p>
            <StatusBadge status={hotel.status} />
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {hotels.length > 1 ? <HotelSwitcher current={hotel.slug} hotels={hotels} /> : null}
          {hotel.website ? (
            <Link
              href={`/?preview_site=${hotel.website.slug}`}
              target="_blank"
              className="btn-outline inline-flex items-center gap-1.5"
            >
              View website <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
            </Link>
          ) : null}
        </div>
      </div>

      {children}
    </AdminShell>
  );
}
