-- A role for one person running a single property end to end. Pair it with an
-- admin_users.hotel_scope of that hotel's id.
--
-- Deliberately excludes customers, offers, notifications, admins, settings and
-- audit: those screens are not filtered by hotel scope, so granting them would
-- show the manager other properties' data.

insert into public.roles (key, name, description, is_system) values
  ('property_manager', 'Property Manager',
   'Runs one property end to end: bookings, rooms, pricing, website, payments and reviews', true)
on conflict (key) do nothing;

with grants(permission_key) as (
  values
    ('dashboard.read'), ('hotels.read'), ('hotels.write'), ('websites.read'), ('websites.write'),
    ('rooms.read'), ('rooms.write'), ('inventory.read'), ('inventory.write'), ('pricing.read'),
    ('pricing.write'), ('bookings.read'), ('bookings.write'), ('bookings.cancel'),
    ('bookings.checkin'), ('payments.read'), ('payments.refund'), ('transport.read'),
    ('reviews.read'), ('reviews.moderate'), ('reports.read')
)
insert into public.role_permissions (role_id, permission_id)
select r.id, p.id
from grants g
join public.roles r on r.key = 'property_manager'
join public.permissions p on p.key = g.permission_key
on conflict do nothing;
