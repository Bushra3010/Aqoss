-- Property managers run offers and coupons for their own hotel. The CRM limits
-- them to offers with their hotel_id and coupons whose hotel_ids are all theirs;
-- platform-wide ones stay read-only to them.
with grants(permission_key) as (values ('offers.read'), ('offers.write'))
insert into public.role_permissions (role_id, permission_id)
select r.id, p.id
from grants g
join public.roles r on r.key = 'property_manager'
join public.permissions p on p.key = g.permission_key
on conflict do nothing;
