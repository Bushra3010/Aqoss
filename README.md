# AQOSS Hotel

Multi-tenant hotel booking, CRM and multi-website platform.

One Next.js application, one Supabase database, one reusable website template, and as many
hotel websites as you create records for. Adding hotel 51 — or hotel 500 — is a CRM operation,
not a development project.

```
                         AQOSS CRM
                             │
          ┌──────────────────┼──────────────────┐
       Hotel A             Hotel B            Hotel C
          ▼                  ▼                  ▼
     Website A           Website B          Website C
          └──────────────────┼──────────────────┘
                    SAME WEBSITE TEMPLATE
                             ▼
                      Booking Engine
                             ▼
                        Supabase
```

---

## Stack

| Layer | Choice |
|---|---|
| Frontend | Next.js 14 (App Router), TypeScript, Tailwind CSS |
| Backend | Next.js Route Handlers + server actions (Node runtime) |
| Database | Supabase PostgreSQL, with the booking engine in PL/pgSQL |
| Auth | Supabase Auth |
| Storage | Supabase Storage |
| Charts | Recharts |
| Hosting | Vercel or Netlify |

---

## Getting started

### 1. Install

```bash
npm install
```

### 2. Create a Supabase project and apply the schema

```bash
cp .env.example .env.local   # then fill in the three Supabase values
```

Apply the ten migrations in `supabase/migrations/` in filename order. Either:

```bash
# with the Supabase CLI, once the project is linked
supabase db push
```

…or paste each file into the Supabase SQL editor, oldest first.

> The migrations have been checked against the PostgreSQL grammar but have **not** been run
> against a live database in this repository — there was no Postgres, Docker or Supabase CLI
> available here. Apply them to a scratch project first and read the output before using them
> anywhere that matters.

### 3. Generate database types

Until you do this, `src/types/supabase.ts` is a permissive placeholder and query results are
untyped:

```bash
npm run db:types
```

### 4. Seed the demo data

```bash
npm run seed              # 52 hotels, each with a website, rooms and 180 nights of inventory
npm run seed -- --count=6 # a faster subset while developing
npm run seed -- --reset   # wipe existing hotels first
```

### 5. Create your first admin

Sign up through `/register`, then in the Supabase SQL editor:

```sql
insert into public.admin_users (profile_id, role_id)
select p.id, r.id
from public.profiles p, public.roles r
where p.email = 'you@example.com' and r.key = 'super_admin';
```

### 6. Run it

```bash
npm run dev
```

If Supabase is not configured yet, the app runs in **demo mode** against an in-memory dataset —
52 hotels, their websites, rooms, inventory, bookings and a working booking engine, with no
database at all. Set `DEMO_MODE=false` in `.env.local` to turn it off once you have a project.

In demo mode both sign-in pages list one-click accounts, so there is nothing to type:

| Account | Where | What it can do |
|---|---|---|
| `admin@aqoss.demo` | `/admin/login` | Super Admin — every module |
| `manager@aqoss.demo` | `/admin/login` | Hotel Manager, scoped to 3 properties |
| `bookings@aqoss.demo` | `/admin/login` | Booking Manager — check-in/out, cancellations |
| `finance@aqoss.demo` | `/admin/login` | Finance Staff — payments, refunds, reports |
| `guest@aqoss.demo` | `/login` | A customer with booking history |

Every one uses the password `demo1234`. `/demo` lists all 52 hotel websites and the accounts.

Demo data lives in the server process, so bookings you make are real until you restart.

| URL | What it is |
|---|---|
| `http://<hotel-slug>.localhost:3000` | A hotel website (the seeder prints every slug) |
| `http://localhost:3000` | Set `DEFAULT_WEBSITE_SLUG` to serve one hotel here |
| `http://localhost:3000/admin` | The CRM |
| `http://localhost:3000/dashboard` | The customer dashboard |

`*.localhost` subdomains resolve automatically in Chrome, Safari and Firefox — no hosts-file
entry needed.

