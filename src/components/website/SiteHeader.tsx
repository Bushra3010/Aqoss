import Link from 'next/link';
import { Mail, Phone, User } from 'lucide-react';
import { getUser } from '@/lib/auth/session';
import type { HotelSiteData } from '@/types';

/**
 * The utility bar across the top of every hotel website.
 *
 * Its colour is the website's own primary colour, so the same markup renders
 * as a different brand per tenant. Booking calls-to-action stay green
 * throughout the template regardless of brand — see BookNowButton.
 */
export async function SiteHeader({ site }: { site: HotelSiteData }) {
  const user = await getUser();
  const logo = site.website.logo_url ?? site.hotel.logo_url;

  return (
    <header style={{ backgroundColor: 'var(--brand-700)' }}>
      <div className="container-page flex h-16 items-center justify-between gap-4">
        <Link href="/" className="flex min-w-0 items-center gap-3">
          {logo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={logo} alt="" className="h-9 w-9 rounded-lg object-cover" />
          ) : null}
          <span className="min-w-0 leading-none">
            <span className="block truncate text-xl font-extrabold tracking-tight text-white">
              {site.hotel.name}
            </span>
            {site.hotel.city ? (
              <span className="mt-1 block truncate text-[10px] font-medium uppercase tracking-[0.25em] text-white/70">
                {site.hotel.city}
              </span>
            ) : null}
          </span>
        </Link>

        <div className="flex items-center gap-5 text-sm text-white">
          {site.hotel.phone ? (
            <a href={`tel:${site.hotel.phone}`} className="hidden items-center gap-2 hover:text-white/80 lg:flex">
              <Phone className="h-4 w-4" />
              {site.hotel.phone}
            </a>
          ) : null}

          {site.hotel.email ? (
            <a href={`mailto:${site.hotel.email}`} className="hidden items-center gap-2 hover:text-white/80 xl:flex">
              <Mail className="h-4 w-4" />
              <span className="max-w-[16rem] truncate">{site.hotel.email}</span>
            </a>
          ) : null}

          <Link
            href={user ? '/dashboard' : '/login'}
            className="flex items-center gap-2 hover:text-white/80"
          >
            <User className="h-4 w-4" />
            <span className="hidden sm:inline">{user ? 'My account' : 'Login'}</span>
          </Link>

          <span className="hidden h-6 w-px bg-white/25 sm:block" aria-hidden="true" />

          <Link
            href="/rooms"
            className="whitespace-nowrap rounded-md bg-green-600/90 px-3 py-2 text-sm font-semibold text-white transition hover:bg-green-600 sm:px-4"
          >
            Book Now
          </Link>
        </div>
      </div>
    </header>
  );
}
