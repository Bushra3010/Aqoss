import Link from 'next/link';
import { can, canAccessHotel, type AdminSession } from '@/lib/auth/session';
import { createAdminSupabase } from '@/lib/supabase/admin';
import { PageHeader, Table, Td } from '@/components/admin/shared';
import { ActiveToggle, DeleteCouponButton, DeleteOfferButton, DeletePromotionButton } from '@/components/admin/ActiveToggle';
import { StatusBadge } from '@/components/ui';
import { formatCurrency, formatDate } from '@/lib/utils';
import { PROMOTION_KINDS } from '@/services/promotion.service';

/**
 * Promotions, coupons and website offers (PRD §30), for the platform or one
 * hotel. Promotions and coupons change the price; offers only advertise.
 * Promotions are created from a hotel's own panel, since each is one hotel's.
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

  let promotionsQuery = supabase
    .from('promotions')
    .select('id, hotel_id, kind, title, discount_percent, room_type_ids, stay_from, stay_until, book_from, book_until, min_nights, max_days_before, min_days_before, is_active')
    .order('created_at', { ascending: false })
    .limit(200);
  if (scope.length) promotionsQuery = promotionsQuery.in('hotel_id', scope);

  const [{ data: offers }, { data: coupons }, { data: hotels }, { data: promotions }] = await Promise.all([
    offersQuery,
    supabase
      .from('coupons')
      .select('id, code, hotel_ids, discount_percent, discount_amount, max_discount, min_booking_amount, usage_limit, used_count, valid_until, is_active')
      .order('created_at', { ascending: false })
      .limit(500),
    supabase.from('hotels').select('id, name'),
    promotionsQuery,
  ]);

  /* eslint-disable @typescript-eslint/no-explicit-any */
  const hotelName = new Map(((hotels ?? []) as any[]).map((h) => [h.id, h.name as string]));
  const offerRows = (offers ?? []) as any[];
  const promotionRows = (promotions ?? []) as any[];
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

  const rule = (p: any) =>
    p.kind === 'LAST_MINUTE'
      ? `Check-in within ${p.max_days_before} day${p.max_days_before === 1 ? '' : 's'} of booking`
      : p.kind === 'LONG_STAY'
        ? `${p.min_nights}+ nights`
        : p.kind === 'EARLY_BIRD'
          ? `Booked ${p.min_days_before}+ days ahead`
          : 'Every booking';
  const dateRange = (from: string | null, until: string | null) =>
    from || until ? `${from ? formatDate(from) : 'Any time'} → ${until ? formatDate(until) : 'no end'}` : 'Any time';

  return (
    <>
      <PageHeader
        title="Offers & promotions"
        description="Promotions take money off the room rate on their own; coupons are codes guests enter at checkout. Website offers only advertise a deal."
      />

      <h2 className="mb-1 text-base font-bold text-slate-900">Promotions</h2>
      <p className="mb-3 text-sm text-slate-500">
        {hotelId
          ? 'On each night the guest gets the best promotion that applies — they never add up.'
          : 'Create promotions from each hotel\'s own panel.'}
      </p>

      {hotelId && canWrite ? (
        <div className="mb-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {(Object.keys(PROMOTION_KINDS) as (keyof typeof PROMOTION_KINDS)[]).map((kind) => (
            <div key={kind} className="flex flex-col rounded-2xl border border-slate-200 bg-white p-4">
              <p className="font-semibold text-slate-900">{PROMOTION_KINDS[kind].label}</p>
              <p className="mt-1 flex-1 text-sm text-slate-500">{PROMOTION_KINDS[kind].blurb}</p>
              <Link href={`${basePath}/promotions/new?kind=${kind}`} className="btn-outline mt-3 self-start">
                + Create
              </Link>
            </div>
          ))}
        </div>
      ) : null}

      <Table
        headers={['Promotion', ...(hotelId ? [] : ['Hotel']), 'Discount', 'Applies when', 'Stay dates', 'Booking dates', 'Status', { label: '', align: 'right' as const }]}
        empty="No promotions yet."
      >
        {promotionRows.map((p) => (
          <tr key={p.id}>
            <Td>
              <span className="font-medium text-slate-900">{p.title}</span>
              <p className="text-xs text-slate-400">
                {PROMOTION_KINDS[p.kind as keyof typeof PROMOTION_KINDS]?.label ?? p.kind}
                {p.room_type_ids?.length ? ` · ${p.room_type_ids.length} room type${p.room_type_ids.length === 1 ? '' : 's'}` : ' · all rooms'}
              </p>
            </Td>
            {hotelId ? null : <Td>{hotelName.get(p.hotel_id) ?? '—'}</Td>}
            <Td>{Number(p.discount_percent)}%</Td>
            <Td>{rule(p)}</Td>
            <Td className="whitespace-nowrap">{dateRange(p.stay_from, p.stay_until)}</Td>
            <Td className="whitespace-nowrap">{dateRange(p.book_from, p.book_until)}</Td>
            <Td><StatusBadge status={p.is_active ? 'ACTIVE' : 'INACTIVE'} /></Td>
            <Td align="right">
              {mayEdit([p.hotel_id]) ? (
                <span className="flex items-start justify-end gap-4 whitespace-nowrap">
                  <ActiveToggle kind="promotion" id={p.id} active={p.is_active} />
                  <DeletePromotionButton id={p.id} title={p.title} />
                </span>
              ) : null}
            </Td>
          </tr>
        ))}
      </Table>

      <div className="mb-3 mt-8 flex flex-wrap items-end justify-between gap-2">
        <div>
          <h2 className="text-base font-bold text-slate-900">Coupon promotions</h2>
          <p className="text-sm text-slate-500">Codes guests enter at checkout, on top of any promotion.</p>
        </div>
        {canWrite ? <Link href={`${basePath}/coupons/new`} className="btn-primary">+ New coupon</Link> : null}
      </div>
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
              {Number(c.used_count) || 0}
              {c.usage_limit ? ` / ${c.usage_limit}` : ''}
            </Td>
            <Td className="whitespace-nowrap">{c.valid_until ? formatDate(new Date(c.valid_until)) : 'No expiry'}</Td>
            <Td><StatusBadge status={c.is_active ? 'ACTIVE' : 'INACTIVE'} /></Td>
            <Td align="right">
              {mayEdit(c.hotel_ids ?? []) ? (
                <span className="flex items-start justify-end gap-4 whitespace-nowrap">
                  <ActiveToggle kind="coupon" id={c.id} active={c.is_active} />
                  <DeleteCouponButton id={c.id} code={c.code} uses={Number(c.used_count) || 0} />
                </span>
              ) : null}
            </Td>
          </tr>
        ))}
      </Table>

      <div className="mb-3 mt-8 flex flex-wrap items-end justify-between gap-2">
        <div>
          <h2 className="text-base font-bold text-slate-900">Website offers</h2>
          <p className="text-sm text-slate-500">Banners on the hotel website. They advertise a deal but don&apos;t change the price.</p>
        </div>
        {canWrite ? <Link href={`${basePath}/new`} className="btn-outline">+ New offer</Link> : null}
      </div>
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
                {mayEdit(o.hotel_id ? [o.hotel_id] : []) ? (
                  <span className="flex items-start justify-end gap-4 whitespace-nowrap">
                    <ActiveToggle kind="offer" id={o.id} active={o.is_active} />
                    <DeleteOfferButton id={o.id} title={o.title} />
                  </span>
                ) : null}
              </Td>
            </tr>
          );
        })}
      </Table>
    </>
  );
}
