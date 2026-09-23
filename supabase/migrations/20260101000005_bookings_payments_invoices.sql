-- =============================================================================
-- AQOSS HOTEL — 05. Bookings, payments, refunds, invoices
-- (PRD §13, §14, §15, §26, §27)
-- =============================================================================

-- Booking reference: AQH-2026-000001  (PRD §13)
create sequence if not exists public.booking_reference_seq;

create or replace function public.next_booking_reference()
returns text
language sql
volatile
as $$
  select 'AQH-' || to_char(now() at time zone 'Asia/Kolkata', 'YYYY') || '-' ||
         lpad(nextval('public.booking_reference_seq')::text, 6, '0');
$$;

-- ---------------------------------------------------------------------------
create table public.bookings (
  id                uuid primary key default gen_random_uuid(),
  reference         text not null unique default public.next_booking_reference(),

  hotel_id          uuid not null references public.hotels(id) on delete restrict,
  website_id        uuid references public.websites(id) on delete set null,
  customer_id       uuid references public.profiles(id) on delete set null,

  -- denormalised contact, so a booking stays readable if the profile is removed
  guest_name        text not null,
  guest_email       citext not null,
  guest_phone       text not null,
  guest_address     text,
  special_requests  text,

  check_in          date not null,
  check_out         date not null,
  nights            int generated always as (check_out - check_in) stored,
  adults            int not null default 1 check (adults > 0),
  children          int not null default 0 check (children >= 0),
  rooms_count       int not null default 1 check (rooms_count > 0),

  status            booking_status not null default 'PENDING',
  payment_status    payment_status not null default 'PENDING',

  -- money (PRD §15) — every figure is computed server-side
  currency          text not null default 'INR',
  room_subtotal     numeric(12,2) not null default 0,
  extra_services_total numeric(12,2) not null default 0,
  transport_total   numeric(12,2) not null default 0,
  discount_total    numeric(12,2) not null default 0,
  coupon_code       text,
  coupon_discount   numeric(12,2) not null default 0,
  tax_total         numeric(12,2) not null default 0,
  total_amount      numeric(12,2) not null default 0,
  amount_paid       numeric(12,2) not null default 0,
  amount_refunded   numeric(12,2) not null default 0,

  price_breakdown   jsonb not null default '{}'::jsonb,
  source            text not null default 'WEBSITE',  -- WEBSITE | CRM | PHONE | OTA
  cancellation_reason text,
  cancelled_at      timestamptz,
  checked_in_at     timestamptz,
  checked_out_at    timestamptz,

  created_by        uuid references public.profiles(id),
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),

  constraint bookings_date_order check (check_out > check_in)
);

create index bookings_hotel_idx on public.bookings (hotel_id, check_in);
create index bookings_customer_idx on public.bookings (customer_id, created_at desc);
create index bookings_status_idx on public.bookings (status);
create index bookings_payment_status_idx on public.bookings (payment_status);
create index bookings_website_idx on public.bookings (website_id);
create index bookings_reference_idx on public.bookings (reference);

create trigger bookings_set_updated_at
  before update on public.bookings
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- booking_rooms: the room types (and nightly rates) held by a booking
-- ---------------------------------------------------------------------------
create table public.booking_rooms (
  id             uuid primary key default gen_random_uuid(),
  booking_id     uuid not null references public.bookings(id) on delete cascade,
  room_type_id   uuid not null references public.room_types(id) on delete restrict,
  room_id        uuid references public.rooms(id) on delete set null, -- assigned at check-in
  room_type_name text not null,          -- snapshot
  rooms          int not null default 1 check (rooms > 0),
  adults         int not null default 1,
  children       int not null default 0,
  nightly_rates  jsonb not null default '[]'::jsonb,  -- [{date, price}]
  subtotal       numeric(12,2) not null default 0,
  discount       numeric(12,2) not null default 0,
  tax            numeric(12,2) not null default 0,
  total          numeric(12,2) not null default 0,
  created_at     timestamptz not null default now()
);

create index booking_rooms_booking_idx on public.booking_rooms (booking_id);
create index booking_rooms_type_idx on public.booking_rooms (room_type_id);

