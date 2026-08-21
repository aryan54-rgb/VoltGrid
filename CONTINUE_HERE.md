# Continue here

One-page orientation for picking this project up cold. Depth lives in
[`SUPABASE_HANDOVER.md`](./SUPABASE_HANDOVER.md); this is the map.

_Last touched: 2026-08-21._

## Where the project is

VoltGrid is an EV-charging platform with four portals — driver, fleet, operator,
admin. It began as a React UI with hard-coded fixtures in `src/data/`. It is now
a full-stack app on Supabase.

- **Phase 1 (auth & roles)** — done.
- **Phase 2 (data migration)** — done. Every `@/data/*` import is gone; all 35
  screens read from Supabase with loading and error states. Migrations 1–4 have
  been run against the live project and verified with 82 live checks.

## Do these four things first

1. **Run the three outstanding migrations**, in this order, each pasted whole
   into the Supabase SQL Editor:
   - `20260821170000_customer_directory.sql` — five lines. Without it the driver
     dashboard, driver reservations and operator reservations show an error
     card, because `fetchReservations` reads the `customer_directory` view.
   - `20260821180000_clean_demo_data.sql` — empties the demo dataset.
   - `20260821190000_oauth_onboarding.sql` — the role picker for social logins.
2. **Re-enable "Confirm email"** (Authentication → Sign In / Providers → Email).
   It was switched off to let the verification run obtain sessions.
3. **Delete the test residue** — six throwaway accounts, listed in
   `SUPABASE_HANDOVER.md` §7. (The five inert rows listed there are already gone;
   the clean migration truncated the tables holding them.)
4. **Never re-run `20260821160000_phase2_seed.sql`.** It is the file that put the
   demo stations, connectors and 14-person cast in the database, and it is
   idempotent — replaying it puts every one of them straight back.

## ⚠️ The database is meant to be empty now

`20260821180000_clean_demo_data.sql` cleared the demo dataset on purpose. Empty
station lists, blank charts and zero balances are the intended state, not a
regression. Four lookup tables were deliberately kept — `booking_slots`,
`fault_categories`, `product_categories`, `sla_policies` — because emptying
those breaks the booking screen and the fault form rather than cleaning them.

`node scripts/check-db.mjs` prints the row counts to confirm.

## What this session did

Migrated the whole app off mock data, per the user's explicit choice of the
widest scope ("full app — add the missing tables") over migrating only the six
domains the schema already covered.

**Database.** 22 new tables, 4 views, RLS and grants across community, faults,
notifications, wallet, marketplace, fleet, booking slots and reporting. Three
admin RPCs. Files:

- `20260821150000_phase2_schema.sql` — schema, policies, grants, RPCs
- `20260821160000_phase2_seed.sql` — **generated**, do not hand-edit
- `20260821170000_customer_directory.sql` — the follow-up above

**Client.** `src/hooks/use-query.js` (`useQuery` / `useQueries` — the whole of
the deliberate "no React Query" decision), `src/lib/api/*.js` (one module per
domain), `src/components/shared/query-state.jsx` (loading and error surfaces).

**Writes, not just reads.** Booking, cancelling, waitlists, wallet top-ups,
marketplace checkout, fault reporting, ticket assignment and escalation, bay
status, station commissioning, fleet roster and scheduling, invoice settlement,
listing moderation.

**Bugs fixed on the way:** `admin/Reports` read `uptimePct`/`growthPct` against
data with `uptime`/`growth`; `driver/Profile` read a `roleLabel` that never
existed; `operator/Chargers` filtered bays by station-level states; and
`driver/Reviews` decided "mine" by display-name match.

## OAuth onboarding (added 2026-08-21)

Google and GitHub never pass through the registration form, so
`handle_new_user()` had no role to read and every social signup silently became
a driver. Fixed with a flag and a one-shot RPC, in
`20260821190000_oauth_onboarding.sql`:

- `profiles.onboarded` records whether the role was **chosen** or merely
  defaulted. The trigger sets it true only when sign-up metadata carried a real
  role — the email/password path. OAuth rows land `false`.
- `complete_onboarding(new_role, display_name)` is the only route by which a
  user may write their own `role`, and it refuses once `onboarded` is true. It
  is `SECURITY DEFINER` precisely *because* `role` is not in the column grant on
  `profiles` — widening that grant would reopen the self-promotion hole Phase 1
  closed.
- Client: `/welcome` (`src/pages/public/Onboarding.jsx`) behind `OnboardingRoute`.
  `RoleRoute`, `PublicOnlyRoute` and `AuthCallback` all divert there while
  `needsOnboarding` is true.

The migration also sets `onboarded = false` for any *existing* account whose only
`auth.identities` row is a social provider — the accounts this bug already
caught. They get the picker on their next visit.

Note: the picker offers all four roles, matching the registration form, so
anyone with a Google account can self-assign Admin. Fine for the demo, wrong for
production; the fix is in the comments of both the migration and the page.

## Five things that will trip you up

1. **`src/data/` is not app data any more.** Nothing in `src/` imports it. It is
   the fixture that `scripts/generate-seed.mjs` reads to emit the seed
   migration. Change the fixture, run `npm run seed:sql`, re-run the SQL. Never
   hand-edit `20260821160000_phase2_seed.sql`.

2. **Demo personas.** One profile per role is flagged `is_demo_persona`;
   `demo_persona_id()` hands the caller the one matching their role. That is why
   a brand-new account already has 13 sessions and a funded wallet. The UPDATE
   and DELETE policies accept the persona too, so **the demo dataset is shared
   mutable state** — fine for a demo, wrong for production. `SUPABASE_HANDOVER.md`
   §4 says exactly what to delete to lock it down.

3. **Dates are anchored to ~31 July 2026**, not today. `BASE_DATE`, `TODAY` and
   `SLA_NOW` in the pages are pinned to match the seeded data so bookings and
   SLA breaches read sensibly. Point them at `new Date()` once real data flows.

4. **Admin account actions go through `SECURITY DEFINER` RPCs**, never a direct
   UPDATE. A column grant wide enough for an admin to write `status`/`role`
   would also let every user write those on their own row — reopening the
   self-promotion hole Phase 1 closed. Keep that shape.

5. **Some numbers are snapshots, not derived,** and that is deliberate.
   `analytics_series` holds platform growth, revenue series, energy mix and
   regional performance because the platform records no events behind them yet.
   Marketplace GMV is still a constant in `admin/Marketplace.jsx`. Connector
   counts, slot availability, like/helpful counts, uptime and the leaderboard
   *are* derived from live rows.

## Known-simulated, and labelled as such in the code

- The charger **Restart** button — no OCPP link exists.
- The ticking SoC on `driver/ActiveSession.jsx` — no telemetry feed. Swapping
  that interval for a Realtime subscription on the `sessions` row is the
  obvious next piece of work.

## Still unverified

The OAuth round-trip (Google/GitHub) and the password reset flow. Both need a
real inbox or a browser; a scripted harness cannot reach them.

## Environment notes

- Windows. `npx` fails from Git Bash (`'"node"' is not recognized`) — use the
  PowerShell tool for `npm run build` and `npx oxlint`.
- `/tmp` maps to `C:\tmp` and may not exist; use the session scratchpad.
- There is no service-role key and no working Supabase CLI here. SQL has to be
  pasted into the dashboard by the user; you can only read through the anon key
  or a signed-in session's token.

## Commands

```
npm run dev        # vite dev server
npm run build      # must stay green
npm run lint       # oxlint; only pre-existing fast-refresh warnings expected
npm run seed:sql   # regenerate the seed migration from src/data/
```
