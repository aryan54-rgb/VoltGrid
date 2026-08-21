# Supabase Integration Handover

State of the VoltGrid Supabase integration, and what the next person needs to
know to keep going.

## 1. Where things stand

VoltGrid started as a frontend-only app with static mock data in `src/data/`.
It is now a full-stack application backed by Supabase.

- ✅ `@supabase/supabase-js` installed; client in `src/lib/supabase.ts`.
- ✅ `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` set in `.env.local`.
- ✅ **Phase 1 — Authentication & roles.** Done. See §3.
- ✅ **Phase 2 — Data fetching migration.** Done, and verified against the live
  project on 2026-08-21. One follow-up migration is still outstanding — see §2.

## 2. Migrations

Run from the Supabase dashboard → SQL Editor, each file pasted whole. All are
idempotent, so re-running one is safe.

| # | File | What it does | Run? |
|---|------|--------------|------|
| 1 | `20260821130000_auth_roles.sql` | Sign-up role passthrough, self-promotion block, admin read policy | ✅ |
| 2 | `20260821140000_grants.sql` | Table privileges the init schema never issued | ✅ |
| 3 | `20260821150000_phase2_schema.sql` | The 22 new tables, 4 views, RLS, admin RPCs | ✅ |
| 4 | `20260821160000_phase2_seed.sql` | The demo dataset | ✅ |
| 5 | `20260821170000_customer_directory.sql` | Customer names for the operator board | ⚠️ **outstanding** |
| 6 | `20260821180000_clean_demo_data.sql` | Empties the demo dataset (§9) | ⚠️ **outstanding** |
| 7 | `20260821190000_oauth_onboarding.sql` | Role picker for social logins (§10) | ⚠️ **outstanding** |

Run 6 before 7. Neither depends on the other, but 6 deletes the demo profiles
and 7 then only has real accounts to reason about, which makes its verification
queries readable.

**Do not re-run file 4.** It is idempotent, which here means replaying it puts
the entire demo dataset that file 6 just removed straight back.

File 5 is five lines and the operator reservation console is wrong without it —
`fetchReservations` reads `customer_directory`, so until it exists the driver
dashboard, driver reservations and operator reservations all show an error card.

Files 3 and 4 must be run as **separate batches**, not concatenated: file 3 adds
the `PENDING` label to the `reservation_status` enum and file 4 uses it, and
Postgres refuses to use a new enum label in the transaction that added it.

### Verification, 2026-08-21

Files 1–4 were executed and then exercised for real against the live project
with one throwaway account per role: 82 checks passed. Sign-up and the profile
trigger, role passthrough, the self-promotion block, demo-persona inheritance,
role isolation between portals, every write path in all four portals, the
derived views recomputing after a bay changed state, the admin RPCs, and a
driver being refused by those RPCs. Details in §4.

One real bug was found and fixed — the operator customer-name lookup, which is
what migration 5 addresses.

Statically, before any of that: all 57 parseable statements parse as Postgres
(`sqlglot`); no policy, grant, insert, update or foreign key names an object
that is never created; every seeded enum value exists on its type; every seeded
foreign key resolves.

## 3. Phase 1: Authentication & roles

Implemented in:

