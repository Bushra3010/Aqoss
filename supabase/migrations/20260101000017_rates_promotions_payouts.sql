-- =============================================================================
-- AQOSS HOTEL — 17. Occupancy rates, promotions, commission and payouts
--
-- What a hotel's own panel needs to run like an OTA extranet:
--
--   * Occupancy rates. A room's nightly rate depends on who sleeps in it:
--       1 adult   -> single_price (falls back to the 2-adult rate)
--       2 adults  -> base_price, the room's ordinary rate
--       3+ adults -> base_price + extra_adult_price for each adult over two
--       + extra_child_price for every child
--     room_prices can override any of the four for a single night.
--
--   * Promotions. BASIC, LAST_MINUTE, LONG_STAY and EARLY_BIRD take a
--     percentage off the room rate on their own, no code needed. Per night,
--     only the best eligible promotion applies — they never stack with each
--     other. Coupons still apply on top, exactly as before.
--
--   * Commission. hotels.commission_percent is AQOSS's share. Each booking
--     snapshots the rate it was made at, so changing a hotel's rate never
--     rewrites old bookings. Bookings made before this migration have none and
--     follow the hotel's current rate.
--
--   * Payouts. property_payouts records money AQOSS has paid a hotel against
--     a booking (date, UTR). What is still owed is derived, never stored.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Occupancy rates
-- ---------------------------------------------------------------------------
alter table public.room_types
  add column single_price      numeric(12,2) check (single_price >= 0),
  add column extra_adult_price numeric(12,2) not null default 0 check (extra_adult_price >= 0),
  add column extra_child_price numeric(12,2) not null default 0 check (extra_child_price >= 0);

alter table public.room_prices
  add column single_price      numeric(12,2) check (single_price >= 0),
  add column extra_adult_price numeric(12,2) check (extra_adult_price >= 0),
  add column extra_child_price numeric(12,2) check (extra_child_price >= 0);

-- One room, one night, for a given party in that room. Before promotions.
create or replace function public.room_night_rate(
  p_room_type_id uuid,
  p_date         date,
  p_adults       int,
  p_children     int
)
returns numeric
language sql
stable
security definer
set search_path = public
as $$
  select round(
    (
      case when greatest(coalesce(p_adults, 1), 1) = 1
        then coalesce(rp.single_price, rt.single_price, rp.price, rt.base_price)
        else coalesce(rp.price, rt.base_price)
      end
      + greatest(coalesce(p_adults, 1) - 2, 0)
          * coalesce(rp.extra_adult_price, rt.extra_adult_price)
      + greatest(coalesce(p_children, 0), 0)
          * coalesce(rp.extra_child_price, rt.extra_child_price)
    ) * (1 - coalesce(rp.discount_percent, rt.discount_percent) / 100.0),
    2
  )
  from public.room_types rt
  left join public.room_prices rp
    on rp.room_type_id = rt.id and rp.stay_date = p_date
  where rt.id = p_room_type_id;
$$;

-- ---------------------------------------------------------------------------
-- Promotions
-- ---------------------------------------------------------------------------
create type promotion_kind as enum ('BASIC', 'LAST_MINUTE', 'LONG_STAY', 'EARLY_BIRD');

create table public.promotions (
  id               uuid primary key default gen_random_uuid(),
  hotel_id         uuid not null references public.hotels(id) on delete cascade,
  kind             promotion_kind not null,
  title            text not null,
  discount_percent numeric(5,2) not null check (discount_percent > 0 and discount_percent <= 90),
  -- empty array = every room type of the hotel
  room_type_ids    uuid[] not null default '{}'::uuid[],
  -- nights the discount applies to (inclusive); null = open-ended
  stay_from        date,
  stay_until       date,
  -- days on which a booking can get it (inclusive); null = open-ended
  book_from        date,
  book_until       date,
  -- LONG_STAY: the stay is at least this many nights
  min_nights       int check (min_nights is null or min_nights >= 2),
  -- LAST_MINUTE: check-in is at most this many days after the booking day
  max_days_before  int check (max_days_before is null or max_days_before >= 0),
  -- EARLY_BIRD: check-in is at least this many days after the booking day
  min_days_before  int check (min_days_before is null or min_days_before >= 1),
  is_active        boolean not null default true,
  created_by       uuid references public.profiles(id) on delete set null,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  constraint promotions_stay_order check (stay_until is null or stay_from is null or stay_until >= stay_from),
  constraint promotions_book_order check (book_until is null or book_from is null or book_until >= book_from),
  constraint promotions_rule check (
    case kind
      when 'LONG_STAY'   then min_nights is not null
      when 'LAST_MINUTE' then max_days_before is not null
      when 'EARLY_BIRD'  then min_days_before is not null
      else true
    end
  )
);

