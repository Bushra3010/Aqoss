-- =============================================================================
-- modify_booking — change a booking's dates, rooms or party size in place
-- =============================================================================
--
-- Staff edits from the CRM. The old nights are released and the new ones
-- consumed inside one transaction, so the availability check sees the
-- booking's own rooms as free: moving a booking at a full hotel by a day works,
-- while taking a room somebody else holds does not. Prices come from the
-- caller's server-side quote (quoteBooking), exactly like
-- create_booking_transaction. Payment totals are re-derived: a booking that
-- now costs more than was paid falls back to payment PENDING (balance due).

create or replace function public.modify_booking(
  p_booking_id uuid,
  p_check_in   date,
  p_check_out  date,
  p_rooms      jsonb,   -- [{room_type_id, rooms, adults, children, nightly_rates, subtotal, discount, tax, total}]
  p_guest      jsonb,   -- {adults, children}
  p_pricing    jsonb,   -- PriceBreakdown
  p_changed_by uuid default null
)
returns public.bookings
language plpgsql
security definer
set search_path = public
as $$
declare
  v_booking   public.bookings;
  v_line      record;
  v_item      jsonb;
  v_rt_id     uuid;
  v_rt_name   text;
  v_rooms     int;
  v_free      int;
  v_total_rooms int := 0;
  v_nights    int := p_check_out - p_check_in;
  v_total     numeric;
begin
  if v_nights <= 0 then
    raise exception 'Check-out must be after check-in' using errcode = 'P0001';
  end if;
  if jsonb_array_length(p_rooms) = 0 then
    raise exception 'At least one room is required' using errcode = 'P0001';
  end if;

  select * into v_booking from public.bookings where id = p_booking_id for update;
  if v_booking.id is null then
    raise exception 'Booking not found' using errcode = 'P0002';
  end if;
  if v_booking.status not in ('PENDING', 'CONFIRMED') then
    raise exception 'Only pending or confirmed bookings can be changed' using errcode = 'P0001';
  end if;

  perform public.release_expired_holds();

  -- 1. Lock every inventory row either version of the booking touches, in a
  --    deterministic order, so concurrent writers queue instead of deadlocking.
  perform 1
  from public.room_inventory inv
  where (
      inv.room_type_id in (select br.room_type_id from public.booking_rooms br where br.booking_id = p_booking_id)
      and inv.stay_date >= v_booking.check_in and inv.stay_date < v_booking.check_out
    ) or (
      inv.room_type_id in (select (r->>'room_type_id')::uuid from jsonb_array_elements(p_rooms) r)
      and inv.stay_date >= p_check_in and inv.stay_date < p_check_out
    )
  order by inv.room_type_id, inv.stay_date
  for update;

  -- 2. Give the old nights back.
  for v_line in select room_type_id, rooms from public.booking_rooms where booking_id = p_booking_id
  loop
    update public.room_inventory inv
       set booked_rooms = greatest(inv.booked_rooms - v_line.rooms, 0)
     where inv.room_type_id = v_line.room_type_id
       and inv.stay_date >= v_booking.check_in
       and inv.stay_date < v_booking.check_out;
  end loop;

  -- 3. Check and take the new nights (same rule as create_booking_transaction).
  for v_item in select * from jsonb_array_elements(p_rooms)
  loop
    v_rt_id := (v_item->>'room_type_id')::uuid;
    v_rooms := coalesce((v_item->>'rooms')::int, 1);
    v_total_rooms := v_total_rooms + v_rooms;

    select rt.name into v_rt_name
    from public.room_types rt
    where rt.id = v_rt_id and rt.hotel_id = v_booking.hotel_id and rt.is_active;
    if v_rt_name is null then
      raise exception 'Room is no longer available' using errcode = 'P0002';
    end if;

    select min(inv.total_rooms - inv.blocked_rooms - inv.booked_rooms - coalesce(h.held, 0))
    into v_free
    from public.room_inventory inv
    left join lateral (
      select sum(bh.rooms)::int as held
      from public.booking_holds bh
      where bh.room_type_id = v_rt_id
        and bh.released_at is null
        and bh.expires_at > now()
        and bh.check_in <= inv.stay_date
        and bh.check_out > inv.stay_date
    ) h on true
    where inv.room_type_id = v_rt_id
      and inv.stay_date >= p_check_in
      and inv.stay_date < p_check_out
      and not inv.is_closed
    having count(*) = v_nights;   -- every night must be on sale

    if v_free is null or v_free < v_rooms then
      raise exception 'Not enough % available for those dates', v_rt_name using errcode = 'P0001';
    end if;

    update public.room_inventory inv
       set booked_rooms = inv.booked_rooms + v_rooms
     where inv.room_type_id = v_rt_id
       and inv.stay_date >= p_check_in
       and inv.stay_date < p_check_out;
  end loop;

  -- 4. Replace the lines.
  delete from public.booking_rooms where booking_id = p_booking_id;

  for v_item in select * from jsonb_array_elements(p_rooms)
  loop
    v_rt_id := (v_item->>'room_type_id')::uuid;
    select rt.name into v_rt_name from public.room_types rt where rt.id = v_rt_id;

    insert into public.booking_rooms (
      booking_id, room_type_id, room_type_name, rooms, adults, children,
      nightly_rates, subtotal, discount, tax, total
    ) values (
      p_booking_id, v_rt_id, v_rt_name,
      coalesce((v_item->>'rooms')::int, 1),
      coalesce((v_item->>'adults')::int, 1),
      coalesce((v_item->>'children')::int, 0),
      coalesce(v_item->'nightly_rates', '[]'::jsonb),
      coalesce((v_item->>'subtotal')::numeric, 0),
      coalesce((v_item->>'discount')::numeric, 0),
      coalesce((v_item->>'tax')::numeric, 0),
      coalesce((v_item->>'total')::numeric, 0)
    );
  end loop;

  -- 5. The header: dates, party, money. Transport is kept as booked.
  v_total := coalesce((p_pricing->>'total_amount')::numeric, 0);

  update public.bookings
     set check_in        = p_check_in,
         check_out       = p_check_out,
         adults          = coalesce((p_guest->>'adults')::int, adults),
         children        = coalesce((p_guest->>'children')::int, children),
         rooms_count     = v_total_rooms,
         room_subtotal   = coalesce((p_pricing->>'room_subtotal')::numeric, 0),
         discount_total  = coalesce((p_pricing->>'discount_total')::numeric, 0),
         coupon_code     = nullif(p_pricing->>'coupon_code', ''),
         coupon_discount = coalesce((p_pricing->>'coupon_discount')::numeric, 0),
         tax_total       = coalesce((p_pricing->>'tax_total')::numeric, 0),
         total_amount    = v_total,
         price_breakdown = p_pricing,
         payment_status  = case
                             when amount_paid - amount_refunded >= v_total and v_total > 0 then 'PAID'::payment_status
                             when payment_status in ('PAID', 'PENDING') then 'PENDING'::payment_status
                             else payment_status
                           end,
         updated_at      = now()
   where id = p_booking_id
  returning * into v_booking;

  insert into public.booking_status_history (booking_id, from_status, to_status, note, changed_by)
  values (p_booking_id, v_booking.status, v_booking.status,
          format('Changed to %s → %s, %s room(s)', p_check_in, p_check_out, v_total_rooms),
          p_changed_by);

  return v_booking;