- `src/context/auth.jsx` — `AuthProvider` / `useAuth()`. Resolves the stored
  session, subscribes to `onAuthStateChange`, and fetches the matching
  `profiles` row (keyed on user id, so token refreshes don't refetch). Exposes
  `session`, `user`, `profile`, `role`, `isAuthenticated`, `loading`, `error`
  and the actions `signIn`, `signUp`, `signInWithProvider`, `signOut`,
  `requestPasswordReset`, `updatePassword`, `updateProfile`, `refreshProfile`.
- `src/components/auth/route-guards.jsx` — `RoleRoute`, `PublicOnlyRoute`,
  `RequireAuth`, `AuthSplash`.
- `src/App.jsx` — each portal group is `<RoleRoute role="…" />`; `/login`,
  `/register`, `/forgot-password` sit behind `PublicOnlyRoute`; plus
  `/reset-password` and `/auth/callback`.
- `src/pages/public/Login.jsx` — real `signInWithPassword` plus Google/GitHub
  OAuth. The profile role decides the destination.
- `src/pages/public/Register.jsx` — `signUp` with `{ full_name, role }` in auth
  metadata; handles the email-confirmation case.
- `ForgotPassword.jsx` → `resetPasswordForEmail`; `ResetPassword.jsx` completes
  recovery; `AuthCallback.jsx` lands OAuth and confirmation redirects.
- `src/layouts/AppShell.jsx` — identity comes from the profile; sign-out calls
  `supabase.auth.signOut()`.

**Access model:** strict — each role reaches only its own portal, admin
included. To let admins roam, widen the check in `RoleRoute`.

**Dashboard steps, done 2026-08-21:** the roles migration was executed, Google
and GitHub providers enabled, redirect URLs added (`/auth/callback`,
`/reset-password`).

⚠️ **"Confirm email" is currently OFF.** It was turned off on 2026-08-21 so the
verification run could obtain sessions. Turn it back on when you are done
testing: Authentication → Sign In / Providers → Email → Confirm email.

**Verified 2026-08-21**, once sessions were obtainable: the trigger writes the
profile row, `full_name` and the requested role reach it from auth metadata,
defaults apply, and a user can write their own `name` but is refused on `role`
and `status` — the self-promotion block holds.

**Still unverified:** the OAuth round-trip (Google/GitHub) and the password
reset flow. Both need a real inbox or a browser; neither is reachable from a
scripted harness.

## 4. Phase 2: Data fetching migration

Every `import … from '@/data/*'` in `src/pages` and `src/layouts` is gone. All
35 screens read from Supabase, with loading and error states.

### New database objects

`20260821150000_phase2_schema.sql` adds:

- **Community** — `reviews`, `review_votes`, `posts`, `post_likes`
- **Faults** — `tickets`, `ticket_events`, `sla_policies`, `fault_categories`
- **Notifications** — `notifications`, `notification_reads`
- **Money** — `wallet_accounts`, `payment_cards`, `transactions`
- **Marketplace** — `products`, `product_categories`
- **Fleet** — `fleet_vehicles`, `fleet_drivers`, `invoices`,
  `charging_schedule`, `fleet_settings`
- **Booking / reporting** — `booking_slots`, `analytics_series`
- **Views** — `station_connector_groups`, `posts_with_stats`,
  `reviews_with_stats`, `leaderboard`

### Three decisions worth knowing

**1. Ownership moved from `auth.users` to `profiles`.** `profiles.id` no longer
carries a foreign key into `auth.users` (a delete trigger keeps the same cleanup
behaviour), and `sessions`, `reservations` and `waitlists` now reference
`profiles`. That is what lets the 14-person demo cast exist without 14 logins.

**2. Demo personas.** One profile per role is flagged `is_demo_persona`, and
`public.demo_persona_id()` returns the one matching the caller's role. The RLS
policies read `auth.uid() = user_id OR user_id = demo_persona_id()`, so a brand
new account sees a populated app: a driver inherits Jordan Lee's history, a
fleet manager inherits Sofia Marino's.

The UPDATE and DELETE policies accept the persona too — otherwise every button
in the app would fail for a fresh account, because the row it acts on is not
theirs. **The demo dataset is therefore shared mutable state.** That is the
right trade for a demonstration and the wrong one for production. To lock it
down, drop `OR user_id = public.demo_persona_id()` from every UPDATE/DELETE
policy in the file (the SELECT ones are harmless) and seed each new account
instead.

**3. Derived where derivable, snapshot where not.**

- *Derived from live rows*: connector groups on the station cards
  (`station_connector_groups` over `connectors`), booking slot availability
  (`booking_slots` × live `reservations`), like and helpful counts, network
  uptime on the operator dashboard, the rewards leaderboard.
- *Snapshot in `analytics_series`*: platform growth, revenue by day/station/
  segment, sessions by hour, energy mix, regional performance, fleet
  utilisation and cost. The platform does not record the events behind these
  yet. One row is one point on one chart, keyed `(series, bucket)` with the
  numbers in a jsonb `metrics` column. To make one real, replace its rows with
  a view over `sessions` and leave the call sites in `src/lib/api/analytics.js`
  alone.
- Marketplace GMV is still a constant in `src/pages/admin/Marketplace.jsx` —
  there is no orders table to derive it from.

### Client architecture

- `src/hooks/use-query.js` — `useQuery(fn, deps)` and `useQueries({...}, deps)`.
  This is the whole of the "no React Query" decision from the original plan: a
  loading flag, an error, a refetch, and stale-response protection.
- `src/lib/api/*.js` — one module per domain. Every call funnels through
  `unwrap()` in `helpers.js`, because supabase-js *resolves* on a failed query
  rather than rejecting, and a missed error is an empty table rather than a
  visible failure.
- `src/components/shared/query-state.jsx` — `LoadingRows`, `LoadingCards`,
  `LoadingBlock`, `ErrorState`, `QueryBoundary`.

### Writes, not just reads

Buttons that used to move component state now write to the database: booking and
cancelling slots, joining and leaving a waitlist, wallet top-ups and marketplace
checkout (both ledger-first, so a failure between the two statements leaves a
recorded charge rather than money from nowhere), reporting a fault, assigning
and escalating tickets, taking a bay out of service, commissioning a station,
adding and retiring fleet vehicles and drivers, bulk depot scheduling, settling
an invoice, and moderating marketplace listings.

Two things are still simulated, and say so in the code: the charger **restart**
button (no OCPP link yet) and the live **session telemetry** tick in
`ActiveSession.jsx` (swap the interval for a Realtime subscription on the
`sessions` row and the rest of that screen keeps working).

### Admin account actions go through RPCs

Suspending an account and removing one call `admin_set_user_status`,
`admin_set_user_role` and `admin_delete_profile` — `SECURITY DEFINER` functions
that check the caller's role themselves. A column-level `GRANT` wide enough for
an admin to write `status` or `role` would also let *every* user write those
columns on their own row, because the "Users can update own profile" policy
already passes for them. That is exactly the self-promotion hole the Phase 1
migration closed.

`admin_delete_profile` removes the profile and everything cascading from it. The
`auth.users` row survives — deleting a login needs the service-role key, which
the browser does not have. Do that from the dashboard or an edge function.

### Bugs fixed along the way

- `admin/Reports.jsx` read `r.uptimePct` and `r.growthPct`; the data has
  `uptime` and `growth`, so both columns rendered blank.
- `driver/Profile.jsx` read `user.roleLabel`, which never existed — the badge
  and the role field were empty. Now from `ROLE_META[profile.role]`.
- `operator/Chargers.jsx` filtered bays by `offline` and `maintenance`, which
  are *station* states, not bay states. The board now uses the four SRS
  connector states, matching what `connectors.status` stores.
- `driver/Reviews.jsx` decided "my reviews" by display-name match. Now by
  author id.

## 5. `src/data/` is now a seed fixture, not app data

Nothing in `src/` imports it any more. It is the input to
`scripts/generate-seed.mjs`, which emits
`supabase/migrations/20260821160000_phase2_seed.sql`:

```
npm run seed:sql
```

Edit the fixture, re-run that, re-run the SQL file. Do not hand-edit the
generated migration. (`chargers` and `driverBookings` in the fixture are now
unused — reservations and connectors cover both.)

## 6. Next steps

1. **Run migration 5** (§2). Everything else is in.
2. **Re-enable "Confirm email"** in Authentication → Providers → Email. It was
   turned off on 2026-08-21 so the verification run could obtain sessions.
3. **Delete the throwaway accounts** listed in §8.
4. **Realtime.** The obvious candidates are the active session row and waitlist
   positions. `ActiveSession.jsx` and `Reservations.jsx` are where to start.
5. **Decide on the demo persona model** before this goes anywhere real (§4,
   decision 2).
6. `admin_set_user_role` surfaces a raw `23505` if you move a demo persona onto
   a role that already has one — `profiles_one_persona_per_role` doing its job.
   No UI calls it today; if you wire it up, catch that error.

## 7. Test residue to clear

Authentication → Users:

- `voltgrid.p2.driver.1787310039479@gmail.com`
- `voltgrid.p2.operator.1787310039479@gmail.com`
- `voltgrid.p2.fleet.1787310039479@gmail.com`
- `voltgrid.p2.admin.1787310039479@gmail.com`
- `voltgrid.smoke.1787305459@gmail.com` (unconfirmed, from the Phase 1 agent)
- `voltgrid.p2.driver.1787309881630@gmail.com` (unconfirmed)

Rows, all inert:

- `reviews` → `RV-VERIFY-1787310039479`
- `transactions` → `tx-verify-1787310039479`
- `reservations` → `RS-VERIFY-1787310039479` (cancelled)
- `charging_schedule` → `SCH-VERIFY-1787310152695` (cancelled)
- one `ticket_events` row on `TK-1038` reading "Verification run"

## 8. Key files

- **Schema:** `20260821120000_init.sql` → `20260821150000_phase2_schema.sql`
- **Seed:** `20260821160000_phase2_seed.sql` (generated)
- **Client:** `src/lib/supabase.ts`, `src/lib/api/*.js`, `src/hooks/use-query.js`
- **Auth:** `src/context/auth.jsx`, `src/components/auth/route-guards.jsx`
- **Start here:** `CONTINUE_HERE.md` — one-page orientation for a new session


## 9. Clearing the demo data

`20260821180000_clean_demo_data.sql`. Run once; safe to re-run.

**What it empties.** `stations`, `connectors`, `sessions`, `reservations`,
`waitlists`, `reviews`, `review_votes`, `posts`, `post_likes`, `tickets`,
`ticket_events`, `notifications`, `notification_reads`, `payment_cards`,
`transactions`, `products`, `fleet_settings`, `fleet_drivers`,
`fleet_vehicles`, `invoices`, `charging_schedule`, `analytics_series` — one
`TRUNCATE ... RESTART IDENTITY CASCADE`. Every table with a foreign key into
that set is already in the list, so `CASCADE` reaches nothing unlisted.

**What it keeps, and why.** Four tables are lookup configuration rather than
demo business data, and emptying them breaks screens instead of cleaning them:

| Table | Read by |
|---|---|
| `booking_slots` | the time windows on `/driver/stations/:id/book` |
| `fault_categories` | the category dropdown on `/driver/faults` |
| `product_categories` | the marketplace filter, and a FK target for `products` |
| `sla_policies` | `apply_ticket_sla()`, the trigger that sets ticket deadlines |

A commented-out block at the bottom of the file empties those too.

**The demo cast.** The 14 seeded profiles are deleted, along with any profile
whose `auth.users` row no longer exists. This matters more than the tables:
four of them carry `is_demo_persona`, and every RLS policy reads
`auth.uid() = user_id OR user_id = demo_persona_id()`. Truncating `sessions`
alone would not have stopped a new account inheriting Jordan Lee's history —
the persona row is what hands it over.

With the personas gone `demo_persona_id()` returns NULL, and `user_id = NULL`
evaluates to NULL rather than true. **The clause goes inert on its own; the
policies did not need changing.** Decision 2 in §4 is therefore settled in
practice — the shared-mutable-state problem is gone. If you ever re-seed, it
comes back.

**Real accounts survive**, but their `sessions`, `spend` and `points` counters
are reset to 0 (the rows they counted are deleted) and their wallet is reset to
the trigger's defaults (the ledger behind the balance is deleted; a balance
with no transactions is worse than no balance). Wallet *rows* are not
truncated — `on_profile_created` owns them, and a real user without one breaks
`/driver/wallet`.

