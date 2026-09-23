import type { MetadataRoute } from 'next';
import { headers } from 'next/headers';
import { getPublishedTenant } from '@/lib/tenant';
import { createAdminSupabase } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

/** Per-website robots.txt (PRD §45). Unpublished sites are never indexed. */
export default async function robots(): Promise<MetadataRoute.Robots> {
  const tenant = await getPublishedTenant();

  const host = headers().get('x-aqoss-host') ?? headers().get('host') ?? 'localhost:3000';
  const protocol = host.includes('localhost') ? 'http' : 'https';

  if (!tenant) {
    return { rules: { userAgent: '*', disallow: '/' } };
  }

  const { data: website } = await createAdminSupabase()
    .from('websites')
    .select('robots_indexable')
    .eq('id', tenant.websiteId)
    .maybeSingle();

  if (!website?.robots_indexable) {
    return { rules: { userAgent: '*', disallow: '/' } };
  }

  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/dashboard', '/admin', '/api', '/booking/pay'],
    },
    sitemap: `${protocol}://${host}/sitemap.xml`,
  };
}