create index promotions_hotel_idx on public.promotions (hotel_id) where is_active;

create trigger promotions_set_updated_at
  before update on public.promotions
  for each row execute function public.set_updated_at();

alter table public.promotions enable row level security;

create policy promotions_admin_read on public.promotions
  for select using (public.has_permission('offers.read') and public.can_access_hotel(hotel_id));
create policy promotions_admin_write on public.promotions
  for all using (public.has_permission('offers.write') and public.can_access_hotel(hotel_id))
  with check (public.has_permission('offers.write') and public.can_access_hotel(hotel_id));

-- ---------------------------------------------------------------------------
-- quote_room_stay — what one booking line costs, night by night.
--
-- The party is spread over the rooms as evenly as possible (3 adults in 2
-- rooms = 2 + 1), each room priced for its own occupancy, then the best
-- promotion for that night taken off. Every figure is the total for all the
-- line's rooms. search_availability and the checkout both price through this,
-- so the website, the CRM and the booking always agree.
-- ---------------------------------------------------------------------------
create or replace function public.quote_room_stay(
  p_room_type_id uuid,
  p_check_in     date,
  p_check_out    date,
  p_rooms        int default 1,
  p_adults       int default 1,
  p_children     int default 0
)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_rooms     int := greatest(coalesce(p_rooms, 1), 1);
  v_adults    int := greatest(coalesce(p_adults, 1), 1);
  v_children  int := greatest(coalesce(p_children, 0), 0);
  v_nights    int := p_check_out - p_check_in;
  v_lead      int := p_check_in - current_date;
  v_hotel_id  uuid;
  v_date      date;
  v_i         int;
  v_base      numeric;
  v_price     numeric;
  v_best      record;
  v_promotion jsonb;
  v_rates     jsonb := '[]'::jsonb;
  v_subtotal  numeric := 0;
  v_original  numeric := 0;
