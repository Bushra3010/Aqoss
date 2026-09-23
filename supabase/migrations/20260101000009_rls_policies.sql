-- =============================================================================
-- AQOSS HOTEL — 09. Row Level Security (PRD §42, §43)
--
-- Shape of the rules:
--   anon/public  -> read-only, and only content belonging to an ACTIVE hotel
--                   that is published on an ACTIVE website
--   customer     -> own profile, own bookings, own payments, own reviews
--   admin        -> whatever their role's permissions allow, limited to the
--                   hotels in their scope
--   service_role -> bypasses RLS entirely (used by trusted server routes)
-- =============================================================================

alter table public.profiles               enable row level security;
alter table public.roles                  enable row level security;
alter table public.permissions            enable row level security;
alter table public.role_permissions       enable row level security;
alter table public.admin_users            enable row level security;
alter table public.hotels                 enable row level security;
alter table public.hotel_amenities        enable row level security;
alter table public.hotel_images           enable row level security;
alter table public.hotel_policies         enable row level security;
alter table public.hotel_nearby_places    enable row level security;
alter table public.website_templates      enable row level security;
alter table public.websites               enable row level security;
alter table public.website_domains        enable row level security;
alter table public.website_settings       enable row level security;
alter table public.room_types             enable row level security;
alter table public.room_images            enable row level security;
alter table public.room_amenities         enable row level security;
alter table public.rooms                  enable row level security;
alter table public.room_inventory         enable row level security;
alter table public.room_prices            enable row level security;
alter table public.booking_holds          enable row level security;
alter table public.bookings               enable row level security;
alter table public.booking_rooms          enable row level security;
alter table public.booking_guests         enable row level security;
alter table public.booking_status_history enable row level security;
alter table public.payments               enable row level security;
alter table public.refunds                enable row level security;
alter table public.invoices               enable row level security;
alter table public.transport_services     enable row level security;
alter table public.transport_routes       enable row level security;
alter table public.transport_slots        enable row level security;
alter table public.transport_bookings     enable row level security;
alter table public.offers                 enable row level security;
alter table public.coupons                enable row level security;
alter table public.coupon_redemptions     enable row level security;
alter table public.reviews                enable row level security;
alter table public.review_images          enable row level security;
alter table public.notification_templates enable row level security;
alter table public.notifications          enable row level security;
alter table public.notification_logs      enable row level security;
alter table public.otp_codes              enable row level security;
alter table public.audit_logs             enable row level security;
alter table public.platform_settings      enable row level security;

-- ---------------------------------------------------------------------------
-- Helper: is this hotel publicly visible?
-- ---------------------------------------------------------------------------
create or replace function public.hotel_is_public(p_hotel_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.hotels h
    where h.id = p_hotel_id and h.status = 'ACTIVE'
  );
$$;

-- ---------------------------------------------------------------------------
-- profiles
-- ---------------------------------------------------------------------------
create policy profiles_select_own on public.profiles
  for select using (id = auth.uid() or public.has_permission('customers.read'));

create policy profiles_update_own on public.profiles
  for update using (id = auth.uid()) with check (id = auth.uid());

create policy profiles_admin_write on public.profiles
  for all using (public.has_permission('customers.write'))
  with check (public.has_permission('customers.write'));

-- ---------------------------------------------------------------------------
-- RBAC tables: readable by any signed-in admin, writable with admins.write
-- ---------------------------------------------------------------------------
create policy roles_read on public.roles
  for select using (public.is_admin());
create policy roles_write on public.roles
  for all using (public.has_permission('admins.write'))
  with check (public.has_permission('admins.write'));

create policy permissions_read on public.permissions
  for select using (public.is_admin());
create policy permissions_write on public.permissions
  for all using (public.has_permission('admins.write'))
  with check (public.has_permission('admins.write'));

create policy role_permissions_read on public.role_permissions
  for select using (public.is_admin());
create policy role_permissions_write on public.role_permissions
  for all using (public.has_permission('admins.write'))
  with check (public.has_permission('admins.write'));

create policy admin_users_read on public.admin_users
  for select using (profile_id = auth.uid() or public.has_permission('admins.read'));
create policy admin_users_write on public.admin_users
  for all using (public.has_permission('admins.write'))
  with check (public.has_permission('admins.write'));

-- ---------------------------------------------------------------------------
-- Hotels and their public content
-- ---------------------------------------------------------------------------
create policy hotels_public_read on public.hotels
  for select using (status = 'ACTIVE' or public.has_permission('hotels.read'));

