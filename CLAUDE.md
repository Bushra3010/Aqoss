# AQOSS Hotel — working notes

Conventions and decisions that are not obvious from the code.

## Architecture rules

- **One template, many hotels.** Never add per-hotel branches to a component. Anything that
  differs between hotels is a database record, read through the tenant resolved from the
  hostname. If a hotel needs something the template cannot express, extend the template for
  everyone or add a `websites.content` field.
- **The database is the source of truth for availability and price.** `search_availability`,
  `create_booking_transaction` and `quoteBooking` are the only places those answers come from.
  Never compute a price or an availability count in a component.
- **The browser is never trusted.** Route handlers re-resolve the tenant, re-price the booking
  and re-check availability, no matter what the request body says.

## Supabase clients — pick the right one

| Client | Runs as | Use for |
|---|---|---|
| `createClient()` (`supabase/client.ts`) | the signed-in user | client components |
| `createServerSupabase()` (`supabase/server.ts`) | the signed-in user | server components, auth |
| `createAdminSupabase()` (`supabase/admin.ts`) | **service role, bypasses RLS** | trusted server code only |

The admin client is used liberally in services because those services do their own
authorisation. Never pass its raw results to a client component without filtering first, and
never import it into anything marked `'use client'`.

## Permissions

`requirePermission('bookings.cancel')` in server actions and route handlers; `can(session, …)`
to decide what to render. Both read from the database — do not hard-code role names in
components. Hotel-scoped admins additionally need `canAccessHotel`.

## Errors

Throw `AppError(message, status)` for anything a customer should read. Everything else is
logged and replaced with a generic sentence by `toApiError`. PL/pgSQL raises `P0001`/`P0002`
for messages that are already customer-safe.

## Money

Always `numeric` in Postgres, `money()` from `lib/utils` when rounding in TypeScript. Never
accumulate prices in floating point without rounding at the end.

## Migrations

Additive only, numbered in order, never edited once applied. The oversell CHECK constraint on
`room_inventory` is load-bearing — do not relax it to make a write succeed.

## Regenerating types

`src/types/supabase.ts` is currently a placeholder (`Database = any`). Run `npm run db:types`
once the project is linked; the clients already pass the type as their generic, so nothing else
needs to change.

## Running without a database

`isDemoMode` (src/lib/env.ts) is true when `DEMO_MODE=true` or when Supabase is unconfigured.
The three client factories in `src/lib/supabase/` then hand back `createDemoClient()` instead —
an in-memory stand-in with the same `.from()` / `.rpc()` / `.auth` surface, so no service or page
changes. See `src/lib/demo/`: `dataset.ts` generates the data, `query.ts` is a PostgREST-shaped
query engine, `rpc.ts` mirrors the PL/pgSQL booking engine, `triggers.ts` covers the database
triggers.

Inserts get each column's default from `src/lib/demo/defaults.ts`, generated from the migrations —
run `npm run demo:defaults` after a migration adds or changes a default. Without it, rows written
by services lacked columns Postgres would fill (a notification without `state` crashed the
Notifications page).

Two things to respect there:

- **The store hangs off `globalThis`**, not a module-level `let`. Next compiles route handlers,
  server components and actions into separate bundles, so a plain variable gives each its own
  copy and ids stop matching between pages.
- **Middleware runs on the edge** and cannot import the demo client (`node:crypto`). Anything it
  needs lives in `src/lib/demo/constants.ts`.
- **Seeded ids are deterministic** (`seedId()` in `src/lib/demo/ids.ts`), never `randomUUID()`.
  Serverless hosts run several instances, each building its own dataset; with random ids a
  session cookie from one instance named a profile the next didn't have, so a signed-in super
  admin got "No access" on alternate requests. Rows written at runtime still live on one
  instance only — demo mode on a serverless host is for looking around, not for real use.

With neither demo mode nor Supabase, middleware rewrites every request to `/setup`. Keep that
page free of any import that reaches data — it must render without either.

`demoSignIn` in `src/app/(auth)/actions.ts` powers the one-click account buttons. It re-checks
`isDemoMode` and that the email is a seeded account, so it cannot become a back door once real
credentials are configured.

## Admin UI

The CRM frame is `src/components/admin/AdminShell.tsx`: a fixed 250px sidebar, a 72px top bar, and a
`#F8FAFC` page background. Navigation is declared in each layout (`MAIN_NAV` / `ADMIN_NAV` in the
platform layout, `HOTEL_NAV` in the hotel panel) and filtered by permission before it reaches the
client; `AdminSidebar` takes icon *names*, not components, because layouts are Server Components.