**Verifying.** `node scripts/check-db.mjs` prints row counts through the anon
key. Tables behind per-user RLS report `rls` rather than a number, which is the
policy holding rather than a failure.

**The client needed no changes.** Nothing under `src/` has imported `@/data/*`
since Phase 2; `src/data/` is only the fixture `scripts/generate-seed.mjs`
reads. Every screen already renders an empty state, and the four
`reduce`/index-0 sites that looked risky were checked: all four are guarded or
operate on locally-built arrays.

## 10. OAuth onboarding

`20260821190000_oauth_onboarding.sql` plus five client files.

**The bug.** `handle_new_user()` reads the role from `raw_user_meta_data`,
which the registration form supplies. Google and GitHub supply nothing — the
user never sees that form — so every social signup hit the `COALESCE` fallback
and became a driver.

**`profiles.onboarded`** records whether the role on the row was chosen or
merely defaulted. The trigger sets it true only when metadata carried a real
role, which is exactly the email/password path.

This is a stored fact rather than a check on `raw_app_meta_data->>'provider'`
on purpose: it stays correct when an OAuth user later links a password, and
when an email user somehow arrives without a role.

**`complete_onboarding(new_role, display_name)`** is the only path by which a
user may write their own `role`. It is `SECURITY DEFINER` because `role` is
deliberately absent from the column grant on `profiles` (§3) — a grant wide
enough for a new user to set their own role would let *every* user set theirs,
which is the self-promotion hole migration 1 closed. The function refuses
unless the caller's own row has `onboarded = false`, so it works exactly once
per account and cannot be replayed as a role switcher. `SELECT ... FOR UPDATE`
closes the two-tabs race.