create policy hotels_admin_write on public.hotels
  for all using (public.has_permission('hotels.write') and public.can_access_hotel(id))
  with check (public.has_permission('hotels.write') and public.can_access_hotel(id));

do $$
declare t text;
begin
  foreach t in array array[
    'hotel_amenities', 'hotel_images', 'hotel_policies', 'hotel_nearby_places'
  ]
  loop
    execute format($f$
      create policy %1$s_public_read on public.%1$s
        for select using (
          public.hotel_is_public(hotel_id) or public.has_permission('hotels.read')
        );
      create policy %1$s_admin_write on public.%1$s
        for all using (
          public.has_permission('hotels.write') and public.can_access_hotel(hotel_id)
        )
        with check (
          public.has_permission('hotels.write') and public.can_access_hotel(hotel_id)
        );
    $f$, t);
  end loop;
end $$;

-- ---------------------------------------------------------------------------
-- Websites
-- ---------------------------------------------------------------------------
create policy website_templates_read on public.website_templates
  for select using (true);
create policy website_templates_write on public.website_templates
  for all using (public.has_permission('websites.write'))
  with check (public.has_permission('websites.write'));

create policy websites_public_read on public.websites
  for select using (status = 'ACTIVE' or public.has_permission('websites.read'));
create policy websites_admin_write on public.websites
  for all using (public.has_permission('websites.write') and public.can_access_hotel(hotel_id))
  with check (public.has_permission('websites.write') and public.can_access_hotel(hotel_id));

create policy website_domains_public_read on public.website_domains
  for select using (
    exists (select 1 from public.websites w where w.id = website_id and w.status = 'ACTIVE')
    or public.has_permission('websites.read')
  );
create policy website_domains_write on public.website_domains
  for all using (public.has_permission('websites.write'))
  with check (public.has_permission('websites.write'));

create policy website_settings_public_read on public.website_settings
  for select using (
    exists (select 1 from public.websites w where w.id = website_id and w.status = 'ACTIVE')
    or public.has_permission('websites.read')
  );
create policy website_settings_write on public.website_settings
  for all using (public.has_permission('websites.write'))
  with check (public.has_permission('websites.write'));

-- ---------------------------------------------------------------------------
-- Rooms, inventory, pricing — public may read, only staff may write
-- ---------------------------------------------------------------------------
create policy room_types_public_read on public.room_types
  for select using (
    (is_active and public.hotel_is_public(hotel_id)) or public.has_permission('rooms.read')
  );
create policy room_types_admin_write on public.room_types
  for all using (public.has_permission('rooms.write') and public.can_access_hotel(hotel_id))
  with check (public.has_permission('rooms.write') and public.can_access_hotel(hotel_id));

create policy room_images_public_read on public.room_images
  for select using (
    exists (
      select 1 from public.room_types rt
      where rt.id = room_type_id and rt.is_active and public.hotel_is_public(rt.hotel_id)
    ) or public.has_permission('rooms.read')
  );
create policy room_images_write on public.room_images
  for all using (public.has_permission('rooms.write'))
  with check (public.has_permission('rooms.write'));

create policy room_amenities_public_read on public.room_amenities
  for select using (
    exists (
      select 1 from public.room_types rt
      where rt.id = room_type_id and rt.is_active and public.hotel_is_public(rt.hotel_id)
    ) or public.has_permission('rooms.read')
  );
create policy room_amenities_write on public.room_amenities
  for all using (public.has_permission('rooms.write'))
  with check (public.has_permission('rooms.write'));

-- Physical room numbers are operational data: staff only.
create policy rooms_admin_read on public.rooms
  for select using (public.has_permission('rooms.read') and public.can_access_hotel(hotel_id));
create policy rooms_admin_write on public.rooms
  for all using (public.has_permission('rooms.write') and public.can_access_hotel(hotel_id))
  with check (public.has_permission('rooms.write') and public.can_access_hotel(hotel_id));

-- Inventory/pricing are read through SECURITY DEFINER functions by the public
-- site, so direct reads stay restricted to staff.
create policy room_inventory_admin_read on public.room_inventory
  for select using (public.has_permission('inventory.read') and public.can_access_hotel(hotel_id));
create policy room_inventory_admin_write on public.room_inventory
  for all using (public.has_permission('inventory.write') and public.can_access_hotel(hotel_id))
  with check (public.has_permission('inventory.write') and public.can_access_hotel(hotel_id));

create policy room_prices_public_read on public.room_prices
  for select using (public.hotel_is_public(hotel_id) or public.has_permission('pricing.read'));