**Two shells, one frame.** `src/app/admin/(platform)/layout.tsx` is the whole-platform CRM;
`src/app/admin/h/[hotel]/layout.tsx` is one hotel's own panel at `/admin/h/<hotel-slug>/…`. Both
render `AdminShell` and differ only in the navigation they pass. Never make one layout branch on
the pathname to pick its sidebar or redirect — Next does not re-run a shared layout on client
navigation, so the first decision sticks (it caused a redirect loop once). Login sits outside both.

Every hotel-panel page calls `getHotelPanel(slug)` (`src/lib/admin/hotel-panel.ts`), which returns
null for an unknown hotel *and* for one outside the admin's scope, so both are a 404. Panel pages
render the same view components as the platform pages (`src/components/admin/views/`) with a
`hotelId` that pins them to the property and hides the hotel column; do not fork a view for the
panel. A record opened through a panel URL must belong to that hotel (`BookingDetailView` 404s
otherwise), even for a super admin. Someone scoped to exactly one hotel lands in its panel from
`/admin`.

Hotel-scoped admins: pages filter by `session.hotelScope`, and **write actions must check the
row's own hotel** (`assertRowInScope` in `admin/actions.ts`) — a permission alone is not enough.
The `property_manager` role deliberately omits customers, notifications, admins, settings and
audit, because those pages are not hotel-filtered yet. Offers are: a scoped admin sees their
hotels' offers and coupons plus platform-wide ones, and may only create or pause ones limited to
their own hotels (`offer-actions.ts`).

Offers are promotions shown on the website; only coupons change the price at checkout. A coupon
can be deleted only while unused (`deleteCoupon`): deleting a used one would cascade away its
`coupon_redemptions`, so used coupons are paused instead. Offers can always be deleted
(`deleteOffer`) — nothing in a booking points at them; linked coupons just lose `offer_id`.

**Staff & roles** (`staff.service.ts`, Users & Roles, My account) run with the service role, so
every rule lives in the service, not the form: nobody grants a role — or manages (edits, sets the
password of, removes) someone whose role — has permissions they lack, because setting a password
is as good as signing in as that person; scoped admins only manage staff inside their hotels; only
an unscoped super admin edits roles or touches another super admin; nobody changes their own
access; the last active all-hotels super admin can't be demoted or removed. Removing staff blocks
the account (`ban_duration`) instead of deleting it, so their bookings and audit entries keep their
author. Passwords are never logged. The demo stands in for `auth.admin` in `src/lib/demo/auth.ts`.

**Leads** are abandoned bookings: PENDING and unpaid for longer than `BOOKING_HOLD_MINUTES`. The
booking row is the lead; `booking_leads` only stores follow-up (status, notes). CONVERTED is
derived from the booking being paid and is never set by hand.

**Photos**: the cover is always the first photo (`writeOrder` in `image.service.ts`) — the
website gallery leads with the first image while cards and link previews read `is_cover`, so the
two must not drift. Uploads go one file per server-action call (limit `11mb` in
`next.config.mjs`). In demo mode files live in memory (`src/lib/demo/files.ts`) and are served
from `/api/demo-files/…`.

**Room types** are created by `createRoomType` (`room-type.service.ts`), which also adds the
physical rooms (next free floor, `<floor><nn>`) and a year of `room_inventory`. A room type with
no inventory rows shows on the website but can never be booked, so never insert one without it.
`updateRoomType` edits one in place (the slug never changes, so links survive); lowering the room
count removes only free rooms, and sold nights keep their allocation because
`ensure_room_inventory` never drops below booked + blocked. Both the platform (`/admin/rooms/<id>`)
and hotel panels edit through `RoomTypeEditView` + `saveRoomType`. There is no delete: hide a room
type with "Show on the website" instead, so past bookings keep their room.

**Staff bookings** (`booking-actions.ts`) go through the website's engine: `createStaffBooking` →
`createBooking` → `create_booking_transaction`, source `PHONE` or `CRM`. Changing dates, rooms or
party size is `modifyBooking` → `modify_booking` (migration 14), which releases the booking's own
nights *before* checking the new ones — so `quoteModification` prices with `pricesOnly` and never
judges availability itself. The form's live price calls the same functions the save does; keep it
that way so the preview can't disagree with the result. Money taken at the desk is
`recordManualPayment` (provider `manual`) → `confirm_booking_payment`, which only promotes PENDING
to CONFIRMED — a checked-in guest paying their balance stays checked in.

