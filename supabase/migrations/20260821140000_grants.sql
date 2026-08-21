-- Phase 1 follow-up: table privileges
--
-- Verified against the live project on 2026-08-21: `anon` gets
--   "permission denied for table stations"
-- even though the init migration created `CREATE POLICY "Anyone can view
-- stations" ... USING (true)`.
--
-- RLS policies only filter rows a role is *already* allowed to touch. If the
-- role has no SELECT privilege on the table, PostgREST fails before any policy
-- is evaluated. Supabase's default privileges normally hand `anon` and
-- `authenticated` these grants automatically; on this project they did not
-- apply, so the init schema is unreadable by the app. This migration grants
-- exactly what the existing policies assume -- nothing wider.

GRANT USAGE ON SCHEMA public TO anon, authenticated;

-- Public catalogue: matches "Anyone can view stations/connectors".
-- Drop `anon` from these two lines if the station list should require login.
GRANT SELECT ON public.stations  TO anon, authenticated;
GRANT SELECT ON public.connectors TO anon, authenticated;

-- Own-row data. RLS still restricts these to auth.uid() = user_id.
GRANT SELECT                 ON public.sessions     TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.reservations TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.waitlists    TO authenticated;

-- profiles: SELECT is row-filtered by RLS (own row, or any row for admins via
-- the policy added in 20260821130000). UPDATE stays column-restricted so a user
-- cannot write their own `role` or `status` -- re-stated here so this file is
-- self-contained if the migrations are ever replayed on a fresh project.
GRANT SELECT ON public.profiles TO authenticated;
REVOKE UPDATE ON public.profiles FROM authenticated;
GRANT UPDATE (name, company, vehicle, plan) ON public.profiles TO authenticated;

-- No sequences to grant: every table uses a TEXT or UUID primary key.