---

## How multi-tenancy works

```
Request → middleware sets x-aqoss-host
        → getTenant() resolves hostname → website → hotel
        → (website)/layout.tsx loads that hotel's content
        → the same template renders, in that website's colours
```

Resolution (`src/lib/tenant.ts`) tries, in order:

1. an exact `website_domains.hostname` match, with and without `www.`
2. the leading label as a website slug — `hotel-a.localhost`, `hotel-a.aqoss.app`
3. `DEFAULT_WEBSITE_SLUG`, a development convenience only

An unpublished website returns `null` and the site 404s, unless an authenticated admin is
previewing it (`?preview_site=<slug>`). Middleware only *forwards* that request; whether it is
honoured is decided in `getTenant()` after checking `admin_users`.

To add a hotel website: create the hotel, create the website, add the hostname, publish. Point
the domain's DNS at your deployment and add it to the host's domain list.

---

## How double booking is prevented

Four independent layers, so no single bug can oversell a room:

1. **A database CHECK constraint.** `room_inventory` enforces
   `booked_rooms + blocked_rooms <= total_rooms`. Any write that would oversell simply fails.
2. **Row locks.** `create_booking_transaction` takes `SELECT … FOR UPDATE` on every
   `(room_type, night)` row the booking touches, in a deterministic order, so concurrent
   bookings queue rather than race or deadlock.
3. **A final re-check inside the transaction.** Availability is recomputed under that lock,
   after payment, immediately before inventory is consumed. What the browser saw earlier is
   irrelevant.
4. **Short-lived holds.** `booking_holds` reserves rooms while a guest pays, and is subtracted
   from availability at query time. Holds expire on their own, so an abandoned checkout
   releases the room with no cleanup job required.

The whole booking — header, room lines, guests, transport seats, coupon redemption — is one
Postgres transaction. Any failure rolls all of it back.

---

## How pricing works

Every figure is computed server-side, in `src/services/pricing.service.ts`:

```
Room nightly rates + services + transport
  − coupon discount
  + tax
  = total
```

The checkout page and the booking API call the *same* function, so the price a guest is shown
is the price that gets charged. Nothing the browser sends about money is trusted.

---

## Payments

`PAYMENT_PROVIDER` selects an adapter (`src/lib/payments/`):

- `mock` — the default. Signs and verifies fake payments through the real verification path,
  so the flow is fully testable without credentials. A "simulate failure" button exercises the
  rejection branch.
- `razorpay` — verifies the HMAC signature, then re-reads the authoritative amount from
  Razorpay before confirming. A valid signature on a ₹1 payment will not confirm a ₹11,980
  booking.

Adding a gateway means writing one adapter that implements `PaymentAdapter`; nothing else
changes. Webhooks arrive at `/api/payments/webhook` and are verified against the raw request
body.

---

## Notifications

Booking events queue rows into `notifications` and return immediately, so a slow provider can
never fail a paid booking. Drain the queue from a scheduler:

```bash
curl -X POST https://your-app/api/notifications/dispatch \
  -H "Authorization: Bearer $CRON_SECRET"
```

Templates live in `notification_templates`, support `{{placeholders}}`, and a per-hotel row
overrides the platform default. Transports are pluggable; the default `console` transport
prints the rendered message.

---

## Roles and permissions

Permissions are database rows, not code. `roles → role_permissions → permissions` drives both
the CRM navigation and the server-side checks, so changing what a Booking Manager can do is a
data change.

Seeded roles: **Super Admin**, **Booking Manager**, **Hotel Manager**, **CRM Staff**,
**Finance Staff**. An admin can also be scoped to specific hotels via `admin_users.hotel_scope`.

---

## Security

- Row Level Security on every table; the public site reads only published content
- Customers reach only their own bookings, payments and reviews
- The service-role key is used solely by trusted server code (`src/lib/supabase/admin.ts`)
  and is never imported into a client component
