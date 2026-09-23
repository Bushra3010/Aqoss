import 'server-only';

import { cache } from 'react';
import { headers } from 'next/headers';
import { createAdminSupabase } from '@/lib/supabase/admin';
import { env, isDemoMode } from '@/lib/env';
import type { TenantContext } from '@/types';

/** Header set by middleware so route handlers and pages see the same hostname. */
export const HOST_HEADER = 'x-aqoss-host';
/** Set when an admin is previewing an unpublished website (PRD §47). */
export const PREVIEW_HEADER = 'x-aqoss-preview-site';

/** Strip the port and any leading `www.` so lookups are stable. */
export function normalizeHostname(host: string): string {
  return host.toLowerCase().split(':')[0].replace(/^www\./, '');
}

/**
 * Resolve a hostname to its website + hotel (PRD §38).
 *
 * Tries, in order:
 *   1. an exact `website_domains.hostname` match (with and without `www.`)
 *   2. the leading label as a website slug — covers `hotel-a.localhost` in dev
 *      and `hotel-a.aqoss.app` style platform subdomains
 *   3. DEFAULT_WEBSITE_SLUG, a development convenience only
 */
export const resolveTenantByHost = cache(
  async (rawHost: string): Promise<TenantContext | null> => {
    const supabase = createAdminSupabase();
    const host = normalizeHostname(rawHost);

    const { data: byDomain } = await supabase
      .from('website_domains')
      .select('website_id, websites!inner(id, slug, status, hotel_id, hotels!inner(slug))')
      .in('hostname', [host, `www.${host}`])
      .limit(1)
      .maybeSingle();

    if (byDomain) return shape(byDomain.websites);

    // Platform subdomain: <website-slug>.<root domain>
    const rootDomain = normalizeHostname(env.rootDomain);
    const label = host.endsWith(`.${rootDomain}`)
      ? host.slice(0, -(rootDomain.length + 1))
      : host.split('.').length > 1
        ? host.split('.')[0]
        : null;

    const slug = label && label !== 'www' ? label : env.defaultWebsiteSlug;

    if (slug) {
      const { data: bySlug } = await supabase
        .from('websites')
        .select('id, slug, status, hotel_id, hotels!inner(slug)')
        .eq('slug', slug)
        .limit(1)
        .maybeSingle();

      if (bySlug) return shape(bySlug);
    }

    // In demo mode an unmapped hostname (plain localhost) serves the first
    // hotel, so the app is browsable the moment the server starts.
    if (isDemoMode) {
      const { data: fallback } = await supabase
        .from('websites')
        .select('id, slug, status, hotel_id, hotels!inner(slug)')
        .eq('status', 'ACTIVE')
        .limit(1)
        .maybeSingle();

      if (fallback) return shape(fallback);
    }

    return null;
  },
);

/** Look a website up by slug — used by the CRM preview. */
export const resolveTenantBySlug = cache(
  async (slug: string): Promise<TenantContext | null> => {
    const supabase = createAdminSupabase();
    const { data } = await supabase
      .from('websites')
      .select('id, slug, status, hotel_id, hotels!inner(slug)')
      .eq('slug', slug)
      .limit(1)
      .maybeSingle();
    return data ? shape(data) : null;
  },
);

/* eslint-disable @typescript-eslint/no-explicit-any */
function shape(row: any): TenantContext {
  const hotel = Array.isArray(row.hotels) ? row.hotels[0] : row.hotels;
  return {
    websiteId: row.id,
    websiteSlug: row.slug,
    hotelId: row.hotel_id,
    hotelSlug: hotel?.slug ?? '',
    status: row.status,
  };
}

/**
 * Is the caller previewing, and are they allowed to?
 *
 * Middleware forwards the requested preview slug but grants nothing; the
 * decision is made here, where we can check the session against admin_users.
 */
export const getActivePreviewSlug = cache(async (): Promise<string | null> => {
  const slug = headers().get(PREVIEW_HEADER);
  if (!slug) return null;

  const { createServerSupabase } = await import('@/lib/supabase/server');
  const supabase = createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await createAdminSupabase()
    .from('admin_users')
    .select('id')
    .eq('profile_id', user.id)
    .eq('is_active', true)
    .maybeSingle();

  return data ? slug : null;
});

/**
 * The tenant for the current request, or null if the hostname is unknown.
 * An authorised preview wins over the hostname.
 */
export const getTenant = cache(async (): Promise<TenantContext | null> => {
  const preview = await getActivePreviewSlug();
  if (preview) return resolveTenantBySlug(preview);

  const h = headers();
  const host = h.get(HOST_HEADER) ?? h.get('host') ?? '';
  if (!host) return null;
  return resolveTenantByHost(host);
});

/**
 * A tenant that is live to the public. An unpublished website resolves to null
 * unless an authorised admin is previewing it.
 */
export const getPublishedTenant = cache(async (): Promise<TenantContext | null> => {
  const tenant = await getTenant();
  if (!tenant) return null;
  if (tenant.status === 'ACTIVE') return tenant;
  return (await getActivePreviewSlug()) ? tenant : null;
});

/** True when this request is for the CRM host rather than a hotel website. */
export function isAdminHost(host: string): boolean {
  return normalizeHostname(host) === normalizeHostname(env.adminHost);
}
