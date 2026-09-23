import Link from 'next/link';
import { formatTime } from '@/lib/utils';
import type { HotelSiteData } from '@/types';

export function SiteFooter({ site }: { site: HotelSiteData }) {
  const { hotel } = site;
  const address = [hotel.address_line1, hotel.address_line2, hotel.city, hotel.state, hotel.postal_code]
    .filter(Boolean)
    .join(', ');

  return (
    <footer className="mt-20 border-t border-slate-200 bg-white">
      <div className="container-page grid gap-10 py-12 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <h2 className="text-base font-bold text-slate-900">{hotel.name}</h2>
          {hotel.tagline ? <p className="mt-2 text-sm text-slate-600">{hotel.tagline}</p> : null}
          <p className="mt-4 text-sm text-slate-600">{address}</p>
        </div>

        <div>
          <h3 className="text-sm font-semibold text-slate-900">Explore</h3>
          <ul className="mt-3 space-y-2 text-sm text-slate-600">
            <li><Link href="/rooms" className="hover:text-slate-900">Rooms &amp; suites</Link></li>
            <li><Link href="/location" className="hover:text-slate-900">Location</Link></li>
            <li><Link href="/property-rules" className="hover:text-slate-900">Property rules</Link></li>
            <li><Link href="/reviews" className="hover:text-slate-900">Guest reviews</Link></li>
          </ul>
        </div>

        <div>
          <h3 className="text-sm font-semibold text-slate-900">Your stay</h3>
          <ul className="mt-3 space-y-2 text-sm text-slate-600">
            <li>Check-in from {formatTime(hotel.check_in_time)}</li>
            <li>Check-out by {formatTime(hotel.check_out_time)}</li>
            <li><Link href="/dashboard" className="hover:text-slate-900">Manage booking</Link></li>
          </ul>
        </div>

        <div>
          <h3 className="text-sm font-semibold text-slate-900">Contact</h3>
          <ul className="mt-3 space-y-2 text-sm text-slate-600">
            {hotel.phone ? (
              <li><a href={`tel:${hotel.phone}`} className="hover:text-slate-900">{hotel.phone}</a></li>
            ) : null}
            {hotel.email ? (
              <li><a href={`mailto:${hotel.email}`} className="hover:text-slate-900">{hotel.email}</a></li>
            ) : null}
          </ul>
        </div>
      </div>

      <div className="border-t border-slate-200 py-6">
        <div className="container-page flex flex-col items-center justify-between gap-2 text-xs text-slate-500 sm:flex-row">
          <p>© {new Date().getFullYear()} {hotel.name}. All rights reserved.</p>
          <p>Powered by AQOSS Hotels</p>
        </div>
      </div>
    </footer>
  );
}
