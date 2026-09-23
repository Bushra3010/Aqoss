import Link from 'next/link';
import { can, canAccessHotel, type AdminSession } from '@/lib/auth/session';
import { createAdminSupabase } from '@/lib/supabase/admin';
import { PageHeader, Table, Td } from '@/components/admin/shared';
import { ActiveToggle } from '@/components/admin/ActiveToggle';
import { StatusBadge } from '@/components/ui';
import { formatCurrency, formatDate } from '@/lib/utils';

/**
 * Offers and coupons (PRD §30), for the whole platform or one hotel.
 *
 * With `hotelId`, only what applies to that hotel is listed: its own offers
 * and coupons, plus platform-wide ones (shown, but only a platform admin can
 * pause those). A hotel-scoped admin sees the same, across their hotels.
 */
export async function OffersView({
  session,
  hotelId,
  basePath,
}: {
  session: AdminSession;
  hotelId?: string;
  basePath: string;
}) {
  const supabase = createAdminSupabase();
  const scope = hotelId ? [hotelId] : session.hotelScope;

  let offersQuery = supabase
    .from('offers')
    .select('id, title, hotel_id, offer_type, discount_percent, discount_amount, max_discount, valid_from, valid_until, is_active, hotels (name)')
    .order('created_at', { ascending: false })
    .limit(200);
  if (scope.length) offersQuery = offersQuery.or(`hotel_id.in.(${scope.join(',')}),hotel_id.is.null`);

  const [{ data: offers }, { data: coupons }, { data: hotels }] = await Promise.all([
    offersQuery,
    supabase
      .from('coupons')
      .select('id, code, hotel_ids, discount_percent, discount_amount, max_discount, min_booking_amount, usage_limit, used_count, valid_until, is_active')
      .order('created_at', { ascending: false })
      .limit(500),
    supabase.from('hotels').select('id, name'),
  ]);

  /* eslint-disable @typescript-eslint/no-explicit-any */
  const hotelName = new Map(((hotels ?? []) as any[]).map((h) => [h.id, h.name as string]));
  const offerRows = (offers ?? []) as any[];
  // Coupons keep their hotels in an array; an empty one means every hotel.
  const couponRows = ((coupons ?? []) as any[]).filter(
    (c) => !scope.length || !c.hotel_ids?.length || c.hotel_ids.some((id: string) => scope.includes(id)),
  );

  const canWrite = can(session, 'offers.write');
  // Scoped admins may only touch rows that are wholly theirs.
  const mayEdit = (hotelIds: string[]) =>
    canWrite && (!session.hotelScope.length || (hotelIds.length > 0 && hotelIds.every((id) => canAccessHotel(session, id))));

  const describe = (row: any) =>
    row.discount_percent != null
      ? `${Number(row.discount_percent)}%`
      : formatCurrency(Number(row.discount_amount ?? 0));

  const validAt = (ids: string[]) => {
    if (!ids?.length) return 'All hotels';
    if (hotelId && ids.length === 1) return 'This hotel';
    if (ids.length <= 2) return ids.map((id) => hotelName.get(id) ?? 'Unknown').join(', ');
    return `${ids.length} hotels`;
  };

  return (
    <>
      <PageHeader
        title="Offers & coupons"
        description="Offers advertise a deal on the website. Coupons are codes guests enter at checkout — validated and applied on the server."
        action={
          canWrite ? (
            <>
              <Link href={`${basePath}/new`} className="btn-outline">+ New offer</Link>
              <Link href={`${basePath}/coupons/new`} className="btn-primary">+ New coupon</Link>
            </>
          ) : null
        }
      />

      <h2 className="mb-3 text-sm font-semibold text-slate-900">Offers</h2>
      <Table
        headers={['Offer', ...(hotelId ? [] : ['Hotel']), 'Type', 'Discount', 'Valid', 'Status', { label: '', align: 'right' as const }]}
        empty="No offers yet."
      >
        {offerRows.map((o) => {
          const hotel = Array.isArray(o.hotels) ? o.hotels[0] : o.hotels;
          return (
            <tr key={o.id}>
              <Td><span className="font-medium text-slate-900">{o.title}</span></Td>
              {hotelId ? null : <Td>{hotel?.name ?? 'All hotels'}</Td>}
              <Td>{hotelId && !o.hotel_id ? 'all hotels · ' : ''}{o.offer_type.replace(/_/g, ' ').toLowerCase()}</Td>
              <Td>
                {describe(o)}
                {o.max_discount ? <p className="text-xs text-slate-400">max {formatCurrency(Number(o.max_discount))}</p> : null}
              </Td>
              <Td className="whitespace-nowrap">
                {o.valid_from ? formatDate(o.valid_from) : 'Always'} → {o.valid_until ? formatDate(o.valid_until) : 'No end'}
              </Td>
              <Td><StatusBadge status={o.is_active ? 'ACTIVE' : 'INACTIVE'} /></Td>
              <Td align="right">
                {mayEdit(o.hotel_id ? [o.hotel_id] : []) ? <ActiveToggle kind="offer" id={o.id} active={o.is_active} /> : null}
              </Td>
            </tr>
          );
        })}
      </Table>

      <h2 className="mb-3 mt-8 text-sm font-semibold text-slate-900">Coupons</h2>
      <Table
        headers={['Code', 'Valid at', 'Discount', 'Min booking', { label: 'Used', align: 'right' as const }, 'Expires', 'Status', { label: '', align: 'right' as const }]}
        empty="No coupons yet."
      >
        {couponRows.map((c) => (
          <tr key={c.id}>
            <Td>
              <code className="rounded bg-slate-100 px-1.5 py-0.5 font-semibold text-slate-900">{c.code}</code>
            </Td>
            <Td>{validAt(c.hotel_ids ?? [])}</Td>
            <Td>
              {describe(c)}
              {c.max_discount ? <p className="text-xs text-slate-400">max {formatCurrency(Number(c.max_discount))}</p> : null}
            </Td>
            <Td>{Number(c.min_booking_amount) > 0 ? formatCurrency(Number(c.min_booking_amount)) : '—'}</Td>
            <Td align="right">
              {c.used_count}
              {c.usage_limit ? ` / ${c.usage_limit}` : ''}
            </Td>
            <Td className="whitespace-nowrap">{c.valid_until ? formatDate(new Date(c.valid_until)) : 'No expiry'}</Td>
            <Td><StatusBadge status={c.is_active ? 'ACTIVE' : 'INACTIVE'} /></Td>
            <Td align="right">
              {mayEdit(c.hotel_ids ?? []) ? <ActiveToggle kind="coupon" id={c.id} active={c.is_active} /> : null}
            </Td>
          </tr>
        ))}
      </Table>
    </>
  );
}
