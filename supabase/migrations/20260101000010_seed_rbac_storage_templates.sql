-- =============================================================================
-- AQOSS HOTEL — 10. System seed: permissions, roles, storage, templates
-- (PRD §31, §44, §20)
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Permission catalogue
-- ---------------------------------------------------------------------------
insert into public.permissions (key, module, action, description) values
  ('*',                    'system',        'all',      'Unrestricted access'),
  ('dashboard.read',       'dashboard',     'read',     'View the CRM dashboard'),
  ('hotels.read',          'hotels',        'read',     'View hotels'),
  ('hotels.write',         'hotels',        'write',    'Create and edit hotels'),
  ('websites.read',        'websites',      'read',     'View websites'),
  ('websites.write',       'websites',      'write',    'Create, edit and publish websites'),
  ('rooms.read',           'rooms',         'read',     'View room types and rooms'),
  ('rooms.write',          'rooms',         'write',    'Create and edit rooms'),
  ('inventory.read',       'inventory',     'read',     'View availability'),
  ('inventory.write',      'inventory',     'write',    'Edit availability and allocation'),
  ('pricing.read',         'pricing',       'read',     'View rates'),
  ('pricing.write',        'pricing',       'write',    'Edit rates'),
  ('bookings.read',        'bookings',      'read',     'View bookings'),
  ('bookings.write',       'bookings',      'write',    'Create and modify bookings'),
  ('bookings.cancel',      'bookings',      'cancel',   'Cancel bookings'),
  ('bookings.checkin',     'bookings',      'checkin',  'Check guests in and out'),
  ('customers.read',       'customers',     'read',     'View customer profiles'),
  ('customers.write',      'customers',     'write',    'Edit customer profiles'),
  ('payments.read',        'payments',      'read',     'View payments and invoices'),
  ('payments.write',       'payments',      'write',    'Record payments'),
  ('payments.refund',      'payments',      'refund',   'Issue refunds'),
  ('transport.read',       'transport',     'read',     'View transport services'),
  ('transport.write',      'transport',     'write',    'Manage transport services'),
  ('offers.read',          'offers',        'read',     'View offers and coupons'),
  ('offers.write',         'offers',        'write',    'Manage offers and coupons'),
  ('reviews.read',         'reviews',       'read',     'View reviews'),
  ('reviews.moderate',     'reviews',       'moderate', 'Approve, hide and respond to reviews'),
  ('reports.read',         'reports',       'read',     'View and export reports'),
  ('notifications.read',   'notifications', 'read',     'View notification history'),
  ('notifications.write',  'notifications', 'write',    'Manage notification templates'),
  ('admins.read',          'admins',        'read',     'View admin users and roles'),
  ('admins.write',         'admins',        'write',    'Manage admin users, roles and permissions'),
  ('audit.read',           'audit',         'read',     'View audit logs'),
  ('settings.write',       'settings',      'write',    'Change platform settings')
on conflict (key) do nothing;

-- ---------------------------------------------------------------------------
-- Roles (PRD §31)
-- ---------------------------------------------------------------------------
insert into public.roles (key, name, description, is_system) values
  ('super_admin',     'Super Admin',     'Full access to every module', true),
  ('booking_manager', 'Booking Manager', 'Bookings, customers, check-in and check-out', true),
  ('hotel_manager',   'Hotel Manager',   'Hotels, rooms, pricing, availability and offers', true),
  ('crm_staff',       'CRM Staff',       'Customers, bookings and reviews', true),
  ('finance_staff',   'Finance Staff',   'Payments, refunds, revenue and reports', true)
on conflict (key) do nothing;

