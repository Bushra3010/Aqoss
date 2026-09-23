import Link from 'next/link';
import type { Metadata } from 'next';
import { getAdminSession, can } from '@/lib/auth/session';
import { createAdminSupabase } from '@/lib/supabase/admin';
import { PageHeader, Table, Td, NoAccess } from '@/components/admin/shared';
import { StatusBadge } from '@/components/ui';
import { WebsiteStatusButtons } from '@/components/admin/WebsiteStatusButtons';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Websites · AQOSS CRM' };

/** Website management (PRD §22). Every site here runs the same template. */
export default async function WebsitesPage() {
  const session = await getAdminSession();
  if (!can(session, 'websites.read')) return <NoAccess />;

  let query = createAdminSupabase()
    .from('websites')
    .select('id, name, slug, status, primary_color, published_at, hotels!inner (id, name), website_domains (hostname, is_primary)')
    .order('created_at', { ascending: false })
    .limit(200);

  if (session!.hotelScope.length) query = query.in('hotel_id', session!.hotelScope);

  const { data } = await query;
  /* eslint-disable @typescript-eslint/no-explicit-any */
  const websites = (data ?? []) as any[];

  return (
    <>
      <PageHeader
        title="Websites"
        description="One codebase, one template, many hotel websites. Assign a hotel and a domain to publish."
        action={
          can(session, 'websites.write') ? (
            <Link href="/admin/websites/new" className="btn-primary">Create website</Link>
          ) : null
        }
      />

      <Table
        headers={['Website', 'Hotel', 'Domain', 'Status', { label: 'Actions', align: 'right' }]}
        empty="No websites yet."
      >
        {websites.map((site) => {
          const hotel = Array.isArray(site.hotels) ? site.hotels[0] : site.hotels;
          const primary =
            site.website_domains?.find((d: any) => d.is_primary) ?? site.website_domains?.[0];

          return (
            <tr key={site.id}>
              <Td>
                <span className="flex items-center gap-2">
                  <span
                    className="h-3 w-3 shrink-0 rounded-full"
                    style={{ backgroundColor: site.primary_color }}
                    aria-hidden="true"
                  />
                  <Link href={`/admin/websites/${site.id}`} className="font-medium text-slate-900 hover:underline">
                    {site.name}
                  </Link>
                </span>
                <p className="text-xs text-slate-400">/{site.slug}</p>
              </Td>
              <Td>
                <Link href={`/admin/hotels/${hotel?.id}`} className="hover:underline">
                  {hotel?.name}
                </Link>
              </Td>
              <Td>
                {primary ? (
                  <code className="rounded bg-slate-100 px-1.5 py-0.5 text-xs">{primary.hostname}</code>
                ) : (
                  <span className="text-slate-400">Not mapped</span>
                )}
              </Td>
              <Td><StatusBadge status={site.status} /></Td>
              <Td align="right">
                <div className="flex justify-end gap-2">
                  <Link
                    href={`/?preview_site=${site.slug}`}
                    target="_blank"
                    className="text-sm font-medium text-slate-600 hover:text-slate-900"
                  >
                    Preview
                  </Link>
                  {can(session, 'websites.write') ? (
                    <WebsiteStatusButtons websiteId={site.id} status={site.status} />
                  ) : null}
                </div>
              </Td>
            </tr>
          );
        })}
      </Table>
    </>
  );
}
