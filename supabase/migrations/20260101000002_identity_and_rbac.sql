-- =============================================================================
-- AQOSS HOTEL — 02. Profiles, roles, permissions (PRD §11, §31, §43)
-- Role permissions live in the database, never hard-coded in the app.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- profiles: one row per auth.users row (customers AND admins)
-- ---------------------------------------------------------------------------
create table public.profiles (
  id              uuid primary key references auth.users(id) on delete cascade,
  full_name       text,
  email           citext,
  mobile          text,
  profile_photo   text,
  address_line1   text,
  address_line2   text,
  city            text,
  state           text,
  country         text default 'India',
  postal_code     text,
  date_of_birth   date,
  id_type         text,
  id_number       text,
  is_admin        boolean not null default false,
  is_active       boolean not null default true,
  marketing_optin boolean not null default false,
  metadata        jsonb not null default '{}'::jsonb,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index profiles_email_idx on public.profiles (email);
create index profiles_mobile_idx on public.profiles (mobile);
create index profiles_is_admin_idx on public.profiles (is_admin) where is_admin;

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- Auto-provision a profile whenever Supabase Auth creates a user.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, email, mobile)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name'),
    new.email,
    coalesce(new.raw_user_meta_data->>'mobile', new.phone)
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- roles / permissions / role_permissions
-- ---------------------------------------------------------------------------
create table public.roles (
  id           uuid primary key default gen_random_uuid(),
  key          text not null unique,          -- e.g. 'super_admin'
  name         text not null,
  description  text,
  is_system    boolean not null default false, -- system roles cannot be deleted
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create trigger roles_set_updated_at
  before update on public.roles
  for each row execute function public.set_updated_at();

create table public.permissions (
  id          uuid primary key default gen_random_uuid(),
  key         text not null unique,            -- e.g. 'bookings.cancel'
  module      text not null,                   -- e.g. 'bookings'
  action      text not null,                   -- e.g. 'cancel'
  description text,
  created_at  timestamptz not null default now()
);

create index permissions_module_idx on public.permissions (module);

create table public.role_permissions (
  role_id       uuid not null references public.roles(id) on delete cascade,
  permission_id uuid not null references public.permissions(id) on delete cascade,
  primary key (role_id, permission_id)
);

-- ---------------------------------------------------------------------------
-- admin_users: links a profile to a role, optionally scoped to hotels
-- ---------------------------------------------------------------------------
create table public.admin_users (
  id          uuid primary key default gen_random_uuid(),
  profile_id  uuid not null references public.profiles(id) on delete cascade,
  role_id     uuid not null references public.roles(id) on delete restrict,
  -- null/empty = every hotel; otherwise the admin only sees these hotels
  hotel_scope uuid[] not null default '{}'::uuid[],
  is_active   boolean not null default true,
  created_by  uuid references public.profiles(id),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (profile_id)
);

create trigger admin_users_set_updated_at
  before update on public.admin_users
  for each row execute function public.set_updated_at();

-- Keep profiles.is_admin in sync with admin_users membership.
create or replace function public.sync_profile_admin_flag()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if (tg_op = 'DELETE') then
    update public.profiles set is_admin = false where id = old.profile_id;
    return old;
  end if;
  update public.profiles set is_admin = new.is_active where id = new.profile_id;
  return new;
end;
$$;

create trigger admin_users_sync_flag
  after insert or update or delete on public.admin_users
  for each row execute function public.sync_profile_admin_flag();

-- ---------------------------------------------------------------------------
-- Authorisation helpers used by RLS policies throughout the schema
-- ---------------------------------------------------------------------------
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.admin_users au
    where au.profile_id = auth.uid() and au.is_active
  );
$$;

create or replace function public.has_permission(permission_key text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.admin_users au
    join public.role_permissions rp on rp.role_id = au.role_id
    join public.permissions p on p.id = rp.permission_id
    where au.profile_id = auth.uid()
      and au.is_active
      and (p.key = permission_key or p.key = '*')
  );
$$;

create or replace function public.can_access_hotel(target_hotel_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.admin_users au
    where au.profile_id = auth.uid()
      and au.is_active
      and (
        cardinality(au.hotel_scope) = 0
        or target_hotel_id = any (au.hotel_scope)
      )
  );
$$;