-- Grant permissions to roles.
with grants(role_key, permission_key) as (
  values
    ('super_admin', '*'),

    ('booking_manager', 'dashboard.read'),
    ('booking_manager', 'bookings.read'),
    ('booking_manager', 'bookings.write'),
    ('booking_manager', 'bookings.cancel'),
    ('booking_manager', 'bookings.checkin'),
    ('booking_manager', 'customers.read'),
    ('booking_manager', 'customers.write'),
    ('booking_manager', 'rooms.read'),
    ('booking_manager', 'inventory.read'),
    ('booking_manager', 'payments.read'),
    ('booking_manager', 'transport.read'),
    ('booking_manager', 'hotels.read'),

    ('hotel_manager', 'dashboard.read'),
    ('hotel_manager', 'hotels.read'),
    ('hotel_manager', 'hotels.write'),
    ('hotel_manager', 'websites.read'),
    ('hotel_manager', 'websites.write'),
    ('hotel_manager', 'rooms.read'),
    ('hotel_manager', 'rooms.write'),
    ('hotel_manager', 'inventory.read'),
    ('hotel_manager', 'inventory.write'),
    ('hotel_manager', 'pricing.read'),
    ('hotel_manager', 'pricing.write'),
    ('hotel_manager', 'offers.read'),
    ('hotel_manager', 'offers.write'),
    ('hotel_manager', 'transport.read'),
    ('hotel_manager', 'transport.write'),
    ('hotel_manager', 'bookings.read'),
    ('hotel_manager', 'reviews.read'),
    ('hotel_manager', 'reports.read'),

    ('crm_staff', 'dashboard.read'),
    ('crm_staff', 'customers.read'),
    ('crm_staff', 'customers.write'),
    ('crm_staff', 'bookings.read'),
    ('crm_staff', 'bookings.write'),
    ('crm_staff', 'reviews.read'),
    ('crm_staff', 'reviews.moderate'),
    ('crm_staff', 'hotels.read'),
    ('crm_staff', 'notifications.read'),

    ('finance_staff', 'dashboard.read'),
    ('finance_staff', 'payments.read'),
    ('finance_staff', 'payments.write'),
    ('finance_staff', 'payments.refund'),
    ('finance_staff', 'bookings.read'),
    ('finance_staff', 'customers.read'),
    ('finance_staff', 'reports.read'),
    ('finance_staff', 'hotels.read')
)
insert into public.role_permissions (role_id, permission_id)
select r.id, p.id
from grants g
join public.roles r on r.key = g.role_key
join public.permissions p on p.key = g.permission_key
on conflict do nothing;

-- ---------------------------------------------------------------------------
-- Website templates (PRD §5)
-- ---------------------------------------------------------------------------
insert into public.website_templates (key, name, description) values
  ('classic', 'Classic', 'The standard AQOSS hotel layout: overview, rooms, location, rules, reviews')
on conflict (key) do nothing;

-- ---------------------------------------------------------------------------
-- Default notification templates (PRD §20, §29)
-- ---------------------------------------------------------------------------
insert into public.notification_templates (hotel_id, event_key, channel, subject, body) values
  (null, 'customer.registered', 'EMAIL', 'Welcome to {{hotel_name}}',
   'Hi {{customer_name}},\n\nWelcome to {{hotel_name}}. Your account is ready — you can view and manage your bookings any time from your dashboard.\n\nSee you soon,\n{{hotel_name}}'),
  (null, 'auth.otp', 'SMS', null,
   '{{otp_code}} is your {{hotel_name}} verification code. It expires in {{otp_minutes}} minutes.'),
  (null, 'booking.confirmed', 'EMAIL', 'Booking confirmed — {{booking_reference}}',
   'Hi {{customer_name}},\n\nYour stay at {{hotel_name}} is confirmed.\n\nBooking ID: {{booking_reference}}\nRoom: {{room_summary}}\nCheck-in: {{check_in}} from {{check_in_time}}\nCheck-out: {{check_out}} by {{check_out_time}}\nGuests: {{guests}}\n\nRoom total: {{room_subtotal}}\nTaxes: {{tax_total}}\nDiscount: {{discount_total}}\nTotal paid: {{total_amount}}\n\nAddress: {{hotel_address}}\nCancellation policy: {{cancellation_policy}}\n\nQuestions? Call us on {{hotel_phone}}.'),
  (null, 'booking.confirmed', 'SMS', null,
   'Booking {{booking_reference}} confirmed at {{hotel_name}}. Check-in {{check_in}}. Total {{total_amount}}.'),
  (null, 'booking.confirmed', 'WHATSAPP', null,
   'Your booking at {{hotel_name}} is confirmed. Ref {{booking_reference}}, {{check_in}} to {{check_out}}.'),
  (null, 'payment.received', 'EMAIL', 'Payment receipt — {{booking_reference}}',
   'Hi {{customer_name}},\n\nWe received {{amount_paid}} for booking {{booking_reference}}.\n\nTransaction ID: {{transaction_id}}\nPayment status: {{payment_status}}\n\nThank you,\n{{hotel_name}}'),
  (null, 'booking.reminder', 'EMAIL', 'Your stay at {{hotel_name}} starts tomorrow',
   'Hi {{customer_name}},\n\nJust a reminder that your stay at {{hotel_name}} begins on {{check_in}}, check-in from {{check_in_time}}.\n\nBooking ID: {{booking_reference}}\nAddress: {{hotel_address}}\n\nSafe travels!'),
  (null, 'booking.cancelled', 'EMAIL', 'Booking cancelled — {{booking_reference}}',
   'Hi {{customer_name}},\n\nBooking {{booking_reference}} at {{hotel_name}} has been cancelled.\n\nIf a refund is due it will be processed to your original payment method.\n\n{{hotel_name}}'),
  (null, 'refund.processed', 'EMAIL', 'Refund processed — {{booking_reference}}',
   'Hi {{customer_name}},\n\nA refund of {{refund_amount}} for booking {{booking_reference}} has been processed. It usually reaches your account within 5-7 working days.\n\n{{hotel_name}}'),
  (null, 'booking.completed', 'EMAIL', 'Thank you for staying with us',
   'Hi {{customer_name}},\n\nThank you for staying at {{hotel_name}}. We would love to hear how it went — leave a review here: {{review_url}}\n\nWe hope to see you again.')
