-- =============================================================================
-- AQOSS HOTEL — 07. Notifications & audit logs (PRD §20, §28, §29, §48)
-- =============================================================================

create table public.notification_templates (
  id          uuid primary key default gen_random_uuid(),
  -- null hotel_id = platform default; a hotel row overrides it
  hotel_id    uuid references public.hotels(id) on delete cascade,
  event_key   text not null,          -- booking.confirmed, payment.received, ...
  channel     notification_channel not null,
  subject     text,
  body        text not null,          -- supports {{placeholders}}
  is_active   boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (hotel_id, event_key, channel)
);

-- One platform-default template per (event, channel).
create unique index notification_templates_default_idx
  on public.notification_templates (event_key, channel)
  where hotel_id is null;

create trigger notification_templates_set_updated_at
  before update on public.notification_templates
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- notifications: the outbox. A worker/route drains QUEUED rows.
-- ---------------------------------------------------------------------------
create table public.notifications (
  id           uuid primary key default gen_random_uuid(),
  hotel_id     uuid references public.hotels(id) on delete set null,
  booking_id   uuid references public.bookings(id) on delete set null,
  customer_id  uuid references public.profiles(id) on delete set null,
  event_key    text not null,
  channel      notification_channel not null,
  recipient    text not null,          -- email address or phone number
  subject      text,
  body         text,
  payload      jsonb not null default '{}'::jsonb,
  state        notification_state not null default 'QUEUED',
  scheduled_at timestamptz not null default now(),   -- reminders schedule ahead
  sent_at      timestamptz,
  attempts     int not null default 0,
  last_error   text,
  created_at   timestamptz not null default now()
);

create index notifications_queue_idx
  on public.notifications (state, scheduled_at)
  where state = 'QUEUED';
create index notifications_booking_idx on public.notifications (booking_id);

create table public.notification_logs (
  id              uuid primary key default gen_random_uuid(),
  notification_id uuid references public.notifications(id) on delete cascade,
  provider        text,
  provider_message_id text,
  state           notification_state not null,
  response        jsonb not null default '{}'::jsonb,
  created_at      timestamptz not null default now()
);

create index notification_logs_notification_idx
  on public.notification_logs (notification_id);

-- ---------------------------------------------------------------------------
-- otp_codes: mobile/email OTP (PRD §11). Codes are stored hashed.
-- ---------------------------------------------------------------------------
create table public.otp_codes (
  id          uuid primary key default gen_random_uuid(),
  identifier  text not null,             -- phone or email
  channel     notification_channel not null default 'SMS',
  code_hash   text not null,
  purpose     text not null default 'login',
  attempts    int not null default 0,
  consumed_at timestamptz,
  expires_at  timestamptz not null,
  created_at  timestamptz not null default now()
);

create index otp_codes_lookup_idx on public.otp_codes (identifier, purpose, expires_at desc);

-- ---------------------------------------------------------------------------
-- audit_logs (PRD §48)
-- ---------------------------------------------------------------------------
create table public.audit_logs (
  id         uuid primary key default gen_random_uuid(),
  actor_id   uuid references public.profiles(id) on delete set null,
  actor_name text,
  action     text not null,            -- hotel.created, booking.cancelled, ...
  entity     text not null,            -- table/domain name
  entity_id  uuid,
  hotel_id   uuid references public.hotels(id) on delete set null,
  old_value  jsonb,
  new_value  jsonb,
  ip_address inet,
  user_agent text,
  created_at timestamptz not null default now()
);

create index audit_logs_entity_idx on public.audit_logs (entity, entity_id, created_at desc);
create index audit_logs_actor_idx on public.audit_logs (actor_id, created_at desc);
create index audit_logs_hotel_idx on public.audit_logs (hotel_id, created_at desc);

-- ---------------------------------------------------------------------------
-- platform_settings: system-wide configuration editable from the CRM
-- ---------------------------------------------------------------------------
create table public.platform_settings (
  key        text primary key,
  value      jsonb not null default 'null'::jsonb,
  category   text not null default 'general',
  is_secret  boolean not null default false,
  updated_by uuid references public.profiles(id),
  updated_at timestamptz not null default now()
);

create trigger platform_settings_set_updated_at
  before update on public.platform_settings
  for each row execute function public.set_updated_at();
