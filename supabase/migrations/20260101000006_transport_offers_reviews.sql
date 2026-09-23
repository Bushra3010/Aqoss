-- =============================================================================
-- AQOSS HOTEL — 06. Transport, offers/coupons, reviews (PRD §16, §19, §30)
-- =============================================================================

-- ---------------------------------------------------------------------------
-- transport_services: a vehicle/service a hotel operates
-- ---------------------------------------------------------------------------
create table public.transport_services (
  id            uuid primary key default gen_random_uuid(),
  hotel_id      uuid not null references public.hotels(id) on delete cascade,
  name          text not null,
  vehicle_type  text not null,            -- Sedan | SUV | Tempo Traveller | Bus
  vehicle_number text,
  seat_capacity int not null check (seat_capacity > 0),
  driver_name   text,
  driver_phone  text,
  amenities     text[] not null default '{}',
  image_url     text,
  status        transport_status not null default 'ACTIVE',
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index transport_services_hotel_idx on public.transport_services (hotel_id);

create trigger transport_services_set_updated_at
  before update on public.transport_services
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
create table public.transport_routes (
  id              uuid primary key default gen_random_uuid(),
  hotel_id        uuid not null references public.hotels(id) on delete cascade,
  name            text not null,           -- 'Hotel → Airport'
  pickup_location text not null,
  drop_location   text not null,
  distance_km     numeric(6,2),
  duration_minutes int,
  base_price      numeric(12,2) not null default 0 check (base_price >= 0),
  price_per_seat  numeric(12,2) not null default 0 check (price_per_seat >= 0),
  is_active       boolean not null default true,
  sort_order      int not null default 0,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index transport_routes_hotel_idx on public.transport_routes (hotel_id) where is_active;

create trigger transport_routes_set_updated_at
  before update on public.transport_routes
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- transport_slots: a departure on a date/time with its own seat inventory.
-- Mirrors the room oversell guard: booked_seats <= seat_capacity.
-- ---------------------------------------------------------------------------
create table public.transport_slots (
  id            uuid primary key default gen_random_uuid(),
  hotel_id      uuid not null references public.hotels(id) on delete cascade,
  route_id      uuid not null references public.transport_routes(id) on delete cascade,
  service_id    uuid references public.transport_services(id) on delete set null,
  depart_date   date not null,
  depart_time   time not null,
  seat_capacity int not null check (seat_capacity > 0),
  booked_seats  int not null default 0 check (booked_seats >= 0),
  price_override numeric(12,2),
  status        transport_status not null default 'ACTIVE',
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),

  unique (route_id, depart_date, depart_time, service_id),
  constraint transport_slots_no_oversell check (booked_seats <= seat_capacity)
);

create index transport_slots_lookup_idx
  on public.transport_slots (hotel_id, depart_date, status);

create trigger transport_slots_set_updated_at
  before update on public.transport_slots
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
create table public.transport_bookings (
  id          uuid primary key default gen_random_uuid(),
  booking_id  uuid references public.bookings(id) on delete cascade,
  hotel_id    uuid not null references public.hotels(id) on delete restrict,
  slot_id     uuid not null references public.transport_slots(id) on delete restrict,
  route_name  text not null,
  customer_id uuid references public.profiles(id) on delete set null,
  seats       int not null check (seats > 0),
  pickup_time time,
  amount      numeric(12,2) not null default 0,
  status      booking_status not null default 'PENDING',
  notes       text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index transport_bookings_booking_idx on public.transport_bookings (booking_id);
create index transport_bookings_slot_idx on public.transport_bookings (slot_id);

create trigger transport_bookings_set_updated_at
  before update on public.transport_bookings
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- offers / coupons (PRD §30)
-- ---------------------------------------------------------------------------
create table public.offers (
  id                 uuid primary key default gen_random_uuid(),
  -- null hotel_id = platform-wide offer
  hotel_id           uuid references public.hotels(id) on delete cascade,
  title              text not null,
  description        text,
  offer_type         offer_type not null default 'PERCENTAGE',
  discount_percent   numeric(5,2) check (discount_percent between 0 and 100),
  discount_amount    numeric(12,2) check (discount_amount >= 0),
  max_discount       numeric(12,2),
  banner_url         text,
  valid_from         date,
  valid_until        date,
  is_active          boolean not null default true,
  sort_order         int not null default 0,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  constraint offers_has_value check (
    discount_percent is not null or discount_amount is not null
  )
);

create index offers_hotel_idx on public.offers (hotel_id) where is_active;

create trigger offers_set_updated_at
  before update on public.offers
  for each row execute function public.set_updated_at();

create table public.coupons (
  id                 uuid primary key default gen_random_uuid(),
  offer_id           uuid references public.offers(id) on delete set null,
  code               citext not null unique,
  description        text,
  offer_type         offer_type not null default 'PERCENTAGE',
  discount_percent   numeric(5,2) check (discount_percent between 0 and 100),
  discount_amount    numeric(12,2) check (discount_amount >= 0),
  max_discount       numeric(12,2),
  min_booking_amount numeric(12,2) not null default 0,
  -- empty array = applies everywhere
  hotel_ids          uuid[] not null default '{}'::uuid[],
  room_type_ids      uuid[] not null default '{}'::uuid[],
  usage_limit        int,                    -- null = unlimited
  usage_limit_per_user int,
  used_count         int not null default 0,
  valid_from         timestamptz,
  valid_until        timestamptz,
  is_active          boolean not null default true,
  created_by         uuid references public.profiles(id),
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  constraint coupons_has_value check (
    discount_percent is not null or discount_amount is not null
  )
);

create index coupons_active_idx on public.coupons (is_active, valid_until);

create trigger coupons_set_updated_at
  before update on public.coupons
  for each row execute function public.set_updated_at();

create table public.coupon_redemptions (
  id         uuid primary key default gen_random_uuid(),
  coupon_id  uuid not null references public.coupons(id) on delete cascade,
  booking_id uuid not null references public.bookings(id) on delete cascade,
  customer_id uuid references public.profiles(id) on delete set null,
  amount     numeric(12,2) not null default 0,
  created_at timestamptz not null default now(),
  unique (coupon_id, booking_id)
);

create index coupon_redemptions_customer_idx
  on public.coupon_redemptions (coupon_id, customer_id);

-- ---------------------------------------------------------------------------
-- reviews (PRD §19) — only eligible completed bookings may be reviewed
-- ---------------------------------------------------------------------------
create table public.reviews (
  id           uuid primary key default gen_random_uuid(),
  hotel_id     uuid not null references public.hotels(id) on delete cascade,
  booking_id   uuid references public.bookings(id) on delete set null,
  customer_id  uuid references public.profiles(id) on delete set null,
  author_name  text not null,
  rating       numeric(2,1) not null check (rating between 1 and 5),
  title        text,
  comment      text,
  cleanliness_rating numeric(2,1) check (cleanliness_rating between 1 and 5),
  service_rating     numeric(2,1) check (service_rating between 1 and 5),
  location_rating    numeric(2,1) check (location_rating between 1 and 5),
  value_rating       numeric(2,1) check (value_rating between 1 and 5),
  status       review_status not null default 'PENDING',
  admin_response text,
  responded_at timestamptz,
  moderated_by uuid references public.profiles(id),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  -- one review per booking
  unique (booking_id)
);

create index reviews_hotel_idx on public.reviews (hotel_id, status, created_at desc);
create index reviews_customer_idx on public.reviews (customer_id);

create trigger reviews_set_updated_at
  before update on public.reviews
  for each row execute function public.set_updated_at();

create table public.review_images (
  id         uuid primary key default gen_random_uuid(),
  review_id  uuid not null references public.reviews(id) on delete cascade,
  url        text not null,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

create index review_images_review_idx on public.review_images (review_id);

-- A review is only accepted for a stay the customer actually completed.
create or replace function public.enforce_review_eligibility()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_ok boolean;
begin
  -- Admin-entered reviews (no booking) are allowed for migration/import.
  if new.booking_id is null then
    return new;
  end if;

  select exists (
    select 1 from public.bookings b
    where b.id = new.booking_id
      and b.hotel_id = new.hotel_id
      and b.customer_id is not distinct from new.customer_id
      and b.status = 'CHECKED_OUT'
  ) into v_ok;

  if not v_ok then
    raise exception 'Reviews require a checked-out booking for this hotel'
      using errcode = 'P0001';
  end if;

  return new;
end;
$$;

create trigger reviews_enforce_eligibility
  before insert on public.reviews
  for each row execute function public.enforce_review_eligibility();
