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

Two things to respect there:

- **The store hangs off `globalThis`**, not a module-level `let`. Next compiles route handlers,
  server components and actions into separate bundles, so a plain variable gives each its own
  copy and ids stop matching between pages.
- **Middleware runs on the edge** and cannot import the demo client (`node:crypto`). Anything it
  needs lives in `src/lib/demo/constants.ts`.

With neither demo mode nor Supabase, middleware rewrites every request to `/setup`. Keep that
page free of any import that reaches data — it must render without either.

`demoSignIn` in `src/app/(auth)/actions.ts` powers the one-click account buttons. It re-checks
`isDemoMode` and that the email is a seeded account, so it cannot become a back door once real
credentials are configured.

## Admin UI

The CRM shell is `src/app/admin/layout.tsx`: a fixed 250px sidebar, a 72px top bar, and a
`#F8FAFC` page background. Navigation is declared once in that file as `MAIN_NAV` / `ADMIN_NAV`
and filtered by permission before it reaches the client; `AdminSidebar` takes icon *names*, not
components, because the layout is a Server Component.

Dashboard pieces live in `src/components/admin/dashboard/`. Cards are `rounded-2xl border
border-slate-200 bg-white`, section titles `text-base font-bold`, and supporting copy
`text-sm text-slate-500`. Charts use one hue per series — blue for bookings, green for revenue.

Stat tiles show a running total with the selected window's movement beside it. `delta()` in
`report.service.ts` returns `changePercent: null` when the baseline is too small for the
percentage to mean anything (over ±300%), and `StatCard` renders that as an em dash rather than
inventing a number.

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
