-- =============================================================================
-- AQOSS HOTEL — 08. Booking engine (PRD §8, §10, §15, §40, §41)
--
-- Everything that decides "is this room sellable" and "what does it cost"
-- lives here, inside the database, so the answer is the same no matter which
-- API route, CRM screen or background job asks.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- resolve_website(hostname) — the multi-tenant entry point (PRD §38)
-- ---------------------------------------------------------------------------
create or replace function public.resolve_website(p_hostname text)
returns table (
  website_id   uuid,
  website_slug text,
  hotel_id     uuid,
  hotel_slug   text,
  status       website_status
)
language sql
stable
security definer
set search_path = public
as $$
  select w.id, w.slug, w.hotel_id, h.slug, w.status
  from public.website_domains d
  join public.websites w on w.id = d.website_id
  join public.hotels h on h.id = w.hotel_id
  where d.hostname = lower(p_hostname)
  limit 1;
$$;

-- ---------------------------------------------------------------------------
-- nightly_rate(room_type, date) — one night's sell rate before tax
-- ---------------------------------------------------------------------------
create or replace function public.nightly_rate(p_room_type_id uuid, p_date date)
returns numeric
language sql
stable
security definer
set search_path = public
as $$
  select round(
    coalesce(rp.price, rt.base_price)
      * (1 - coalesce(rp.discount_percent, rt.discount_percent) / 100.0),
    2
  )
  from public.room_types rt
  left join public.room_prices rp
    on rp.room_type_id = rt.id and rp.stay_date = p_date
  where rt.id = p_room_type_id;
$$;

-- ---------------------------------------------------------------------------
-- search_availability — PRD §40.
-- Returns one row per sellable room type with the smallest availability across
-- the stay (a room type is only bookable if EVERY night has capacity).
-- ---------------------------------------------------------------------------
create or replace function public.search_availability(
  p_hotel_id  uuid,
  p_check_in  date,
  p_check_out date,
  p_adults    int default 1,
  p_children  int default 0,
  p_rooms     int default 1
)
returns table (
  room_type_id     uuid,
  name             text,
  slug             text,
  description      text,
  bed_type         text,
  max_adults       int,
  max_children     int,
  max_occupancy    int,
  base_price       numeric,
  available_rooms  int,
  nights           int,
  nightly_rates    jsonb,
  room_subtotal    numeric,
  tax_percent      numeric,
  tax_amount       numeric,
  total_price      numeric,
  is_available     boolean
)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_nights      int;
  v_hotel_tax   numeric;
  v_rooms_req   int := greatest(coalesce(p_rooms, 1), 1);
  v_adults      int := greatest(coalesce(p_adults, 1), 1);
  v_children    int := greatest(coalesce(p_children, 0), 0);
begin
  if p_check_out <= p_check_in then
    raise exception 'Check-out must be after check-in' using errcode = 'P0001';
  end if;
  if p_check_in < current_date then
    raise exception 'Check-in cannot be in the past' using errcode = 'P0001';
  end if;

  v_nights := p_check_out - p_check_in;

  select h.tax_percent into v_hotel_tax
  from public.hotels h where h.id = p_hotel_id and h.status = 'ACTIVE';

  if v_hotel_tax is null then
    return;  -- unknown or inactive hotel: nothing is sellable
  end if;

  return query
  with stay_nights as (
    select d::date as stay_date
    from generate_series(p_check_in, p_check_out - 1, interval '1 day') d
  ),
  candidates as (
    select rt.*
    from public.room_types rt
    where rt.hotel_id = p_hotel_id
      and rt.is_active
      -- capacity is per room: the party must fit into the rooms requested
      and rt.max_adults * v_rooms_req >= v_adults
      and rt.max_children * v_rooms_req >= v_children
      and rt.max_occupancy * v_rooms_req >= (v_adults + v_children)
  ),
  per_night as (
    select
      c.id as rt_id,
      n.stay_date,
      coalesce(inv.total_rooms, 0)
        - coalesce(inv.blocked_rooms, 0)
        - coalesce(inv.booked_rooms, 0)
        - coalesce(holds.held, 0)                         as free_rooms,
      coalesce(inv.is_closed, true)                       as is_closed,
      public.nightly_rate(c.id, n.stay_date)              as rate
    from candidates c
    cross join stay_nights n
    left join public.room_inventory inv
      on inv.room_type_id = c.id and inv.stay_date = n.stay_date
    left join lateral (
      select sum(bh.rooms)::int as held
      from public.booking_holds bh
      where bh.room_type_id = c.id
        and bh.released_at is null
        and bh.expires_at > now()
        and bh.check_in <= n.stay_date
        and bh.check_out > n.stay_date
    ) holds on true
  ),
  rolled as (
    select
      pn.rt_id,
      least(min(pn.free_rooms), 999)                 as min_free,
      bool_or(pn.is_closed)                          as any_closed,
      jsonb_agg(
        jsonb_build_object('date', pn.stay_date, 'price', pn.rate)
        order by pn.stay_date
      )                                              as rates,
      sum(pn.rate)                                   as per_room_subtotal
    from per_night pn
    group by pn.rt_id
  )
  select
    c.id,
    c.name,
    c.slug,
    c.description,
    c.bed_type,
    c.max_adults,
    c.max_children,
    c.max_occupancy,
    c.base_price,
    greatest(r.min_free, 0)                                          as available_rooms,
    v_nights                                                         as nights,
    r.rates                                                          as nightly_rates,
    round(r.per_room_subtotal * v_rooms_req, 2)                      as room_subtotal,
    coalesce(c.tax_percent, v_hotel_tax)                             as tax_percent,
    round(r.per_room_subtotal * v_rooms_req
          * coalesce(c.tax_percent, v_hotel_tax) / 100.0, 2)         as tax_amount,
    round(r.per_room_subtotal * v_rooms_req
          * (1 + coalesce(c.tax_percent, v_hotel_tax) / 100.0), 2)   as total_price,
    (r.min_free >= v_rooms_req and not r.any_closed)                 as is_available
  from candidates c
  join rolled r on r.rt_id = c.id
  order by c.sort_order, c.base_price;