**Money on a booking**: `amount_paid` is everything ever captured (payments `PAID`,
`PARTIALLY_REFUNDED` or `REFUNDED`); refunds live separately in `amount_refunded`. What is owed is
`total − (amount_paid − amount_refunded)` — never compare `amount_paid` with the total on its own.
`refundPayment` spreads a refund across the booking's payments newest first; gateway payments are
refunded through the adapter, `manual` (desk) payments are recorded as handed back by the hotel.
Payments are their own section: each has a page (`PaymentDetailView`, `/admin/payments/<id>`) with
its refunds and a refund-from-this-payment form (`refundPayment({ paymentId })`), and "Record
payment" (`/admin/payments/new`) finds a booking that still owes via `findBookingsWithBalance`.
The Payments page totals come from `paymentTotals` (every matching payment, read in pages of
1000), not from the 200 rows it lists. Booking actions return `{ error }` instead of throwing —
Next hides thrown server-action messages in production.

**Dates**: `YYYY-MM-DD` strings are local calendar days. Never turn a `Date` back into one with
`toISOString()` — east of UTC that is the previous day, which once saved every admin price a
night early. Use `toISODate()` / `todayISO()` from `lib/utils`.

To run a second dev server beside another one, give it its own build folder:
`NEXT_DIST_DIR=.next-alt next dev -p 3001` (the `aqoss-dev-alt` launch config). Two servers on
one `.next` overwrite each other.

Dashboard pieces live in `src/components/admin/dashboard/`. Cards are `rounded-2xl border
border-slate-200 bg-white`, section titles `text-base font-bold`, and supporting copy
`text-sm text-slate-500`. Charts use one hue per series — blue for bookings, green for revenue.

Stat tiles show a running total with the selected window's movement beside it. `delta()` in
`report.service.ts` returns `changePercent: null` when the baseline is too small for the
percentage to mean anything (over ±300%), and `StatCard` renders that as an em dash rather than
inventing a number.

## Website addresses

**The main domain is the AQOSS website** (`src/app/platform/`): middleware rewrites `/` on the
main domain (`aqoss.com`, `www.`, or plain `localhost` in dev — `isPlatformHost` in
`src/lib/site-url.ts`) to `/platform`, which 404s on any hotel subdomain. Its Book demo form
(`src/app/platform/actions.ts`) is public — validated, honeypot-guarded and rate-limited — and
writes `demo_requests` (migration 15), shown in the CRM under Demo requests. There is no
fallback hotel any more: an unknown host resolves to no tenant (404), never to someone else's
hotel. `?preview_site=<slug>` on the main domain redirects to `/site/<slug>` and sets a
one-hour preview cookie that a signed-in admin's requests honour there. A preview never takes
over `/` or the other AQOSS pages — visiting them ends it — and an explicit `/site/<other>` link
wins over it. (It once did take over `/`, so the AQOSS home showed whichever hotel an admin had
last opened.)

The AQOSS home page's hero search is a plain GET form back to `/` (middleware keeps the query
string when it rewrites). It only *finds* hotels by name, city or address; each result opens on
the hotel's own subdomain with the dates, and availability is judged there. Offers & Deals lists
active, in-date offers from published websites, showing a coupon code only when an active,
usable coupon is linked to the offer. The hero badges are counts from the database — do not
put invented figures (hotel counts, satisfaction rates) or products AQOSS doesn't have (flights,
trains) on this page.

The AQOSS website's other pages — `/about` and one per solution (`/ai-website`, `/ai-marketing`,
`/ai-sales`, `/booking-engine`, `/reputation`) — are rewritten by middleware to `/platform/<path>`
on the main domain only, from `PLATFORM_PAGES` in `src/components/platform/nav.ts`; add a path
there when adding a page. They share `src/app/platform/layout.tsx` (header, footer, font, and the
main-domain check). Solution page copy lives in `solution-pages.ts` and must describe only
features that exist.