create policy room_prices_admin_write on public.room_prices
  for all using (public.has_permission('pricing.write') and public.can_access_hotel(hotel_id))
  with check (public.has_permission('pricing.write') and public.can_access_hotel(hotel_id));

create policy booking_holds_admin_read on public.booking_holds
  for select using (
    profile_id = auth.uid() or public.has_permission('bookings.read')
  );

-- ---------------------------------------------------------------------------
-- Bookings — customers see their own; staff see what their role allows
-- ---------------------------------------------------------------------------
create policy bookings_select on public.bookings
  for select using (
    customer_id = auth.uid()
    or (public.has_permission('bookings.read') and public.can_access_hotel(hotel_id))
  );
create policy bookings_admin_write on public.bookings
  for all using (public.has_permission('bookings.write') and public.can_access_hotel(hotel_id))
  with check (public.has_permission('bookings.write') and public.can_access_hotel(hotel_id));

create policy booking_rooms_select on public.booking_rooms
  for select using (
    exists (
      select 1 from public.bookings b
      where b.id = booking_id
        and (b.customer_id = auth.uid() or public.has_permission('bookings.read'))
    )
  );
create policy booking_rooms_write on public.booking_rooms
  for all using (public.has_permission('bookings.write'))
  with check (public.has_permission('bookings.write'));

create policy booking_guests_select on public.booking_guests
  for select using (
    exists (
      select 1 from public.bookings b
      where b.id = booking_id
        and (b.customer_id = auth.uid() or public.has_permission('bookings.read'))
    )
  );
create policy booking_guests_write on public.booking_guests
  for all using (public.has_permission('bookings.write'))
  with check (public.has_permission('bookings.write'));

create policy booking_status_history_select on public.booking_status_history
  for select using (
    exists (
      select 1 from public.bookings b
      where b.id = booking_id
        and (b.customer_id = auth.uid() or public.has_permission('bookings.read'))
    )
  );

-- ---------------------------------------------------------------------------
-- Money — never writable from the client; service_role handles all writes
-- ---------------------------------------------------------------------------
create policy payments_select on public.payments
  for select using (
    customer_id = auth.uid()
    or (public.has_permission('payments.read') and public.can_access_hotel(hotel_id))
  );
create policy payments_admin_write on public.payments
  for all using (public.has_permission('payments.write'))
  with check (public.has_permission('payments.write'));

create policy refunds_select on public.refunds
  for select using (
    exists (
      select 1 from public.bookings b
      where b.id = booking_id
        and (b.customer_id = auth.uid() or public.has_permission('payments.read'))
    )
  );
create policy refunds_admin_write on public.refunds
  for all using (public.has_permission('payments.refund'))
  with check (public.has_permission('payments.refund'));

create policy invoices_select on public.invoices
  for select using (
    exists (
      select 1 from public.bookings b
      where b.id = booking_id
        and (b.customer_id = auth.uid() or public.has_permission('payments.read'))
    )
  );
create policy invoices_admin_write on public.invoices
  for all using (public.has_permission('payments.write'))
  with check (public.has_permission('payments.write'));

-- ---------------------------------------------------------------------------
-- Transport
-- ---------------------------------------------------------------------------
create policy transport_services_read on public.transport_services
  for select using (
    (status = 'ACTIVE' and public.hotel_is_public(hotel_id))
    or public.has_permission('transport.read')
  );
create policy transport_services_write on public.transport_services
  for all using (public.has_permission('transport.write') and public.can_access_hotel(hotel_id))
  with check (public.has_permission('transport.write') and public.can_access_hotel(hotel_id));

create policy transport_routes_read on public.transport_routes
  for select using (
    (is_active and public.hotel_is_public(hotel_id)) or public.has_permission('transport.read')
  );
create policy transport_routes_write on public.transport_routes
  for all using (public.has_permission('transport.write') and public.can_access_hotel(hotel_id))
  with check (public.has_permission('transport.write') and public.can_access_hotel(hotel_id));

create policy transport_slots_read on public.transport_slots
  for select using (
    (status = 'ACTIVE' and public.hotel_is_public(hotel_id))
    or public.has_permission('transport.read')
  );
create policy transport_slots_write on public.transport_slots
  for all using (public.has_permission('transport.write') and public.can_access_hotel(hotel_id))
  with check (public.has_permission('transport.write') and public.can_access_hotel(hotel_id));

create policy transport_bookings_select on public.transport_bookings
  for select using (
    customer_id = auth.uid() or public.has_permission('transport.read')
  );
create policy transport_bookings_write on public.transport_bookings
  for all using (public.has_permission('transport.write'))
  with check (public.has_permission('transport.write'));

