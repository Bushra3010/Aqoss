-- "Register your hotel" requests from the CRM sign-in page.
--
-- A registration is a request, not an account: nobody gets CRM access by
-- filling in the form. A super admin reviews it, then adds the hotel and its
-- staff in the CRM as usual. Written only by the server (service role) after
-- validation and spam checks; nothing public can read them.

create type hotel_registration_status as enum ('NEW', 'APPROVED', 'REJECTED');

create table public.hotel_registrations (
  id           uuid primary key default gen_random_uuid(),
  name         text not null,
  hotel_name   text not null,
  email        citext not null,
  phone        text not null,
  city         text not null,
  address      text,
  rooms        int check (rooms is null or rooms between 1 and 10000),
  message      text,
  status       hotel_registration_status not null default 'NEW',
  notes        text,
  updated_by   uuid references public.profiles(id) on delete set null,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index hotel_registrations_status_created_idx on public.hotel_registrations (status, created_at desc);

create trigger hotel_registrations_set_updated_at
  before update on public.hotel_registrations
  for each row execute function public.set_updated_at();

alter table public.hotel_registrations enable row level security;

create policy hotel_registrations_staff_read on public.hotel_registrations
  for select using (public.has_permission('hotel_registrations.read'));

create policy hotel_registrations_staff_write on public.hotel_registrations
  for update using (public.has_permission('hotel_registrations.write'))
  with check (public.has_permission('hotel_registrations.write'));

insert into public.permissions (key, module, action, description) values
  ('hotel_registrations.read',  'hotel_registrations', 'read',  'View hotel registrations from the CRM sign-in page'),
  ('hotel_registrations.write', 'hotel_registrations', 'write', 'Approve or reject hotel registrations')
on conflict (key) do nothing;
