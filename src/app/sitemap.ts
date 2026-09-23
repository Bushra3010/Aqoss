import type { MetadataRoute } from 'next';
import { getPublishedTenant } from '@/lib/tenant';
import { createAdminSupabase } from '@/lib/supabase/admin';
import { headers } from 'next/headers';

export const dynamic = 'force-dynamic';

/** Per-website sitemap (PRD §45) — each hotel domain gets its own. */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const tenant = await getPublishedTenant();
  if (!tenant) return [];

  const host = headers().get('x-aqoss-host') ?? headers().get('host') ?? 'localhost:3000';
  const protocol = host.includes('localhost') ? 'http' : 'https';
  const base = `${protocol}://${host}`;

  const { data: rooms } = await createAdminSupabase()
    .from('room_types')
    .select('slug, updated_at')
    .eq('hotel_id', tenant.hotelId)
    .eq('is_active', true);

  const now = new Date();

  return [
    { url: base, lastModified: now, changeFrequency: 'daily', priority: 1 },
    { url: `${base}/rooms`, lastModified: now, changeFrequency: 'daily', priority: 0.9 },
    { url: `${base}/location`, lastModified: now, changeFrequency: 'monthly', priority: 0.6 },
    { url: `${base}/property-rules`, lastModified: now, changeFrequency: 'monthly', priority: 0.5 },
    { url: `${base}/reviews`, lastModified: now, changeFrequency: 'weekly', priority: 0.7 },
    ...(rooms ?? []).map((room) => ({
      url: `${base}/rooms/${room.slug}`,
      lastModified: room.updated_at ? new Date(room.updated_at) : now,
      changeFrequency: 'weekly' as const,
      priority: 0.8,
    })),
  ];
}
