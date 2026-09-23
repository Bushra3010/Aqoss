-- =============================================================================
-- AQOSS HOTEL — 01. Extensions, enums, shared helpers
-- =============================================================================

create extension if not exists "pgcrypto";
create extension if not exists "btree_gist";
create extension if not exists "citext";

-- ---------------------------------------------------------------------------
-- Enumerated types (PRD §14, §19, §22)
-- ---------------------------------------------------------------------------
create type booking_status as enum (
  'PENDING', 'CONFIRMED', 'CHECKED_IN', 'CHECKED_OUT', 'CANCELLED', 'REFUNDED'
);

create type payment_status as enum (
  'PENDING', 'PAID', 'FAILED', 'PARTIALLY_REFUNDED', 'REFUNDED'
);

create type website_status as enum ('DRAFT', 'ACTIVE', 'INACTIVE', 'SUSPENDED');

create type review_status as enum ('PENDING', 'APPROVED', 'HIDDEN', 'DELETED');

create type hotel_status as enum ('DRAFT', 'ACTIVE', 'INACTIVE', 'ARCHIVED');

create type offer_type as enum (
  'PERCENTAGE', 'FIXED', 'SEASONAL', 'EARLY_BIRD', 'LAST_MINUTE'
);

create type transport_status as enum ('ACTIVE', 'INACTIVE', 'CANCELLED', 'COMPLETED');

create type notification_channel as enum ('EMAIL', 'SMS', 'OTP', 'WHATSAPP', 'PUSH');

create type notification_state as enum ('QUEUED', 'SENT', 'FAILED', 'SKIPPED');

-- ---------------------------------------------------------------------------
-- Shared trigger: maintain updated_at
-- ---------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- Slugify helper, used for hotel/room slugs
-- ---------------------------------------------------------------------------
create or replace function public.slugify(value text)
returns text
language sql
immutable
as $$
  select trim(both '-' from
    regexp_replace(lower(coalesce(value, '')), '[^a-z0-9]+', '-', 'g')
  );
$$;