end;
$$;

-- ---------------------------------------------------------------------------
-- create_booking_hold — soft lock while the customer pays (PRD §10 step 2)
-- ---------------------------------------------------------------------------
create or replace function public.create_booking_hold(
  p_room_type_id uuid,
  p_check_in     date,
  p_check_out    date,
  p_rooms        int,
  p_session_id   text,
  p_minutes      int default 15
)
returns public.booking_holds
language plpgsql
security definer
set search_path = public
as $$
declare
  v_hotel_id uuid;
  v_free     int;
  v_hold     public.booking_holds;
begin
  perform public.release_expired_holds();

  select rt.hotel_id into v_hotel_id
  from public.room_types rt where rt.id = p_room_type_id and rt.is_active;

  if v_hotel_id is null then
    raise exception 'Room type is not available' using errcode = 'P0002';
  end if;

  -- Lock the affected inventory rows so two holds cannot both see the last room.
  perform 1
  from public.room_inventory inv
  where inv.room_type_id = p_room_type_id
    and inv.stay_date >= p_check_in
    and inv.stay_date < p_check_out
  order by inv.stay_date
  for update;

  select min(
    inv.total_rooms - inv.blocked_rooms - inv.booked_rooms
      - coalesce(h.held, 0)
  )
  into v_free
  from public.room_inventory inv
  left join lateral (
    select sum(bh.rooms)::int as held
    from public.booking_holds bh
    where bh.room_type_id = p_room_type_id
      and bh.released_at is null
      and bh.expires_at > now()
      and bh.check_in <= inv.stay_date
      and bh.check_out > inv.stay_date
  ) h on true
  where inv.room_type_id = p_room_type_id
    and inv.stay_date >= p_check_in
    and inv.stay_date < p_check_out
    and not inv.is_closed;

  -- A missing inventory row means the date is simply not on sale.
  if v_free is null
     or (select count(*) from public.room_inventory inv
         where inv.room_type_id = p_room_type_id
           and inv.stay_date >= p_check_in
           and inv.stay_date < p_check_out
           and not inv.is_closed) <> (p_check_out - p_check_in)
  then
    raise exception 'Selected dates are unavailable' using errcode = 'P0001';
  end if;

  if v_free < p_rooms then
    raise exception 'Only % room(s) left for these dates', greatest(v_free, 0)
      using errcode = 'P0001';
  end if;

  insert into public.booking_holds (
    hotel_id, room_type_id, check_in, check_out, rooms,
    session_id, profile_id, expires_at
  )
  values (
    v_hotel_id, p_room_type_id, p_check_in, p_check_out, p_rooms,
    p_session_id, auth.uid(), now() + make_interval(mins => greatest(p_minutes, 1))
  )
  returning * into v_hold;

  return v_hold;
end;
$$;

