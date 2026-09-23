import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { getAdminSession, can } from '@/lib/auth/session';
import { createAdminSupabase } from '@/lib/supabase/admin';
import { PageHeader, NoAccess } from '@/components/admin/shared';
import { WebsiteForm } from '@/components/admin/WebsiteForm';
import { StatusBadge } from '@/components/ui';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Website · AQOSS CRM' };

export default async function WebsiteDetailPage({ params }: { params: { id: string } }) {
  const session = await getAdminSession();
  if (!can(session, 'websites.read')) return <NoAccess />;

  const supabase = createAdminSupabase();

  const { data: website } = await supabase
    .from('websites')
    .select('*, website_domains (hostname, is_primary), website_templates (key)')
    .eq('id', params.id)
    .maybeSingle();

  if (!website) notFound();

  /* eslint-disable @typescript-eslint/no-explicit-any */
  const w = website as any;

  let hotelsQuery = supabase.from('hotels').select('id, name').order('name');
  if (session!.hotelScope.length) hotelsQuery = hotelsQuery.in('id', session!.hotelScope);

  const [{ data: hotels }, { data: templates }] = await Promise.all([
    hotelsQuery,
    supabase.from('website_templates').select('key, name').eq('is_active', true),
  ]);

  return (
    <>
      <PageHeader
        title={w.name}
        description="Changes apply to the shared template as rendered for this hotel."
        action={
          <>
            <StatusBadge status={w.status} />
            <Link href={`/?preview_site=${w.slug}`} target="_blank" className="btn-outline">
              Preview
            </Link>
            <Link href="/admin/websites" className="btn-ghost">Back</Link>
          </>
        }
      />

      {can(session, 'websites.write') ? (
        <WebsiteForm website={w} hotels={hotels ?? []} templates={templates ?? []} />
      ) : (
        <NoAccess />
      )}
    </>
  );
}
