-- =============================================================================
-- AQOSS HOTEL — 04. Room types, physical rooms, inventory, pricing
-- (PRD §7, §8, §9, §15)
--
-- Availability model
-- ------------------
--   room_inventory holds ONE row per (room_type, stay_date) with
--     total_rooms, blocked_rooms, booked_rooms
--   and a CHECK constraint guaranteeing booked + blocked <= total.
--   That constraint is the last line of defence against double booking:
--   even a buggy caller cannot oversell, the INSERT/UPDATE simply fails.
--
--   Short-lived holds (customer is on the payment page) live in booking_holds
--   and are subtracted at query time, so an abandoned checkout self-heals.
-- =============================================================================

create table public.room_types (
  id                  uuid primary key default gen_random_uuid(),
  hotel_id            uuid not null references public.hotels(id) on delete cascade,
  name                text not null,
  slug                text not null,
  description         text,
  bed_type            text,
  room_size_sqft      int,

  max_adults          int not null default 2 check (max_adults > 0),
  max_children        int not null default 0 check (max_children >= 0),
  max_occupancy       int not null default 2 check (max_occupancy > 0),
  extra_bed_allowed   boolean not null default false,
  extra_bed_price     numeric(12,2) not null default 0,

  base_price          numeric(12,2) not null check (base_price >= 0),
  discount_percent    numeric(5,2) not null default 0
                        check (discount_percent between 0 and 100),
  tax_percent         numeric(5,2),  -- null => inherit hotel.tax_percent

  cancellation_policy text,
  is_refundable       boolean not null default true,
  is_active           boolean not null default true,
  sort_order          int not null default 0,

  metadata            jsonb not null default '{}'::jsonb,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),

  unique (hotel_id, slug)
);

create index room_types_hotel_idx on public.room_types (hotel_id) where is_active;

create trigger room_types_set_updated_at
  before update on public.room_types
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
create table public.room_images (
  id           uuid primary key default gen_random_uuid(),
  room_type_id uuid not null references public.room_types(id) on delete cascade,
  url          text not null,
  alt_text     text,
  is_cover     boolean not null default false,
  sort_order   int not null default 0,
  created_at   timestamptz not null default now()
);

create index room_images_type_idx on public.room_images (room_type_id, sort_order);
create unique index room_images_one_cover_idx
  on public.room_images (room_type_id) where is_cover;

-- ---------------------------------------------------------------------------
create table public.room_amenities (
  id           uuid primary key default gen_random_uuid(),
  room_type_id uuid not null references public.room_types(id) on delete cascade,
  name         text not null,
  icon         text,
  sort_order   int not null default 0,
  unique (room_type_id, name)
);

create index room_amenities_type_idx on public.room_amenities (room_type_id);

-- ---------------------------------------------------------------------------
-- rooms: the physical units (Room 101, 102, ...) behind a room type (PRD §9)
-- ---------------------------------------------------------------------------
create table public.rooms (
  id           uuid primary key default gen_random_uuid(),
  hotel_id     uuid not null references public.hotels(id) on delete cascade,
  room_type_id uuid not null references public.room_types(id) on delete cascade,
  room_number  text not null,
  floor        text,
  status       text not null default 'AVAILABLE'
                 check (status in ('AVAILABLE','OCCUPIED','MAINTENANCE','BLOCKED')),
  notes        text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  unique (hotel_id, room_number)
);

create index rooms_type_idx on public.rooms (room_type_id);

create trigger rooms_set_updated_at
  before update on public.rooms
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- room_inventory: allocation per night. The oversell guard lives here.
-- ---------------------------------------------------------------------------
create table public.room_inventory (
  id            uuid primary key default gen_random_uuid(),
  hotel_id      uuid not null references public.hotels(id) on delete cascade,
  room_type_id  uuid not null references public.room_types(id) on delete cascade,
  stay_date     date not null,
  total_rooms   int not null default 0 check (total_rooms >= 0),
  blocked_rooms int not null default 0 check (blocked_rooms >= 0),
  booked_rooms  int not null default 0 check (booked_rooms >= 0),
  is_closed     boolean not null default false,   -- stop-sell for this date
  updated_at    timestamptz not null default now(),

  unique (room_type_id, stay_date),
  -- THE double-booking guarantee (PRD §10)
  constraint room_inventory_no_oversell
    check (booked_rooms + blocked_rooms <= total_rooms)
);

