import type { Metadata } from 'next';
import { getAdminSession, can } from '@/lib/auth/session';
import { createAdminSupabase } from '@/lib/supabase/admin';
import { PageHeader, Table, Td, NoAccess } from '@/components/admin/shared';
import { StatusBadge } from '@/components/ui';
import { formatCurrency, formatDate } from '@/lib/utils';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Offers & coupons · AQOSS CRM' };

/** Offers and coupons (PRD §30). */
export default async function OffersPage() {
  const session = await getAdminSession();
  if (!can(session, 'offers.read')) return <NoAccess />;

  const supabase = createAdminSupabase();

  const [{ data: offers }, { data: coupons }] = await Promise.all([
    supabase
      .from('offers')
      .select('id, title, offer_type, discount_percent, discount_amount, valid_from, valid_until, is_active, hotels (name)')
      .order('created_at', { ascending: false })
      .limit(100),
    supabase
      .from('coupons')
      .select('id, code, offer_type, discount_percent, discount_amount, max_discount, min_booking_amount, usage_limit, used_count, valid_until, is_active')
      .order('created_at', { ascending: false })
      .limit(100),
  ]);

  /* eslint-disable @typescript-eslint/no-explicit-any */
  const offerRows = (offers ?? []) as any[];
  const couponRows = (coupons ?? []) as any[];

  const describe = (row: any) =>
    row.discount_percent != null
      ? `${row.discount_percent}%`
      : formatCurrency(Number(row.discount_amount ?? 0));

  return (
    <>
      <PageHeader title="Offers & coupons" description="Discounts are applied and validated server-side at checkout." />

      <h2 className="mb-3 text-sm font-semibold text-slate-900">Offers</h2>
      <Table headers={['Offer', 'Hotel', 'Type', 'Discount', 'Valid', 'Status']} empty="No offers yet.">
        {offerRows.map((o) => {
          const hotel = Array.isArray(o.hotels) ? o.hotels[0] : o.hotels;
          return (
            <tr key={o.id}>
              <Td><span className="font-medium text-slate-900">{o.title}</span></Td>
              <Td>{hotel?.name ?? 'All hotels'}</Td>
              <Td>{o.offer_type.replace(/_/g, ' ').toLowerCase()}</Td>
              <Td>{describe(o)}</Td>
              <Td>
                {o.valid_from ? formatDate(o.valid_from) : 'Always'} →{' '}
                {o.valid_until ? formatDate(o.valid_until) : 'No end'}
              </Td>
              <Td><StatusBadge status={o.is_active ? 'ACTIVE' : 'INACTIVE'} /></Td>
            </tr>
          );
        })}
      </Table>

      <h2 className="mb-3 mt-8 text-sm font-semibold text-slate-900">Coupons</h2>
      <Table
        headers={[
          'Code',
          'Discount',
          'Min booking',
          { label: 'Used', align: 'right' },
          'Expires',
          'Status',
        ]}
        empty="No coupons yet."
      >
        {couponRows.map((c) => (
          <tr key={c.id}>
            <Td>
              <code className="rounded bg-slate-100 px-1.5 py-0.5 font-semibold text-slate-900">
                {c.code}
              </code>
            </Td>
            <Td>
              {describe(c)}
              {c.max_discount ? (
                <p className="text-xs text-slate-400">max {formatCurrency(Number(c.max_discount))}</p>
              ) : null}
            </Td>
            <Td>{formatCurrency(Number(c.min_booking_amount))}</Td>
            <Td align="right">
              {c.used_count}
              {c.usage_limit ? ` / ${c.usage_limit}` : ''}
            </Td>
            <Td>{c.valid_until ? formatDate(new Date(c.valid_until)) : 'No expiry'}</Td>
            <Td><StatusBadge status={c.is_active ? 'ACTIVE' : 'INACTIVE'} /></Td>
          </tr>
        ))}
      </Table>
    </>
  );
}
