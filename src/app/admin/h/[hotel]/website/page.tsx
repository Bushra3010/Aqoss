import Link from 'next/link';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { can } from '@/lib/auth/session';
import { createAdminSupabase } from '@/lib/supabase/admin';
import { getHotelPanel } from '@/lib/admin/hotel-panel';
import { NoAccess, PageHeader } from '@/components/admin/shared';
import { WebsiteForm } from '@/components/admin/WebsiteForm';
import { WebsiteStatusButtons } from '@/components/admin/WebsiteStatusButtons';
import { EmptyState, StatusBadge } from '@/components/ui';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Website · Hotel admin' };

/** This hotel's website: branding, domain, SEO and publishing. */
export default async function HotelWebsitePage({ params }: { params: { hotel: string } }) {
  const panel = await getHotelPanel(params.hotel);
  if (!panel) notFound();
  if (!can(panel.session, 'websites.read')) return <NoAccess />;

  const { hotel, session } = panel;
  const supabase = createAdminSupabase();

  if (!hotel.website) {
    return (
      <EmptyState
        title="No website yet"
        description="Create one to put this hotel online using the shared template."
        action={
          can(session, 'websites.write') ? (
            <Link href={`/admin/websites/new?hotel=${hotel.id}`} className="btn-primary">Create website</Link>
          ) : null
        }
      />
    );
  }

  const [{ data: website }, { data: templates }] = await Promise.all([
    supabase
      .from('websites')
      .select('*, website_domains (hostname, is_primary), website_templates (key)')
      .eq('id', hotel.website.id)
      .maybeSingle(),
    supabase.from('website_templates').select('key, name').eq('is_active', true),
  ]);
  if (!website) notFound();

  /* eslint-disable @typescript-eslint/no-explicit-any */
  const w = website as any;

  return (
    <>
      <PageHeader
        title="Website"
        description="Changes apply to the shared template as rendered for this hotel."
        action={
          <>
            <StatusBadge status={w.status} />
            {can(session, 'websites.write') ? <WebsiteStatusButtons websiteId={w.id} status={w.status} /> : null}
          </>
        }
      />

      {can(session, 'websites.write') ? (
        <WebsiteForm website={w} hotels={[{ id: hotel.id, name: hotel.name }]} templates={templates ?? []} />
      ) : (
        <NoAccess />
      )}
    </>
  );
}