-- ---------------------------------------------------------------------------
create table public.booking_guests (
  id          uuid primary key default gen_random_uuid(),
  booking_id  uuid not null references public.bookings(id) on delete cascade,
  full_name   text not null,
  age         int,
  is_child    boolean not null default false,
  id_type     text,
  id_number   text,
  created_at  timestamptz not null default now()
);

create index booking_guests_booking_idx on public.booking_guests (booking_id);

-- ---------------------------------------------------------------------------
create table public.booking_status_history (
  id          uuid primary key default gen_random_uuid(),
  booking_id  uuid not null references public.bookings(id) on delete cascade,
  from_status booking_status,
  to_status   booking_status not null,
  note        text,
  changed_by  uuid references public.profiles(id),
  created_at  timestamptz not null default now()
);

create index booking_status_history_booking_idx
  on public.booking_status_history (booking_id, created_at desc);

-- Record every status transition automatically.
create or replace function public.log_booking_status_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    insert into public.booking_status_history (booking_id, from_status, to_status, changed_by)
    values (new.id, null, new.status, new.created_by);
  elsif new.status is distinct from old.status then
    insert into public.booking_status_history (booking_id, from_status, to_status, changed_by)
    values (new.id, old.status, new.status, auth.uid());
  end if;
  return new;
end;
$$;

create trigger bookings_log_status
  after insert or update of status on public.bookings
  for each row execute function public.log_booking_status_change();

-- ---------------------------------------------------------------------------
-- payments (PRD §27)
-- ---------------------------------------------------------------------------
create table public.payments (
  id                 uuid primary key default gen_random_uuid(),
  booking_id         uuid not null references public.bookings(id) on delete cascade,
  customer_id        uuid references public.profiles(id) on delete set null,
  hotel_id           uuid not null references public.hotels(id) on delete restrict,

  provider           text not null default 'mock',    -- razorpay | stripe | mock
  provider_order_id  text,
  provider_payment_id text,
  provider_signature text,

  amount             numeric(12,2) not null check (amount >= 0),
  tax                numeric(12,2) not null default 0,
  discount           numeric(12,2) not null default 0,
  currency           text not null default 'INR',
  status             payment_status not null default 'PENDING',
  method             text,                            -- card | upi | netbanking
  failure_reason     text,
  raw_response       jsonb not null default '{}'::jsonb,

  paid_at            timestamptz,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

create index payments_booking_idx on public.payments (booking_id);
create index payments_status_idx on public.payments (status);
create unique index payments_provider_payment_idx
  on public.payments (provider, provider_payment_id)
  where provider_payment_id is not null;

create trigger payments_set_updated_at
  before update on public.payments
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
create table public.refunds (
  id                uuid primary key default gen_random_uuid(),
  payment_id        uuid not null references public.payments(id) on delete cascade,
  booking_id        uuid not null references public.bookings(id) on delete cascade,
  amount            numeric(12,2) not null check (amount > 0),
  reason            text,
  status            payment_status not null default 'PENDING',
  provider_refund_id text,
  raw_response      jsonb not null default '{}'::jsonb,
  processed_by      uuid references public.profiles(id),
  processed_at      timestamptz,
  created_at        timestamptz not null default now()
);

create index refunds_booking_idx on public.refunds (booking_id);

-- ---------------------------------------------------------------------------
create sequence if not exists public.invoice_number_seq;

create table public.invoices (
  id             uuid primary key default gen_random_uuid(),
  booking_id     uuid not null references public.bookings(id) on delete cascade,
  hotel_id       uuid not null references public.hotels(id) on delete restrict,
  invoice_number text not null unique,
  issued_to      text not null,
  issued_email   citext,
  currency       text not null default 'INR',
  subtotal       numeric(12,2) not null default 0,
  discount       numeric(12,2) not null default 0,
  tax            numeric(12,2) not null default 0,
  total          numeric(12,2) not null default 0,
  line_items     jsonb not null default '[]'::jsonb,
  pdf_url        text,
  issued_at      timestamptz not null default now(),
  created_at     timestamptz not null default now()
);

create index invoices_booking_idx on public.invoices (booking_id);

create or replace function public.next_invoice_number()
returns text
language sql
volatile
as $$
  select 'INV-' || to_char(now() at time zone 'Asia/Kolkata', 'YYYY') || '-' ||
         lpad(nextval('public.invoice_number_seq')::text, 6, '0');
$$;