end;
$$;

revoke execute on function public.modify_booking(uuid, date, date, jsonb, jsonb, jsonb, uuid)
  from anon, authenticated;

-- =============================================================================
-- confirm_booking_payment — only promote PENDING to CONFIRMED; count refunds
-- =============================================================================
-- Staff can now take payment mid-stay (cash at the desk). The original version
-- set every fully paid booking to CONFIRMED, which would move a checked-in
-- guest back to CONFIRMED, and summed only status = 'PAID' payments, so a
-- partly refunded payment vanished from amount_paid on the next payment.
-- Same function, same signature.

create or replace function public.confirm_booking_payment(
  p_booking_id uuid,
  p_payment_id uuid,
  p_amount     numeric
)
returns public.bookings
language plpgsql
security definer
set search_path = public
as $$
declare
  v_booking public.bookings;
  v_paid    numeric;
begin
  select * into v_booking from public.bookings where id = p_booking_id for update;
  if v_booking.id is null then
    raise exception 'Booking not found' using errcode = 'P0002';
  end if;

  update public.payments
     set status = 'PAID', paid_at = coalesce(paid_at, now())
   where id = p_payment_id;

  -- Everything ever captured. A payment that was later (partly) refunded still
  -- counts here; the refund lives in amount_refunded, so the two never net out
  -- twice. (Summing only status = 'PAID' dropped refunded payments entirely.)
  select coalesce(sum(amount), 0) into v_paid
  from public.payments
  where booking_id = p_booking_id and status in ('PAID', 'PARTIALLY_REFUNDED', 'REFUNDED');

  update public.bookings
     set amount_paid = v_paid,
         payment_status = case
                            when v_paid - amount_refunded >= total_amount then 'PAID'::payment_status
                            when amount_refunded > 0 then 'PARTIALLY_REFUNDED'::payment_status
                            else 'PENDING'::payment_status
                          end,
         status = case when v_paid - amount_refunded >= total_amount and status = 'PENDING' then 'CONFIRMED'::booking_status
                       else status end
   where id = p_booking_id
  returning * into v_booking;

  update public.transport_bookings
     set status = v_booking.status
   where booking_id = p_booking_id and status = 'PENDING';

  return v_booking;
end;
$$;
revoke execute on function public.confirm_booking_payment(uuid, uuid, numeric)
  from anon, authenticated;

-- =============================================================================
-- Front desk takes payment
-- =============================================================================
-- Recording cash / UPI / card taken at the hotel needs payments.write. The
-- roles that run a front desk get it; finance_staff already has it.
with grants(role_key) as (values ('booking_manager'), ('property_manager'))
insert into public.role_permissions (role_id, permission_id)
select r.id, p.id
from grants g
join public.roles r on r.key = g.role_key
join public.permissions p on p.key = 'payments.write'
on conflict do nothing;