-- ---------------------------------------------------------------------------
-- Offers, coupons, reviews
-- ---------------------------------------------------------------------------
create policy offers_public_read on public.offers
  for select using (
    (is_active and (hotel_id is null or public.hotel_is_public(hotel_id)))
    or public.has_permission('offers.read')
  );
create policy offers_admin_write on public.offers
  for all using (public.has_permission('offers.write'))
  with check (public.has_permission('offers.write'));

-- Coupon rows carry usage limits and internal caps: only staff read them
-- directly. Customers validate a code through public.validate_coupon().
create policy coupons_admin_read on public.coupons
  for select using (public.has_permission('offers.read'));
create policy coupons_admin_write on public.coupons
  for all using (public.has_permission('offers.write'))
  with check (public.has_permission('offers.write'));

create policy coupon_redemptions_select on public.coupon_redemptions
  for select using (
    customer_id = auth.uid() or public.has_permission('offers.read')
  );

create policy reviews_public_read on public.reviews
  for select using (
    (status = 'APPROVED' and public.hotel_is_public(hotel_id))
    or customer_id = auth.uid()
    or public.has_permission('reviews.read')
  );
create policy reviews_customer_insert on public.reviews
  for insert with check (customer_id = auth.uid());
create policy reviews_customer_update on public.reviews
  for update using (customer_id = auth.uid() and status = 'PENDING')
  with check (customer_id = auth.uid());
create policy reviews_admin_write on public.reviews
  for all using (public.has_permission('reviews.moderate'))
  with check (public.has_permission('reviews.moderate'));

create policy review_images_read on public.review_images
  for select using (
    exists (
      select 1 from public.reviews r
      where r.id = review_id
        and (r.status = 'APPROVED' or r.customer_id = auth.uid()
             or public.has_permission('reviews.read'))
    )
  );
create policy review_images_insert on public.review_images
  for insert with check (
    exists (select 1 from public.reviews r where r.id = review_id and r.customer_id = auth.uid())
  );
create policy review_images_admin on public.review_images
  for all using (public.has_permission('reviews.moderate'))
  with check (public.has_permission('reviews.moderate'));

-- ---------------------------------------------------------------------------
-- Notifications, OTP, audit, settings — staff only (service_role writes)
-- ---------------------------------------------------------------------------
create policy notification_templates_read on public.notification_templates
  for select using (public.has_permission('notifications.read'));
create policy notification_templates_write on public.notification_templates
  for all using (public.has_permission('notifications.write'))
  with check (public.has_permission('notifications.write'));

create policy notifications_select on public.notifications
  for select using (
    customer_id = auth.uid() or public.has_permission('notifications.read')
  );
create policy notifications_admin_write on public.notifications
  for all using (public.has_permission('notifications.write'))
  with check (public.has_permission('notifications.write'));

create policy notification_logs_read on public.notification_logs
  for select using (public.has_permission('notifications.read'));

-- OTP rows are never readable by clients; only service_role touches them.
create policy otp_codes_no_client_access on public.otp_codes
  for select using (false);

create policy audit_logs_read on public.audit_logs
  for select using (public.has_permission('audit.read'));

create policy platform_settings_read on public.platform_settings
  for select using (not is_secret and public.is_admin());
create policy platform_settings_write on public.platform_settings
  for all using (public.has_permission('settings.write'))
  with check (public.has_permission('settings.write'));

-- ---------------------------------------------------------------------------
-- Expose the booking-engine functions to the public site (they are
-- SECURITY DEFINER and validate their own inputs).
-- ---------------------------------------------------------------------------
grant execute on function public.resolve_website(text)            to anon, authenticated;
grant execute on function public.search_availability(uuid, date, date, int, int, int)
                                                                  to anon, authenticated;
grant execute on function public.nightly_rate(uuid, date)         to anon, authenticated;
grant execute on function public.validate_coupon(text, uuid, numeric, uuid, uuid[])
                                                                  to anon, authenticated;
grant execute on function public.create_booking_hold(uuid, date, date, int, text, int)
                                                                  to anon, authenticated;
grant execute on function public.release_booking_hold(uuid)       to anon, authenticated;

-- Booking creation/cancellation stay server-side (service_role only).
revoke execute on function public.create_booking_transaction(
  uuid, uuid, uuid, date, date, jsonb, jsonb, jsonb, jsonb, jsonb, uuid[], text, text
) from anon, authenticated;
revoke execute on function public.cancel_booking(uuid, text) from anon;
revoke execute on function public.confirm_booking_payment(uuid, uuid, numeric)
  from anon, authenticated;
