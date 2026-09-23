import type { Metadata } from 'next';
import { getAdminSession, can } from '@/lib/auth/session';
import { createAdminSupabase } from '@/lib/supabase/admin';
import { PageHeader, NoAccess } from '@/components/admin/shared';
import { WebsiteForm } from '@/components/admin/WebsiteForm';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Create website · AQOSS CRM' };

export default async function NewWebsitePage({ searchParams }: { searchParams: { hotel?: string } }) {
  const session = await getAdminSession();
  if (!can(session, 'websites.write')) return <NoAccess />;

  let query = createAdminSupabase().from('hotels').select('id, name').order('name');
  if (session!.hotelScope.length) query = query.in('id', session!.hotelScope);

  const [{ data: hotels }, { data: templates }] = await Promise.all([
    query,
    createAdminSupabase().from('website_templates').select('key, name').eq('is_active', true),
  ]);

  return (
    <>
      <PageHeader
        title="Create website"
        description="Pick a hotel and a template, set the branding and domain, then publish."
      />
      <WebsiteForm
        hotels={hotels ?? []}
        templates={templates ?? []}
        defaultHotelId={searchParams.hotel}
      />
    </>
  );
}
