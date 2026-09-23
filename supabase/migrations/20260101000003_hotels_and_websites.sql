-- =============================================================================
-- AQOSS HOTEL — 03. Hotels & multi-website layer (PRD §4, §17, §18, §21, §22)
-- =============================================================================

create table public.hotels (
  id              uuid primary key default gen_random_uuid(),
  name            text not null,
  slug            text not null unique,
  tagline         text,
  description     text,
  logo_url        text,
  star_rating     numeric(2,1) check (star_rating between 0 and 5),
  status          hotel_status not null default 'DRAFT',

  -- contact
  email           citext,
  phone           text,
  alt_phone       text,
  website_url     text,

  -- location (PRD §17)
  address_line1   text,
  address_line2   text,
  city            text,
  state           text,
  country         text not null default 'India',
  postal_code     text,
  latitude        numeric(9,6),
  longitude       numeric(9,6),
  google_maps_url text,

  -- operations
  check_in_time   time not null default '14:00',
  check_out_time  time not null default '11:00',
  currency        text not null default 'INR',
  timezone        text not null default 'Asia/Kolkata',
  tax_percent     numeric(5,2) not null default 12.00,

  highlights      text[] not null default '{}',
  metadata        jsonb not null default '{}'::jsonb,

  created_by      uuid references public.profiles(id),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  archived_at     timestamptz
);

create index hotels_status_idx on public.hotels (status);
create index hotels_city_idx on public.hotels (city);

create trigger hotels_set_updated_at
  before update on public.hotels
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
create table public.hotel_amenities (
  id         uuid primary key default gen_random_uuid(),
  hotel_id   uuid not null references public.hotels(id) on delete cascade,
  name       text not null,
  icon       text,
  category   text,                      -- 'general' | 'wellness' | 'food' | ...
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  unique (hotel_id, name)
);

create index hotel_amenities_hotel_idx on public.hotel_amenities (hotel_id);

-- ---------------------------------------------------------------------------
create table public.hotel_images (
  id          uuid primary key default gen_random_uuid(),
  hotel_id    uuid not null references public.hotels(id) on delete cascade,
  url         text not null,
  alt_text    text,
  caption     text,
  is_cover    boolean not null default false,
  sort_order  int not null default 0,
  created_at  timestamptz not null default now()
);

create index hotel_images_hotel_idx on public.hotel_images (hotel_id, sort_order);
create unique index hotel_images_one_cover_idx
  on public.hotel_images (hotel_id) where is_cover;

-- ---------------------------------------------------------------------------
-- hotel_policies: property rules (PRD §18). One row per policy type.
-- ---------------------------------------------------------------------------
create table public.hotel_policies (
  id          uuid primary key default gen_random_uuid(),
  hotel_id    uuid not null references public.hotels(id) on delete cascade,
  policy_type text not null,   -- check_in | cancellation | child | pet | smoking | ...
  title       text not null,
  content     text not null,
  sort_order  int not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (hotel_id, policy_type, title)
);

create index hotel_policies_hotel_idx on public.hotel_policies (hotel_id, sort_order);

create trigger hotel_policies_set_updated_at
  before update on public.hotel_policies
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- hotel_nearby_places: airport / bus stand / attractions (PRD §17)
-- ---------------------------------------------------------------------------
create table public.hotel_nearby_places (
  id          uuid primary key default gen_random_uuid(),
  hotel_id    uuid not null references public.hotels(id) on delete cascade,
  name        text not null,
  place_type  text not null,   -- airport | railway | bus_stand | attraction | ...
  distance_km numeric(6,2),
  travel_time text,
  latitude    numeric(9,6),
  longitude   numeric(9,6),
  sort_order  int not null default 0,
  created_at  timestamptz not null default now()
);

create index hotel_nearby_hotel_idx on public.hotel_nearby_places (hotel_id, sort_order);

-- ---------------------------------------------------------------------------
-- website_templates: the reusable template registry (PRD §5)
-- ---------------------------------------------------------------------------
create table public.website_templates (
  id          uuid primary key default gen_random_uuid(),
  key         text not null unique,   -- resolves to a React template component
  name        text not null,
  description text,
  preview_url text,
  is_active   boolean not null default true,
  created_at  timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- websites: one hotel -> many websites (PRD §24 keeps the door open)
-- ---------------------------------------------------------------------------
create table public.websites (
  id             uuid primary key default gen_random_uuid(),
  hotel_id       uuid not null references public.hotels(id) on delete cascade,
  template_id    uuid references public.website_templates(id) on delete set null,
  name           text not null,
  slug           text not null unique,        -- also the dev subdomain
  status         website_status not null default 'DRAFT',

  -- branding
  logo_url       text,
  favicon_url    text,
  primary_color  text not null default '#0F766E',
  accent_color   text not null default '#F59E0B',

  -- SEO (PRD §45)
  seo_title        text,
  seo_description  text,
  og_image_url     text,
  canonical_url    text,
  robots_indexable boolean not null default true,
  google_analytics_id text,

  -- arbitrary per-website content overrides consumed by the template
  content        jsonb not null default '{}'::jsonb,
  settings       jsonb not null default '{}'::jsonb,

  published_at   timestamptz,
  created_by     uuid references public.profiles(id),
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

create index websites_hotel_idx on public.websites (hotel_id);
create index websites_status_idx on public.websites (status);

create trigger websites_set_updated_at
  before update on public.websites
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- website_domains: hostname -> website resolution (PRD §38)
-- ---------------------------------------------------------------------------
create table public.website_domains (
  id          uuid primary key default gen_random_uuid(),
  website_id  uuid not null references public.websites(id) on delete cascade,
  hostname    citext not null unique,      -- 'www.hotela.com', 'hotel-a.localhost'
  is_primary  boolean not null default false,
  is_verified boolean not null default false,
  verified_at timestamptz,
  created_at  timestamptz not null default now()
);

create index website_domains_website_idx on public.website_domains (website_id);
create unique index website_domains_one_primary_idx
  on public.website_domains (website_id) where is_primary;

-- ---------------------------------------------------------------------------
-- website_settings: loose key/value config per website
-- ---------------------------------------------------------------------------
create table public.website_settings (
  id          uuid primary key default gen_random_uuid(),
  website_id  uuid not null references public.websites(id) on delete cascade,
  key         text not null,
  value       jsonb not null default 'null'::jsonb,
  updated_at  timestamptz not null default now(),
  unique (website_id, key)
);

create trigger website_settings_set_updated_at
  before update on public.website_settings
  for each row execute function public.set_updated_at();
