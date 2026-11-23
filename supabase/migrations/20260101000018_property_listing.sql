-- Property listing: "Create website" became a step-by-step listing (property
-- type, basic info, location, amenities, rooms, photos, policies, finance &
-- legal) that ends with the hotel and its website going live.
--
-- property_type is public (the website can say "Resort"). Finance & legal
-- details are not: hotels rows are readable by anyone once ACTIVE, so PAN,
-- GSTIN and bank details live in their own staff-only table.

alter table public.hotels add column property_type text;

create table public.hotel_legal_details (
  hotel_id            uuid primary key references public.hotels(id) on delete cascade,
  legal_name          text,
  ownership_type      text,      -- individual | partnership | company | llp | trust | other
  pan                 text,
  gstin               text,
  bank_account_name   text,
  bank_account_number text,
  bank_ifsc           text,
  bank_name           text,
  updated_by          uuid references public.profiles(id) on delete set null,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

create trigger hotel_legal_details_set_updated_at
  before update on public.hotel_legal_details
  for each row execute function public.set_updated_at();

alter table public.hotel_legal_details enable row level security;

-- Staff of the hotel only; nothing public, not even for a live hotel.
create policy hotel_legal_details_staff_read on public.hotel_legal_details
  for select using (public.has_permission('hotels.read') and public.can_access_hotel(hotel_id));

create policy hotel_legal_details_staff_write on public.hotel_legal_details
  for all using (public.has_permission('hotels.write') and public.can_access_hotel(hotel_id))
  with check (public.has_permission('hotels.write') and public.can_access_hotel(hotel_id));

-- ---------------------------------------------------------------------------
-- Owners list their own property from the website; AQOSS puts it live.
--
-- listings.publish is that approval. Super Admin has it through '*'; a hotel's
-- own admins do not, so they can fill in a listing but only submit it.
--
-- property_owner is the role an owner gets when they sign up on the website,
-- always scoped to the one property they created. It covers only the listing
-- itself (the hotel, its rooms and photos); when the listing goes live the
-- owner moves to property_manager to run the property.
-- ---------------------------------------------------------------------------

insert into public.permissions (key, module, action, description) values
  ('listings.publish', 'listings', 'publish', 'Approve a property listing and put the property and its website live')
on conflict (key) do nothing;

insert into public.roles (key, name, description, is_system) values
  ('property_owner', 'Property Owner',
   'Signed up on the website to list one property; fills in the listing until AQOSS approves it', true)
on conflict (key) do nothing;

with grants(permission_key) as (
  values ('hotels.read'), ('hotels.write'), ('rooms.read'), ('rooms.write')
)
insert into public.role_permissions (role_id, permission_id)
select r.id, p.id
from grants g
join public.roles r on r.key = 'property_owner'
join public.permissions p on p.key = g.permission_key
on conflict do nothing;
