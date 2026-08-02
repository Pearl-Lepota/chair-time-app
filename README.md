# Chair Time — Phase 1 (multi-tenant core)

This is a real, deployable Next.js + Supabase app implementing Phase 1 from the
build spec: salon accounts, multi-tenant data isolation, the category-first
booking flow, staff skill-matching, and a mock deposit step. Real payment
provider integration (Yoco/PayFast) and Pearl's own subscription billing are
**not** built yet — see `chair-time-build-spec.md` for Phases 2–4.

All JS/JSX files have been syntax-checked, but this project has **not** been
run through `npm install` / `npm run dev` / `npm run build` yet — that requires
internet access this environment doesn't have. Claude Code (or you, locally)
should do that first pass and fix whatever comes up — some dependency version
mismatch or a typo is likely on a project this size that's never been booted.

## What's in here

```
app/
  page.js                    marketing landing page
  login/, signup/             auth pages
  auth/callback/               email confirmation handler
  onboarding/                  new owner creates their salon
  dashboard/                   salon owner's app (schedule, services, staff)
  book/[slug]/                 PUBLIC client-facing booking page (no login)
lib/
  supabase/client.js           browser Supabase client
  supabase/server.js           server Supabase client (cookies-based auth)
  booking-logic.js             categories, deposit calc, slot math — ported
                                directly from the salon-booking.html prototype
  get-salon.js                 auth guard + "get the logged-in user's salon"
supabase/
  schema.sql                   full DB schema + Row-Level Security policies
middleware.js                  keeps auth sessions fresh
```

## 1. Set up Supabase

1. Create a project at [supabase.com](https://supabase.com).
2. In the Supabase dashboard, go to **SQL Editor**, paste the entire contents
   of `supabase/schema.sql`, and run it. This creates every table and locks
   them down with Row-Level Security so one salon can never see another
   salon's data.
3. Go to **Project Settings → API** and copy:
   - Project URL
   - `anon` public key
4. In **Authentication → URL Configuration**, add your eventual production
   URL (and `http://localhost:3000` for local dev) to the redirect allow-list,
   so email confirmation links work.

## 2. Local setup

```bash
npm install
cp .env.example .env.local
# paste your Supabase URL + anon key into .env.local
npm run dev
```

Open `localhost:3000`, sign up, confirm the email (check your inbox — or
Supabase's dashboard under Authentication → Users if using a test address),
create a salon, and you should land in the dashboard. Add a service and a
staff member, then visit `localhost:3000/book/your-salon-slug` to test the
client-facing flow end to end.

## 3. Deploy to Vercel

1. Push this project to a GitHub repo.
2. Go to [vercel.com/new](https://vercel.com/new), import the repo.
3. In the Vercel project's **Environment Variables**, add the same two values
   from `.env.local` (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`).
4. Deploy. Vercel gives you a `*.vercel.app` URL immediately; a custom domain
   (e.g. `chairtime.co.za`) can be attached afterward under the project's
   **Domains** tab.
5. Go back to Supabase → Authentication → URL Configuration and add the real
   deployed URL to the allow-list, or email confirmation redirects will fail
   in production.

## What's deliberately not built yet

- **Real payments.** The deposit step on the booking page is the same mock
  as the prototype — no card is charged. Wiring up Yoco/PayFast is Phase 2.
- **Pearl's own subscription billing** of each salon — Phase 3.
- **Per-staff working hours.** Every staff member is assumed to work
  09:00–18:00, closed Sundays (see `OPEN_MIN`/`CLOSE_MIN` in
  `lib/booking-logic.js`). A `staff_hours` table design is described in the
  build spec but not yet wired into this UI.
- **`.ics` calendar export** — present in the prototype, not yet ported here.
- **Custom domains per salon**, SMS/email reminders — Phase 4 in the spec.

## If something breaks

This was written carefully but never executed (no internet access in the
authoring environment). The most likely first issues when Claude Code runs
`npm install` for real:
- A package version resolving differently than expected — safe to bump.
- Next.js's exact `searchParams`/`params` async-prop behavior shifting
  between versions — the schedule page and booking page already await them
  where needed, but double-check against whatever Next.js version actually
  installs.
