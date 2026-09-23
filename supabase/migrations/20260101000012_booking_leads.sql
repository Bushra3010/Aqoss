-- Leads from abandoned bookings.
--
-- A lead is a booking the guest started — name, email and phone already
-- captured — but never paid for. The booking row itself is the lead; this
-- table only records the follow-up (status, notes, who touched it last), so a
-- lead appears in the CRM without any trigger and disappears into CONVERTED on
-- its own once the booking is paid.

create type lead_status as enum ('NEW', 'CONTACTED', 'CONVERTED', 'LOST');

create table public.booking_leads (
  id                 uuid primary key default gen_random_uuid(),
  hotel_id           uuid not null references public.hotels(id) on delete cascade,
  booking_id         uuid not null unique references public.bookings(id) on delete cascade,
  status             lead_status not null default 'NEW',
  notes              text,
  last_contacted_at  timestamptz,
  updated_by         uuid references public.profiles(id) on delete set null,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

create index booking_leads_hotel_status_idx on public.booking_leads (hotel_id, status);

create trigger booking_leads_set_updated_at
  before update on public.booking_leads
  for each row execute function public.set_updated_at();

alter table public.booking_leads enable row level security;

create policy booking_leads_staff_read on public.booking_leads
  for select using (public.has_permission('leads.read') and public.can_access_hotel(hotel_id));

create policy booking_leads_staff_write on public.booking_leads
  for all using (public.has_permission('leads.write') and public.can_access_hotel(hotel_id))
  with check (public.has_permission('leads.write') and public.can_access_hotel(hotel_id));

-- Permissions, and the roles that follow up with guests.
insert into public.permissions (key, module, action, description) values
  ('leads.read',  'leads', 'read',  'View abandoned-booking leads'),
  ('leads.write', 'leads', 'write', 'Update lead status and notes')
on conflict (key) do nothing;

with grants(role_key, permission_key) as (
  values
    ('booking_manager',  'leads.read'), ('booking_manager',  'leads.write'),
    ('crm_staff',        'leads.read'), ('crm_staff',        'leads.write'),
    ('property_manager', 'leads.read'), ('property_manager', 'leads.write')
)
insert into public.role_permissions (role_id, permission_id)
select r.id, p.id
from grants g
join public.roles r on r.key = g.role_key
join public.permissions p on p.key = g.permission_key
on conflict do nothing;