create index room_inventory_lookup_idx
  on public.room_inventory (room_type_id, stay_date);
create index room_inventory_hotel_date_idx
  on public.room_inventory (hotel_id, stay_date);

create trigger room_inventory_set_updated_at
  before update on public.room_inventory
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- room_prices: per-night rate overrides; falls back to room_types.base_price
-- ---------------------------------------------------------------------------
create table public.room_prices (
  id               uuid primary key default gen_random_uuid(),
  hotel_id         uuid not null references public.hotels(id) on delete cascade,
  room_type_id     uuid not null references public.room_types(id) on delete cascade,
  stay_date        date not null,
  price            numeric(12,2) not null check (price >= 0),
  discount_percent numeric(5,2) check (discount_percent between 0 and 100),
  min_nights       int not null default 1 check (min_nights >= 1),
  updated_at       timestamptz not null default now(),
  unique (room_type_id, stay_date)
);

create index room_prices_lookup_idx on public.room_prices (room_type_id, stay_date);

create trigger room_prices_set_updated_at
  before update on public.room_prices
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- booking_holds: soft reservation while the customer pays (PRD §10)
-- ---------------------------------------------------------------------------
create table public.booking_holds (
  id           uuid primary key default gen_random_uuid(),
  hotel_id     uuid not null references public.hotels(id) on delete cascade,
  room_type_id uuid not null references public.room_types(id) on delete cascade,
  check_in     date not null,
  check_out    date not null,
  rooms        int not null check (rooms > 0),
  session_id   text not null,
  profile_id   uuid references public.profiles(id) on delete set null,
  expires_at   timestamptz not null,
  released_at  timestamptz,
  created_at   timestamptz not null default now(),
  constraint booking_holds_date_order check (check_out > check_in)
);

create index booking_holds_active_idx
  on public.booking_holds (room_type_id, check_in, check_out)
  where released_at is null;
create index booking_holds_session_idx on public.booking_holds (session_id);
create index booking_holds_expiry_idx on public.booking_holds (expires_at)
  where released_at is null;

-- ---------------------------------------------------------------------------
-- Ensure an inventory row exists for every night a room type is sellable.
-- Called by the admin CRM and the seeder.
-- ---------------------------------------------------------------------------
create or replace function public.ensure_room_inventory(
  p_room_type_id uuid,
  p_from         date,
  p_to           date,
  p_total_rooms  int default null
)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  v_hotel_id uuid;
  v_default  int;
  v_rows     int;
begin
  select rt.hotel_id into v_hotel_id
  from public.room_types rt where rt.id = p_room_type_id;

  if v_hotel_id is null then
    raise exception 'Unknown room type %', p_room_type_id using errcode = 'P0002';
  end if;

  -- Default allocation = number of physical rooms configured for this type.
  v_default := coalesce(
    p_total_rooms,
    (select count(*)::int from public.rooms r
      where r.room_type_id = p_room_type_id and r.status <> 'MAINTENANCE'),
    0
  );

  insert into public.room_inventory (hotel_id, room_type_id, stay_date, total_rooms)
  select v_hotel_id, p_room_type_id, d::date, v_default
  from generate_series(p_from, p_to - 1, interval '1 day') as d
  on conflict (room_type_id, stay_date) do update
    set total_rooms = greatest(
      excluded.total_rooms,
      public.room_inventory.booked_rooms + public.room_inventory.blocked_rooms
    );

  get diagnostics v_rows = row_count;
  return v_rows;
end;
$$;

-- ---------------------------------------------------------------------------
-- Release holds that have timed out. Cheap, idempotent, safe to call often.
-- ---------------------------------------------------------------------------
create or replace function public.release_expired_holds()
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  v_rows int;
begin
  update public.booking_holds
     set released_at = now()
   where released_at is null
     and expires_at < now();
  get diagnostics v_rows = row_count;
  return v_rows;
end;
$$;
