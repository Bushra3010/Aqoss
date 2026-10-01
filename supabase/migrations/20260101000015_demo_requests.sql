-- "Book a demo" requests from the AQOSS website on the main domain.
--
-- Written only by the server (service role) after validation and spam checks;
-- nothing public can read them. Staff with demo_requests.read see them in the
-- CRM (super admins through `*`).

create type demo_request_status as enum ('NEW', 'CONTACTED', 'CLOSED');

create table public.demo_requests (
  id           uuid primary key default gen_random_uuid(),
  name         text not null,
  hotel_name   text not null,
  email        citext not null,
  phone        text not null,
  city         text,
  rooms        int check (rooms is null or rooms between 1 and 10000),
  interests    text[] not null default '{}'::text[],
  message      text,
  status       demo_request_status not null default 'NEW',
  notes        text,
  updated_by   uuid references public.profiles(id) on delete set null,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index demo_requests_status_created_idx on public.demo_requests (status, created_at desc);

create trigger demo_requests_set_updated_at
  before update on public.demo_requests
  for each row execute function public.set_updated_at();

alter table public.demo_requests enable row level security;

create policy demo_requests_staff_read on public.demo_requests
  for select using (public.has_permission('demo_requests.read'));

create policy demo_requests_staff_write on public.demo_requests
  for update using (public.has_permission('demo_requests.write'))
  with check (public.has_permission('demo_requests.write'));

insert into public.permissions (key, module, action, description) values
  ('demo_requests.read',  'demo_requests', 'read',  'View "Book a demo" requests from the AQOSS website'),
  ('demo_requests.write', 'demo_requests', 'write', 'Update demo request status and notes')
on conflict (key) do nothing;