- All booking, pricing and payment logic is server-side; the frontend is never the source of truth
- Gateway signatures and amounts are verified before a booking is confirmed
- Rate limits on availability, booking, coupon and review endpoints
- Reviews require a completed stay, enforced by a trigger *and* in the service layer
- Admin actions are written to `audit_logs`
- Customer errors are plain sentences; technical detail is logged, never shown

**Before production**, replace the in-memory rate limiter in `src/lib/rate-limit.ts` with Redis
or Upstash — on serverless each instance keeps its own counters. The call sites do not change.

---

## Project layout

```
src/
├── app/
│   ├── (website)/          the shared hotel website template
│   ├── (auth)/             sign in, register, password reset
│   ├── dashboard/          customer dashboard
│   ├── admin/              the CRM
│   ├── api/                REST endpoints
│   ├── robots.ts           per-website, per-host
│   └── sitemap.ts
├── components/             website, booking, rooms, reviews, admin, ui
├── services/               hotel, availability, pricing, booking, payment,
│                           notification, transport, review, report, customer,
│                           invoice, audit
├── lib/
│   ├── supabase/           browser, server, admin and middleware clients
│   ├── payments/           gateway adapters
│   ├── notifications/      transports and template rendering
│   ├── auth/               session and permission helpers
│   ├── validation/         zod schemas
│   ├── tenant.ts           hostname → website → hotel
│   ├── api.ts              REST envelope and error translation
│   └── rate-limit.ts
├── types/
└── middleware.ts

supabase/migrations/        01 → 10, apply in order
scripts/seed.ts             demo data
.claude/launch.json         dev server config
```

---

## API

| Endpoint | Purpose |
|---|---|
| `GET /api/availability` | Live availability for the request's hotel |
| `POST /api/pricing/quote` | Server-computed price breakdown |
| `POST /api/coupons/validate` | Validate a coupon code |
| `POST /api/holds` · `DELETE /api/holds/:id` | Take and release a room hold |
| `POST /api/bookings` · `GET /api/bookings` | Create a booking; list your own |
| `GET /api/bookings/:id` · `POST /api/bookings/:id/cancel` | Detail and cancellation |
| `POST /api/payments/start` · `/verify` · `/webhook` | Gateway order, verification, callbacks |
| `GET /api/transport` | Transport a guest can add |
| `POST /api/reviews` | Submit a review for a completed stay |
| `POST /api/notifications/dispatch` | Drain the notification queue (cron) |
| `GET /api/websites/resolve` | Which hotel is this hostname serving? |

Responses use one envelope:

```json
{ "ok": true,  "data": {} }
{ "ok": false, "error": "Room no longer available.", "code": "P0001" }
```

---

## Deploying

1. Push to Vercel or Netlify and set the environment variables from `.env.example`.
2. Add each hotel domain to the project, and to that website's domain list in the CRM.
3. Point the gateway's webhook at `/api/payments/webhook`.
4. Schedule `POST /api/notifications/dispatch` every few minutes with `CRON_SECRET` set.
5. Swap the rate limiter for a shared store.

---

## What is not built yet

Honest list, so nothing comes as a surprise:

- **Migrations are unverified against a live database.** See the note in step 2.
- **PDF invoices.** Invoices are stored as structured line items and rendered in the UI;
  `invoices.pdf_url` is there for when a renderer is added.
- **SMS, OTP and WhatsApp send to the console.** The queue, templates, events and adapter
  interface are complete; the Twilio/MSG91/Meta transports are one class each.
- **Image uploads.** Storage buckets and their access policies exist; the CRM forms take URLs
  rather than offering a file picker. The seeder uses placeholder photos.
- **CRM create/edit forms for rooms, transport, offers and admin users.** These modules have
  full schemas, services, RLS and read-only CRM screens; the write forms follow the same
  pattern as `HotelForm` / `WebsiteForm`.
- **Automated tests.** Worth adding first for the concurrency path: two simultaneous bookings
  for one remaining room.