create or replace function public.release_booking_hold(p_hold_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.booking_holds
     set released_at = now()
   where id = p_hold_id and released_at is null;
  return found;
end;
$$;

-- ---------------------------------------------------------------------------
-- create_booking_transaction — PRD §41.
-- Single atomic step: re-validate availability under a row lock, consume
-- inventory, write the booking, redeem the coupon, seat the transport.
-- Any failure rolls the whole thing back; the oversell CHECK constraint is the
-- backstop if the arithmetic here is ever wrong.
-- ---------------------------------------------------------------------------
create or replace function public.create_booking_transaction(
  p_hotel_id    uuid,
  p_website_id  uuid,
  p_customer_id uuid,
  p_check_in    date,
  p_check_out   date,
  p_rooms       jsonb,          -- [{room_type_id, rooms, adults, children}]
  p_guest       jsonb,          -- {name, email, phone, address, special_requests}
  p_pricing     jsonb,          -- server-computed totals
  p_guests      jsonb default '[]'::jsonb,
  p_transport   jsonb default '[]'::jsonb,
  p_hold_ids    uuid[] default '{}'::uuid[],
  p_coupon_code text default null,
  p_source      text default 'WEBSITE'
)
returns public.bookings
language plpgsql
security definer
set search_path = public
as $$
declare
  v_booking   public.bookings;
  v_item      jsonb;
  v_rt_id     uuid;
  v_rooms     int;
  v_free      int;
  v_nights    int := p_check_out - p_check_in;
  v_rt_name   text;
  v_coupon    public.coupons;
  v_slot      public.transport_slots;
  v_seats     int;
  v_total_rooms int := 0;
begin
  if v_nights <= 0 then
    raise exception 'Check-out must be after check-in' using errcode = 'P0001';
  end if;
  if jsonb_array_length(p_rooms) = 0 then
    raise exception 'At least one room is required' using errcode = 'P0001';
  end if;

  perform public.release_expired_holds();

  -- The holds belonging to this checkout stop competing with it.
  if array_length(p_hold_ids, 1) is not null then
    update public.booking_holds
       set released_at = now()
     where id = any (p_hold_ids) and released_at is null;
  end if;

  -- 1. Lock every inventory row this booking touches, in a deterministic
  --    order, so concurrent bookings queue instead of deadlocking.
  perform 1
  from public.room_inventory inv
  where inv.stay_date >= p_check_in
    and inv.stay_date < p_check_out
    and inv.room_type_id in (
      select (r->>'room_type_id')::uuid from jsonb_array_elements(p_rooms) r
    )
  order by inv.room_type_id, inv.stay_date
  for update;

  -- 2. Final availability check + inventory consumption, per room type.
  for v_item in select * from jsonb_array_elements(p_rooms)
  loop
    v_rt_id := (v_item->>'room_type_id')::uuid;
    v_rooms := coalesce((v_item->>'rooms')::int, 1);
    v_total_rooms := v_total_rooms + v_rooms;

    select rt.name into v_rt_name
    from public.room_types rt
    where rt.id = v_rt_id and rt.hotel_id = p_hotel_id and rt.is_active;

    if v_rt_name is null then
      raise exception 'Room is no longer available' using errcode = 'P0002';
    end if;

    select min(
      inv.total_rooms - inv.blocked_rooms - inv.booked_rooms - coalesce(h.held, 0)
    )
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
      and not inv.is_closed;

    if v_free is null or v_free < v_rooms then
      raise exception 'Room no longer available: %', v_rt_name
        using errcode = 'P0001';
    end if;

    update public.room_inventory inv
       set booked_rooms = inv.booked_rooms + v_rooms
     where inv.room_type_id = v_rt_id
       and inv.stay_date >= p_check_in
       and inv.stay_date < p_check_out;
  end loop;

  -- 3. Write the booking header.
  insert into public.bookings (
    hotel_id, website_id, customer_id,
    guest_name, guest_email, guest_phone, guest_address, special_requests,
    check_in, check_out, adults, children, rooms_count,
    status, payment_status, currency,
    room_subtotal, extra_services_total, transport_total,
    discount_total, coupon_code, coupon_discount, tax_total, total_amount,
    price_breakdown, source, created_by
  ) values (
    p_hotel_id, p_website_id, p_customer_id,
    p_guest->>'name', (p_guest->>'email')::citext, p_guest->>'phone',
    p_guest->>'address', p_guest->>'special_requests',
    p_check_in, p_check_out,
    coalesce((p_guest->>'adults')::int, 1),
    coalesce((p_guest->>'children')::int, 0),
    v_total_rooms,
    'PENDING', 'PENDING',
    coalesce(p_pricing->>'currency', 'INR'),
    coalesce((p_pricing->>'room_subtotal')::numeric, 0),
    coalesce((p_pricing->>'extra_services_total')::numeric, 0),
    coalesce((p_pricing->>'transport_total')::numeric, 0),
    coalesce((p_pricing->>'discount_total')::numeric, 0),
    p_coupon_code,
    coalesce((p_pricing->>'coupon_discount')::numeric, 0),
    coalesce((p_pricing->>'tax_total')::numeric, 0),
    coalesce((p_pricing->>'total_amount')::numeric, 0),
    p_pricing, coalesce(p_source, 'WEBSITE'), auth.uid()
  )
  returning * into v_booking;

  -- 4. Booking lines.
  for v_item in select * from jsonb_array_elements(p_rooms)
  loop
    v_rt_id := (v_item->>'room_type_id')::uuid;
    select rt.name into v_rt_name from public.room_types rt where rt.id = v_rt_id;

    insert into public.booking_rooms (
      booking_id, room_type_id, room_type_name, rooms, adults, children,
      nightly_rates, subtotal, discount, tax, total
    ) values (
      v_booking.id, v_rt_id, v_rt_name,
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

  -- 5. Named guests.
  if jsonb_array_length(coalesce(p_guests, '[]'::jsonb)) > 0 then
    insert into public.booking_guests (booking_id, full_name, age, is_child, id_type, id_number)
    select v_booking.id, g->>'full_name', (g->>'age')::int,
           coalesce((g->>'is_child')::boolean, false), g->>'id_type', g->>'id_number'
    from jsonb_array_elements(p_guests) g;
  end if;

  -- 6. Transport seats — same lock-then-consume shape as rooms.
  for v_item in select * from jsonb_array_elements(coalesce(p_transport, '[]'::jsonb))
  loop
    v_seats := coalesce((v_item->>'seats')::int, 1);

    select * into v_slot
    from public.transport_slots ts
    where ts.id = (v_item->>'slot_id')::uuid
      and ts.hotel_id = p_hotel_id
      and ts.status = 'ACTIVE'
    for update;

    if v_slot.id is null then
      raise exception 'Selected transport is unavailable' using errcode = 'P0002';
    end if;
    if v_slot.seat_capacity - v_slot.booked_seats < v_seats then
      raise exception 'Only % seat(s) left on this route',
        v_slot.seat_capacity - v_slot.booked_seats using errcode = 'P0001';
    end if;

    update public.transport_slots
       set booked_seats = booked_seats + v_seats
     where id = v_slot.id;

    insert into public.transport_bookings (
      booking_id, hotel_id, slot_id, route_name, customer_id, seats, amount, status
    )
    select v_booking.id, p_hotel_id, v_slot.id, tr.name, p_customer_id, v_seats,
           coalesce((v_item->>'amount')::numeric, 0), 'PENDING'
    from public.transport_routes tr where tr.id = v_slot.route_id;
  end loop;

  -- 7. Coupon redemption.
  if p_coupon_code is not null and coalesce((p_pricing->>'coupon_discount')::numeric, 0) > 0 then
    select * into v_coupon from public.coupons c
    where c.code = p_coupon_code::citext and c.is_active
    for update;

    if v_coupon.id is not null then
      if v_coupon.usage_limit is not null and v_coupon.used_count >= v_coupon.usage_limit then
        raise exception 'This coupon has reached its usage limit' using errcode = 'P0001';
      end if;

      update public.coupons set used_count = used_count + 1 where id = v_coupon.id;

      insert into public.coupon_redemptions (coupon_id, booking_id, customer_id, amount)
      values (v_coupon.id, v_booking.id, p_customer_id,
              (p_pricing->>'coupon_discount')::numeric);
    end if;
  end if;

  return v_booking;
end;
$$;

-- ---------------------------------------------------------------------------
-- cancel_booking — returns inventory and transport seats to the pool
-- ---------------------------------------------------------------------------
create or replace function public.cancel_booking(
  p_booking_id uuid,
  p_reason     text default null
)
returns public.bookings
language plpgsql
security definer
set search_path = public
as $$
declare
  v_booking public.bookings;
  v_line    record;
  v_tb      record;
begin
  select * into v_booking from public.bookings where id = p_booking_id for update;

  if v_booking.id is null then
    raise exception 'Booking not found' using errcode = 'P0002';
  end if;
  if v_booking.status in ('CANCELLED', 'REFUNDED') then
    return v_booking;   -- already released; cancelling twice is a no-op
  end if;
  if v_booking.status = 'CHECKED_OUT' then
    raise exception 'A completed stay cannot be cancelled' using errcode = 'P0001';
  end if;

  for v_line in
    select room_type_id, rooms from public.booking_rooms where booking_id = p_booking_id
  loop
    update public.room_inventory inv
       set booked_rooms = greatest(inv.booked_rooms - v_line.rooms, 0)
     where inv.room_type_id = v_line.room_type_id
       and inv.stay_date >= v_booking.check_in
       and inv.stay_date < v_booking.check_out;
  end loop;

  for v_tb in
    select slot_id, seats from public.transport_bookings
    where booking_id = p_booking_id and status <> 'CANCELLED'
  loop
    update public.transport_slots
       set booked_seats = greatest(booked_seats - v_tb.seats, 0)
     where id = v_tb.slot_id;
  end loop;

  update public.transport_bookings
     set status = 'CANCELLED' where booking_id = p_booking_id;

  update public.bookings
     set status = 'CANCELLED',
         cancellation_reason = p_reason,
         cancelled_at = now()
   where id = p_booking_id
  returning * into v_booking;

  return v_booking;
end;
$$;

-- ---------------------------------------------------------------------------
-- confirm_booking_payment — called only after the gateway signature verifies
-- ---------------------------------------------------------------------------
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

  select coalesce(sum(amount), 0) into v_paid
  from public.payments
  where booking_id = p_booking_id and status = 'PAID';

  update public.bookings
     set amount_paid = v_paid,
         payment_status = case when v_paid >= total_amount then 'PAID'::payment_status
                               else 'PENDING'::payment_status end,
         status = case when v_paid >= total_amount then 'CONFIRMED'::booking_status
                       else status end
   where id = p_booking_id
  returning * into v_booking;

  update public.transport_bookings
     set status = v_booking.status
   where booking_id = p_booking_id and status = 'PENDING';

  return v_booking;
end;
$$;

-- ---------------------------------------------------------------------------
-- validate_coupon — server-side coupon evaluation (PRD §15, §30)
-- ---------------------------------------------------------------------------
create or replace function public.validate_coupon(
  p_code       text,
  p_hotel_id   uuid,
  p_amount     numeric,
  p_customer_id uuid default null,
  p_room_type_ids uuid[] default '{}'::uuid[]
)
returns table (valid boolean, discount numeric, message text, coupon_id uuid)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  c public.coupons;
  v_discount numeric := 0;
  v_used_by_user int;
begin
  select * into c from public.coupons
  where code = p_code::citext and is_active;

  if c.id is null then
    return query select false, 0::numeric, 'Invalid coupon'::text, null::uuid; return;
  end if;
  if c.valid_from is not null and now() < c.valid_from then
    return query select false, 0::numeric, 'This coupon is not active yet'::text, c.id; return;
  end if;
  if c.valid_until is not null and now() > c.valid_until then
    return query select false, 0::numeric, 'This coupon has expired'::text, c.id; return;
  end if;
  if c.usage_limit is not null and c.used_count >= c.usage_limit then
    return query select false, 0::numeric, 'This coupon has reached its usage limit'::text, c.id; return;
  end if;
  if cardinality(c.hotel_ids) > 0 and not (p_hotel_id = any (c.hotel_ids)) then
    return query select false, 0::numeric, 'This coupon is not valid for this hotel'::text, c.id; return;
  end if;
  if cardinality(c.room_type_ids) > 0
     and not (c.room_type_ids && p_room_type_ids) then
    return query select false, 0::numeric, 'This coupon is not valid for the selected rooms'::text, c.id; return;
  end if;
  if p_amount < c.min_booking_amount then
    return query select false, 0::numeric,
      format('Minimum booking amount for this coupon is %s', c.min_booking_amount)::text, c.id; return;
  end if;

  if c.usage_limit_per_user is not null and p_customer_id is not null then
    select count(*) into v_used_by_user
    from public.coupon_redemptions cr
    where cr.coupon_id = c.id and cr.customer_id = p_customer_id;
    if v_used_by_user >= c.usage_limit_per_user then
      return query select false, 0::numeric, 'You have already used this coupon'::text, c.id; return;
    end if;
  end if;

  if c.discount_percent is not null then
    v_discount := round(p_amount * c.discount_percent / 100.0, 2);
  else
    v_discount := c.discount_amount;
  end if;

  if c.max_discount is not null then
    v_discount := least(v_discount, c.max_discount);
  end if;
  v_discount := least(v_discount, p_amount);

  return query select true, v_discount, 'Coupon applied'::text, c.id;
end;
$$;