on conflict do nothing;

-- ---------------------------------------------------------------------------
-- Storage buckets (PRD §44)
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types) values
  ('hotel-images',   'hotel-images',   true,  10485760, array['image/jpeg','image/png','image/webp','image/avif']),
  ('room-images',    'room-images',    true,  10485760, array['image/jpeg','image/png','image/webp','image/avif']),
  ('profile-images', 'profile-images', true,   5242880, array['image/jpeg','image/png','image/webp']),
  ('review-images',  'review-images',  true,   5242880, array['image/jpeg','image/png','image/webp']),
  ('website-assets', 'website-assets', true,   5242880, array['image/jpeg','image/png','image/webp','image/svg+xml','image/x-icon']),
  ('documents',      'documents',      false, 10485760, array['image/jpeg','image/png','application/pdf'])
on conflict (id) do nothing;

-- Public buckets: anyone reads, staff writes.
do $$
declare b text;
begin
  foreach b in array array['hotel-images', 'room-images', 'website-assets']
  loop
    execute format($f$
      create policy %1$I on storage.objects
        for select using (bucket_id = %2$L);
      create policy %3$I on storage.objects
        for all to authenticated
        using (bucket_id = %2$L and public.is_admin())
        with check (bucket_id = %2$L and public.is_admin());
    $f$, b || '_public_read', b, b || '_admin_write');
  end loop;
end $$;

-- Profile photos: public read, owner writes into their own folder.
create policy profile_images_public_read on storage.objects
  for select using (bucket_id = 'profile-images');
create policy profile_images_owner_write on storage.objects
  for all to authenticated
  using (bucket_id = 'profile-images' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'profile-images' and (storage.foldername(name))[1] = auth.uid()::text);

-- Review photos: public read, any signed-in customer uploads.
create policy review_images_public_read on storage.objects
  for select using (bucket_id = 'review-images');
create policy review_images_auth_write on storage.objects
  for insert to authenticated with check (bucket_id = 'review-images');

-- Customer ID documents: strictly private to the owner and staff.
create policy documents_owner_read on storage.objects
  for select to authenticated
  using (
    bucket_id = 'documents'
    and ((storage.foldername(name))[1] = auth.uid()::text
         or public.has_permission('customers.read'))
  );
create policy documents_owner_write on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'documents' and (storage.foldername(name))[1] = auth.uid()::text
  );

-- ---------------------------------------------------------------------------
-- Platform defaults
-- ---------------------------------------------------------------------------
insert into public.platform_settings (key, value, category) values
  ('platform.name',           '"AQOSS Hotels"',  'general'),
  ('platform.support_email',  '"support@aqoss.com"', 'general'),
  ('booking.hold_minutes',    '15',              'booking'),
  ('booking.reminder_hours_before', '24',        'booking'),
  ('payments.provider',       '"mock"',          'payments'),
  ('reviews.auto_approve',    'false',           'reviews')
on conflict (key) do nothing;