begin
  select rt.hotel_id into v_hotel_id from public.room_types rt where rt.id = p_room_type_id;
  if v_hotel_id is null or v_nights <= 0 then
    return null;
  end if;

  for v_date in
    select d::date from generate_series(p_check_in, p_check_out - 1, interval '1 day') d
  loop
    v_base := 0;
    for v_i in 0 .. v_rooms - 1 loop
      v_base := v_base + public.room_night_rate(
        p_room_type_id,
        v_date,
        greatest(v_adults / v_rooms + case when v_i < v_adults % v_rooms then 1 else 0 end, 1),
        v_children / v_rooms + case when v_i < v_children % v_rooms then 1 else 0 end
      );
    end loop;

    select p.id, p.title, p.kind, p.discount_percent into v_best
    from public.promotions p
    where p.hotel_id = v_hotel_id
      and p.is_active
      and (cardinality(p.room_type_ids) = 0 or p_room_type_id = any (p.room_type_ids))
      and (p.stay_from is null or v_date >= p.stay_from)
      and (p.stay_until is null or v_date <= p.stay_until)
      and (p.book_from is null or current_date >= p.book_from)
      and (p.book_until is null or current_date <= p.book_until)
      and case p.kind
            when 'LAST_MINUTE' then v_lead <= p.max_days_before
            when 'EARLY_BIRD'  then v_lead >= p.min_days_before
            when 'LONG_STAY'   then v_nights >= p.min_nights
            else true
          end
    order by p.discount_percent desc, p.created_at
    limit 1;

    if found then
      v_price := round(v_base * (1 - v_best.discount_percent / 100.0), 2);
      if v_promotion is null
         or (v_promotion->>'discount_percent')::numeric < v_best.discount_percent then
        v_promotion := jsonb_build_object(
          'id', v_best.id, 'title', v_best.title, 'kind', v_best.kind,
          'discount_percent', v_best.discount_percent
        );
      end if;
    else
      v_price := v_base;
    end if;

    v_rates := v_rates || jsonb_build_object(
      'date', v_date, 'price', v_price, 'base_price', v_base,
      'promotion', case when found then v_best.title end
    );
    v_subtotal := v_subtotal + v_price;
    v_original := v_original + v_base;
  end loop;

  return jsonb_build_object(
    'nightly_rates', v_rates,
    'subtotal', round(v_subtotal, 2),
    'original_subtotal', round(v_original, 2),
    'promotion', v_promotion
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- search_availability — same signature and columns as migration 08, now priced
-- through quote_room_stay. nightly_rates entries are totals for all the
-- requested rooms and carry base_price (before promotion) and the promotion's
-- title beside price.
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
      and rt.max_adults * v_rooms_req >= v_adults
      and rt.max_children * v_rooms_req >= v_children
      and rt.max_occupancy * v_rooms_req >= (v_adults + v_children)
  ),
  per_night as (
    select
      c.id as rt_id,
      coalesce(inv.total_rooms, 0)
        - coalesce(inv.blocked_rooms, 0)
        - coalesce(inv.booked_rooms, 0)
        - coalesce(holds.held, 0)                         as free_rooms,
      coalesce(inv.is_closed, true)                       as is_closed
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
      least(min(pn.free_rooms), 999) as min_free,
      bool_or(pn.is_closed)          as any_closed
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
    greatest(r.min_free, 0)                                            as available_rooms,
    v_nights                                                           as nights,
    q.quote->'nightly_rates'                                           as nightly_rates,
    (q.quote->>'subtotal')::numeric                                    as room_subtotal,
    coalesce(c.tax_percent, v_hotel_tax)                               as tax_percent,
    round((q.quote->>'subtotal')::numeric
          * coalesce(c.tax_percent, v_hotel_tax) / 100.0, 2)           as tax_amount,
    round((q.quote->>'subtotal')::numeric
          * (1 + coalesce(c.tax_percent, v_hotel_tax) / 100.0), 2)     as total_price,
    (r.min_free >= v_rooms_req and not r.any_closed)                   as is_available
  from candidates c
  join rolled r on r.rt_id = c.id
  cross join lateral (
    select public.quote_room_stay(c.id, p_check_in, p_check_out, v_rooms_req, v_adults, v_children) as quote
  ) q
  order by c.sort_order, c.base_price;
end;
$$;

grant execute on function public.room_night_rate(uuid, date, int, int) to anon, authenticated;
grant execute on function public.quote_room_stay(uuid, date, date, int, int, int) to anon, authenticated;

-- ---------------------------------------------------------------------------
-- Commission
-- ---------------------------------------------------------------------------
alter table public.hotels
  add column commission_percent numeric(5,2) not null default 0
    check (commission_percent between 0 and 100);

alter table public.bookings
  add column commission_percent numeric(5,2)
    check (commission_percent is null or commission_percent between 0 and 100);

create or replace function public.set_booking_commission()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.commission_percent is null then
    select h.commission_percent into new.commission_percent
    from public.hotels h where h.id = new.hotel_id;
  end if;
  return new;
end;
$$;

create trigger bookings_set_commission
  before insert on public.bookings
  for each row execute function public.set_booking_commission();

-- ---------------------------------------------------------------------------
-- Payouts — AQOSS paying a hotel its share of a booking
-- ---------------------------------------------------------------------------
create table public.property_payouts (
  id          uuid primary key default gen_random_uuid(),
  hotel_id    uuid not null references public.hotels(id) on delete cascade,
  booking_id  uuid not null references public.bookings(id) on delete cascade,
  amount      numeric(12,2) not null check (amount > 0),
  paid_on     date not null default current_date,
  reference   text,
  notes       text,
  created_by  uuid references public.profiles(id) on delete set null,
  created_at  timestamptz not null default now()
);

create index property_payouts_hotel_idx on public.property_payouts (hotel_id, paid_on desc);
create index property_payouts_booking_idx on public.property_payouts (booking_id);

alter table public.property_payouts enable row level security;

create policy property_payouts_read on public.property_payouts
  for select using (public.has_permission('payments.read') and public.can_access_hotel(hotel_id));
create policy property_payouts_write on public.property_payouts
  for all using (public.has_permission('payouts.write'))
  with check (public.has_permission('payouts.write'));

insert into public.permissions (key, module, action, description) values
  ('payouts.write', 'payouts', 'write', 'Record payouts to hotels and set their commission')
on conflict (key) do nothing;

insert into public.role_permissions (role_id, permission_id)
select r.id, p.id
from public.roles r
join public.permissions p on p.key = 'payouts.write'
where r.key = 'finance_staff'
on conflict do nothing;