**Existing OAuth accounts.** The migration backfills `onboarded = true` for
everyone, then sets it back to `false` for any account whose only
`auth.identities` row is a social provider — the accounts this bug already
caught. The `EXISTS` guard before the `NOT EXISTS` matters: an account with no
identity rows at all predates GoTrue creating an `email` identity for password
signups, and must not be swept up.

**Client.**

| File | Role |
|---|---|
| `src/context/auth.jsx` | `needsOnboarding`, `completeOnboarding()` |
| `src/pages/public/Onboarding.jsx` | the `/welcome` role picker |
| `src/components/auth/route-guards.jsx` | `OnboardingRoute`; diversions in `RoleRoute` and `PublicOnlyRoute` |
| `src/pages/public/AuthCallback.jsx` | lands on `/welcome` when onboarding is pending |
| `src/App.jsx` | the `/welcome` route |

Flow: Google → `/auth/callback` → `/welcome` → pick → RPC → portal. A
half-onboarded account cannot reach a portal, cannot reach `/login`, and cannot
call the RPC twice.

**Production caveat.** The picker offers all four roles, matching what the
registration form already does, so anyone with a Google account can make
themselves an Admin. The clamp is written out in the comments of both the
migration and the trigger.

**Unverified.** The OAuth round-trip still needs a browser and a real Google
account — that is the one thing a scripted harness cannot reach here. §11 is
the test script.

## 11. Testing the OAuth flow by hand

1. Run migrations 5, 6 and 7.
2. `npm run dev`, go to `/login`, click **Google**.
3. Expect: the callback resolves and you land on **`/welcome`**, not `/driver`.
4. Pick **Station Operator**, continue. Expect `/operator`.
5. Check the row: `SELECT email, role, onboarded FROM profiles WHERE email = '…'`
   → `operator`, `true`.
6. Navigate to `/welcome` again. Expect an immediate bounce to `/operator` —
   `OnboardingRoute` will not let a settled account back in.
7. Sign out, sign in with Google again. Expect `/operator` directly, no picker.
8. Register a fresh account by email with a role. Expect that role, and no
   `/welcome` — the trigger set `onboarded = true` on the way in.