Every hotel website is served at `<website-slug>.<NEXT_PUBLIC_ROOT_DOMAIN>` — in production
`the-serenity-inn-goa.aqoss.com`, in dev `the-serenity-inn-goa.localhost:3000`. `resolveTenantByHost`
maps the subdomain back by slug, so a new website needs no DNS or `website_domains` row, only the
wildcard `*.aqoss.com` record. Build links with `websiteUrl()` / `websiteAdminUrl()` in
`src/lib/site-url.ts`, never `?preview_site=` by hand: unpublished sites preview on the main domain
because the admin's session cookie does not reach the subdomains. `website_domains` is for a
hotel's own custom domain.

The main domain is baked in at build time (middleware inlines it). `next.config.mjs` takes
`NEXT_PUBLIC_ROOT_DOMAIN` / `NEXT_PUBLIC_APP_URL` when set, otherwise Netlify's `URL` build
variable, so a Netlify deploy serves the AQOSS website without configuration. Without either,
the app assumes `localhost:3000` and every real host looks like an unknown hotel ("Hotel not
found").

Where the host can't have subdomains (`*.netlify.app`, `*.vercel.app` — no DNS and no certificate
for a second level), hotels are paths instead: `hotelsOnPaths` in `site-url.ts` makes `websiteUrl()`
return `<main domain>/site/<slug>`. Middleware rewrites `/site/<slug>/…` to the hotel's own route,
sets the `aqoss_site` cookie, and forwards `x-aqoss-site` (stripped from client requests), so the
hotel's ordinary links — `/rooms`, `/booking/…`, `/login`, `/api/…` — keep resolving to it from the
cookie; `/`, `/admin` and the AQOSS pages never do. `getTenant()` reads that header only on the
main domain, and public pages still require a published website. Links back to the hotel's home
page must use `siteHome(getSiteBase())`, never a bare `/` — on the main domain `/` is the AQOSS
website. `NEXT_PUBLIC_HOTEL_URLS=path|subdomain` overrides the detection; a custom domain with a
wildcard record should use subdomains.

## Hotel website template

`src/app/(website)/layout.tsx` is the shell every hotel site renders through: the blue header,
the booking search bar and the section tabs sit there, so each page only supplies its own
content. Pages wrap that content in `rounded-xl border border-slate-200 bg-white p-5`.

**The site is one page.** `(website)/page.tsx` stacks all six sections — overview, rooms,
location, property rules, user reviews, similar properties — each a component in
`src/components/website/sections/` with a matching `id` and `scroll-mt-28`. `SectionTabs`
scrolls to them and highlights whichever heading last passed under the bar. The standalone
routes (`/rooms`, `/location`, …) still exist for SEO and deep links and render the very same
section components, so there is one implementation per section, not two.

The booking rail is `.booking-rail` in `globals.css`, not a stack of utilities: from `lg` up it
is `position: sticky` under the tab bar with its own `overflow-y: auto`, so it stays beside
whatever section is being read instead of scrolling away and leaving a column of blank space.
It is written as a real class because Tailwind arbitrary values need underscores for the spaces
`calc()` requires — `max-h-[calc(100vh-6.5rem)]` silently emits invalid CSS and does nothing.
Below `lg` none of it applies and the cards simply stack under the content.

Two things the tab bar has to get right, both learned the hard way:

- The sticky wrapper must be a **direct child of the page column**. Nested beside the search
  bar, its containing block is two rows tall and it barely moves.
- Never call `scrollIntoView` to keep the active tab in view — it scrolls the *page* as well and
  fights the reader. Nudge the strip's own `scrollLeft`.

The scroll listener calls its handler directly rather than through `requestAnimationFrame`: six
`getBoundingClientRect` reads are cheap, and rAF is throttled to zero in a backgrounded tab,
which would freeze the highlight.

Colours come from CSS variables on `:root` in `globals.css` — royal blue (`--brand-700`) for
chrome, links and the rating badge, and **green for every booking call-to-action**
(`bg-green-700`). Keep that split: blue means navigate, green means book. The layout still
overrides `--brand-*` from `websites.primary_color`, and every seeded website carries the same
blue, so re-branding one property stays a CRM operation rather than a code change.

Amenity icons are matched on the amenity's name in `src/components/website/icons.tsx`, not
stored — a hotel can add any amenity and get a sensible icon or a neutral fallback.

Two elements in the design have no feature behind them yet: **Wishlist** in the search bar links
to the customer's bookings, and the **"Ask me anything!"** bubble opens the property's phone and
email rather than a chat. Replace them when those features exist; do not wire them to
placeholders that look functional.
