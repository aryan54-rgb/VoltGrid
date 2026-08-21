-- ============================================================================
-- Phase 2 (part 1 of 2): schema for the domains that had no tables
--
-- The init migration covered stations, connectors, sessions, reservations and
-- waitlists. Everything else the UI renders still came from `src/data/*.js`.
-- This migration adds the missing entities, repoints ownership at `profiles`,
-- and grants the privileges each policy assumes.
--
-- Run order: 20260821130000 -> 20260821140000 -> this file -> 20260821160000.
-- Safe to re-run: every statement is guarded.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 0. Enums
-- ---------------------------------------------------------------------------
DO $$ BEGIN
  CREATE TYPE ticket_priority     AS ENUM ('LOW','MEDIUM','HIGH','CRITICAL');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE TYPE ticket_status       AS ENUM ('OPEN','ASSIGNED','IN_PROGRESS','RESOLVED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE TYPE ticket_source       AS ENUM ('DRIVER_REPORT','KIOSK_EMULATOR','PM_SCHEDULE','FIELD_INSPECTION');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE TYPE transaction_type    AS ENUM ('charge','topup','purchase','refund','subscription');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE TYPE transaction_status  AS ENUM ('completed','pending','refunded','failed');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE TYPE vehicle_status      AS ENUM ('active','charging','idle','maintenance');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE TYPE fleet_driver_status AS ENUM ('ON_DUTY','OFF_DUTY','ON_LEAVE');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE TYPE schedule_status     AS ENUM ('SCHEDULED','CHARGING','COMPLETED','CANCELLED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE TYPE invoice_status      AS ENUM ('paid','pending','overdue');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- A reservation that has been requested but not yet confirmed by the operator.
-- Added here rather than in the seed file on purpose: Postgres refuses to use a
-- new enum label in the same transaction that adds it.
ALTER TYPE reservation_status ADD VALUE IF NOT EXISTS 'PENDING';

-- ---------------------------------------------------------------------------
-- 1. Ownership model
--
-- `profiles.id` used to be a foreign key into `auth.users`, which meant a row
-- could only exist for someone who had actually signed up. The demo dataset
-- (Jordan Lee's charging history, Sofia Marino's fleet, the admin user table)
-- has no logins behind it, so the FK is replaced by a delete trigger that keeps
-- the same cleanup behaviour, and every other table's `user_id` now points at
-- `profiles` instead of `auth.users`.
-- ---------------------------------------------------------------------------
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_id_fkey;

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_demo         boolean NOT NULL DEFAULT false;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_demo_persona boolean NOT NULL DEFAULT false;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS handle          text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS avatar_color    text;

-- Exactly one persona per role may be handed out by demo_persona_id().
CREATE UNIQUE INDEX IF NOT EXISTS profiles_one_persona_per_role
  ON public.profiles (role) WHERE is_demo_persona;

CREATE OR REPLACE FUNCTION public.handle_deleted_user()
RETURNS TRIGGER AS $$
BEGIN
  DELETE FROM public.profiles WHERE id = old.id;
  RETURN old;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS on_auth_user_deleted ON auth.users;
CREATE TRIGGER on_auth_user_deleted
  AFTER DELETE ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_deleted_user();

-- Repoint the existing user references at profiles.
ALTER TABLE public.sessions     DROP CONSTRAINT IF EXISTS sessions_user_id_fkey;
ALTER TABLE public.sessions     ADD  CONSTRAINT sessions_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
ALTER TABLE public.reservations DROP CONSTRAINT IF EXISTS reservations_user_id_fkey;
ALTER TABLE public.reservations ADD  CONSTRAINT reservations_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
ALTER TABLE public.waitlists    DROP CONSTRAINT IF EXISTS waitlists_user_id_fkey;
ALTER TABLE public.waitlists    ADD  CONSTRAINT waitlists_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

-- Columns the driver-facing session views need but init did not carry.
ALTER TABLE public.sessions     ADD COLUMN IF NOT EXISTS ended_at    timestamptz;
ALTER TABLE public.sessions     ADD COLUMN IF NOT EXISTS vehicle     text;
ALTER TABLE public.sessions     ADD COLUMN IF NOT EXISTS current_soc int;
ALTER TABLE public.sessions     ADD COLUMN IF NOT EXISTS power_kw    numeric;
ALTER TABLE public.sessions     ADD COLUMN IF NOT EXISTS power_curve jsonb;
ALTER TABLE public.reservations ADD COLUMN IF NOT EXISTS created_at  timestamptz DEFAULT now();

-- Which demo persona the signed-in user inherits data from. A real driver sees
-- their own rows plus Jordan Lee's; a fleet manager sees Sofia Marino's. This
-- is what keeps the app populated for an account that has never charged.
CREATE OR REPLACE FUNCTION public.demo_persona_id()
RETURNS uuid AS $$
  SELECT p.id
  FROM public.profiles p
  WHERE p.is_demo_persona AND p.role = public.current_user_role()
  LIMIT 1;
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public;

-- ---------------------------------------------------------------------------
-- 2. Community: reviews and posts
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.reviews (
  id               text PRIMARY KEY,
  station_id       text NOT NULL REFERENCES public.stations(id) ON DELETE CASCADE,
  author_id        uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  author_name      text NOT NULL,
  rating           int  NOT NULL CHECK (rating BETWEEN 1 AND 5),
  reviewed_on      date NOT NULL DEFAULT current_date,
  title            text NOT NULL,
  body             text NOT NULL,
  seed_helpful     int  NOT NULL DEFAULT 0,
  verified_session boolean NOT NULL DEFAULT false,
  created_at       timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS reviews_station_idx ON public.reviews (station_id);

CREATE TABLE IF NOT EXISTS public.review_votes (
  review_id text NOT NULL REFERENCES public.reviews(id) ON DELETE CASCADE,
  user_id   uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  PRIMARY KEY (review_id, user_id)
);

CREATE TABLE IF NOT EXISTS public.posts (
  id           text PRIMARY KEY,
  author_id    uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  author_name  text NOT NULL,
  handle       text NOT NULL,
  avatar_color text NOT NULL DEFAULT 'bg-emerald-500',
  created_at   timestamptz NOT NULL DEFAULT now(),
  tag          text NOT NULL,
  title        text NOT NULL,
  body         text NOT NULL,
  seed_likes   int  NOT NULL DEFAULT 0,
  comments     int  NOT NULL DEFAULT 0,
  shares       int  NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS public.post_likes (
  post_id text NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  PRIMARY KEY (post_id, user_id)
);

-- ---------------------------------------------------------------------------
-- 3. Fault tickets
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.sla_policies (
  priority       ticket_priority PRIMARY KEY,
  response_hours int NOT NULL
);

CREATE TABLE IF NOT EXISTS public.fault_categories (
  name       text PRIMARY KEY,
  sort_order int NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS public.tickets (
  id              text PRIMARY KEY,
  title           text NOT NULL,
  station_id      text REFERENCES public.stations(id) ON DELETE SET NULL,
  connector_id    text REFERENCES public.connectors(id) ON DELETE SET NULL,
  connector_label text,
  fault_code      text,
  priority        ticket_priority NOT NULL DEFAULT 'MEDIUM',
  status          ticket_status   NOT NULL DEFAULT 'OPEN',
  source          ticket_source   NOT NULL DEFAULT 'DRIVER_REPORT',
  category        text,
  reporter        text NOT NULL,
  reporter_id     uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  assigned_to     text NOT NULL DEFAULT 'Awaiting dispatch',
  reported_at     timestamptz NOT NULL DEFAULT now(),
  sla_due_at      timestamptz,
  resolved_at     timestamptz,
  description     text NOT NULL DEFAULT '',
  parts           text[] NOT NULL DEFAULT '{}'
);
CREATE INDEX IF NOT EXISTS tickets_reporter_idx ON public.tickets (reporter_id);

CREATE TABLE IF NOT EXISTS public.ticket_events (
  id        bigint GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
  ticket_id text NOT NULL REFERENCES public.tickets(id) ON DELETE CASCADE,
  at        timestamptz NOT NULL DEFAULT now(),
  who       text NOT NULL,
  what      text NOT NULL
);
CREATE INDEX IF NOT EXISTS ticket_events_ticket_idx ON public.ticket_events (ticket_id, at);
-- The seed inserts events with ON CONFLICT DO NOTHING; without this they would
-- be duplicated every time the seed file is replayed.
CREATE UNIQUE INDEX IF NOT EXISTS ticket_events_unique
  ON public.ticket_events (ticket_id, at, who, what);

-- Fill sla_due_at from the SLA table when the client does not supply one.
CREATE OR REPLACE FUNCTION public.apply_ticket_sla()
RETURNS TRIGGER AS $$
DECLARE
  -- Not named `hours`: that collides with make_interval's own parameter name.
  sla_hours int;
BEGIN
  IF new.sla_due_at IS NULL THEN
    SELECT response_hours INTO sla_hours FROM public.sla_policies WHERE priority = new.priority;
    new.sla_due_at := new.reported_at + make_interval(hours => COALESCE(sla_hours, 24));
  END IF;
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS tickets_apply_sla ON public.tickets;
CREATE TRIGGER tickets_apply_sla
  BEFORE INSERT ON public.tickets
  FOR EACH ROW EXECUTE PROCEDURE public.apply_ticket_sla();

-- ---------------------------------------------------------------------------
-- 4. Notifications
--
-- A row with a null user_id is a broadcast aimed at `roles`. Read state for
-- those cannot live on the row itself (nobody owns it), so it goes in a
-- per-user receipt table.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.notifications (
  id         text PRIMARY KEY,
  user_id    uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  roles      user_role[] NOT NULL DEFAULT '{}',
  type       text NOT NULL,
  title      text NOT NULL,
  body       text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  -- Broadcasts that arrive already-read for everyone (digests, older promos).
  -- Per-user read state lives in notification_reads; this is the floor.
  seed_read  boolean NOT NULL DEFAULT false
);

CREATE TABLE IF NOT EXISTS public.notification_reads (
  notification_id text NOT NULL REFERENCES public.notifications(id) ON DELETE CASCADE,
  user_id         uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  read_at         timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (notification_id, user_id)
);

-- ---------------------------------------------------------------------------
-- 5. Wallet, cards and transactions
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.wallet_accounts (
  user_id               uuid PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  balance               numeric NOT NULL DEFAULT 0,
  currency              text    NOT NULL DEFAULT 'USD',
  auto_top_up           boolean NOT NULL DEFAULT false,
  auto_top_up_threshold numeric NOT NULL DEFAULT 20,
  auto_top_up_amount    numeric NOT NULL DEFAULT 50
);

CREATE TABLE IF NOT EXISTS public.payment_cards (
  id         text PRIMARY KEY,
  user_id    uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  brand      text NOT NULL,
  last4      text NOT NULL,
  expiry     text NOT NULL,
  is_primary boolean NOT NULL DEFAULT false
);

CREATE TABLE IF NOT EXISTS public.transactions (
  id          text PRIMARY KEY,
  user_id     uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  type        transaction_type   NOT NULL,
  description text NOT NULL,
  occurred_at timestamptz NOT NULL DEFAULT now(),
  amount      numeric NOT NULL,
  status      transaction_status NOT NULL DEFAULT 'completed',
  method      text NOT NULL DEFAULT 'Wallet'
);
CREATE INDEX IF NOT EXISTS transactions_user_idx ON public.transactions (user_id, occurred_at DESC);

-- Every new signup gets a wallet so the driver pages have something to read.
CREATE OR REPLACE FUNCTION public.handle_new_profile()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.wallet_accounts (user_id) VALUES (new.id)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS on_profile_created ON public.profiles;
CREATE TRIGGER on_profile_created
  AFTER INSERT ON public.profiles
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_profile();

-- ---------------------------------------------------------------------------
-- 6. Marketplace
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.product_categories (
  name       text PRIMARY KEY,
  sort_order int NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS public.products (
  id          text PRIMARY KEY,
  name        text NOT NULL,
  category    text NOT NULL REFERENCES public.product_categories(name) ON UPDATE CASCADE,
  price       numeric NOT NULL,
  per         text,
  rating      numeric NOT NULL DEFAULT 0,
  reviews     int     NOT NULL DEFAULT 0,
  badge       text,
  seller      text NOT NULL,
  stock       int,
  gradient    text NOT NULL DEFAULT 'from-slate-400 to-slate-600',
  description text NOT NULL DEFAULT '',
  -- Seller submissions land as 'pending' and only reach the driver-facing
  -- catalogue once an admin approves them.
  listing_status text NOT NULL DEFAULT 'live'
    CHECK (listing_status IN ('live', 'pending', 'rejected')),
  submitted_on   date,
  listed         boolean NOT NULL DEFAULT true,
  featured       boolean NOT NULL DEFAULT false
);
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS listing_status text NOT NULL DEFAULT 'live';
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS submitted_on   date;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS listed         boolean NOT NULL DEFAULT true;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS featured       boolean NOT NULL DEFAULT false;

-- ---------------------------------------------------------------------------
-- 7. Fleet
--
-- Scoped by company name, which is the field the fleet manager's profile
-- already carries. Admins see every company.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.fleet_settings (
  company              text PRIMARY KEY,
  depot_power_limit_kw int NOT NULL DEFAULT 300
);

CREATE TABLE IF NOT EXISTS public.fleet_drivers (
  id                  text PRIMARY KEY,
  company             text NOT NULL,
  name                text NOT NULL,
  email               text NOT NULL,
  licence             text NOT NULL,
  assigned_vehicle    text,
  shift               text NOT NULL,
  status              fleet_driver_status NOT NULL DEFAULT 'OFF_DUTY',
  sessions_this_month int NOT NULL DEFAULT 0,
  energy_kwh          numeric NOT NULL DEFAULT 0,
  safety_score        int NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS public.fleet_vehicles (
  id           text PRIMARY KEY,
  company      text NOT NULL,
  driver_id    text REFERENCES public.fleet_drivers(id) ON DELETE SET NULL,
  model        text NOT NULL,
  driver_name  text NOT NULL DEFAULT '—',
  soc          int NOT NULL DEFAULT 0,
  range_km     int NOT NULL DEFAULT 0,
  status       vehicle_status NOT NULL DEFAULT 'idle',
  location     text NOT NULL DEFAULT '',
  odometer     int NOT NULL DEFAULT 0,
  health       int NOT NULL DEFAULT 100,
  next_service text
);

CREATE TABLE IF NOT EXISTS public.invoices (
  id       text PRIMARY KEY,
  company  text NOT NULL,
  period   text NOT NULL,
  amount   numeric NOT NULL,
  sessions int NOT NULL DEFAULT 0,
  energy   numeric NOT NULL DEFAULT 0,
  status   invoice_status NOT NULL DEFAULT 'pending',
  due      date NOT NULL
);

CREATE TABLE IF NOT EXISTS public.charging_schedule (
  id              text PRIMARY KEY,
  company         text NOT NULL,
  vehicle_id      text REFERENCES public.fleet_vehicles(id) ON DELETE CASCADE,
  connector_label text NOT NULL,
  start_time      time NOT NULL,
  end_time        time NOT NULL,
  target_soc_pct  int  NOT NULL DEFAULT 90,
  status          schedule_status NOT NULL DEFAULT 'SCHEDULED',
  night           date NOT NULL
);

-- ---------------------------------------------------------------------------
-- 8. Booking slots and reporting snapshots
--
-- `booking_slots` is the canonical half-hour grid; whether a slot is free is
-- worked out against `reservations` at query time, not stored.
--
-- `analytics_series` holds the reporting figures whose underlying events the
-- platform does not record yet (platform growth, energy mix, regional
-- performance...). Each row is one point on one chart. Swap a series for a view
-- over `sessions` as soon as there is real volume behind it.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.booking_slots (
  id         text PRIMARY KEY,
  label      text NOT NULL,
  start_time time NOT NULL,
  end_time   time NOT NULL,
  sort_order int NOT NULL
);

CREATE TABLE IF NOT EXISTS public.analytics_series (
  series  text NOT NULL,
  bucket  text NOT NULL,
  ord     int  NOT NULL DEFAULT 0,
  metrics jsonb NOT NULL DEFAULT '{}',
  PRIMARY KEY (series, bucket)
);

-- ---------------------------------------------------------------------------
-- 9. Views
-- ---------------------------------------------------------------------------

-- The station cards show connector groups ("6 x CCS2 150 kW, 2 free"). Those
-- counts are derived from the individual connector rows, so a bay going offline
-- is reflected everywhere at once.
CREATE OR REPLACE VIEW public.station_connector_groups AS
SELECT
  c.station_id,
  c.type,
  c.power_kw,
  count(*)::int                                       AS total,
  count(*) FILTER (WHERE c.status = 'AVAILABLE')::int AS available
FROM public.connectors c
GROUP BY c.station_id, c.type, c.power_kw;

-- Posts with their live like count and whether the caller has liked them.
CREATE OR REPLACE VIEW public.posts_with_stats AS
SELECT
  p.*,
  p.seed_likes + (SELECT count(*) FROM public.post_likes l WHERE l.post_id = p.id)::int AS likes,
  EXISTS (SELECT 1 FROM public.post_likes l WHERE l.post_id = p.id AND l.user_id = auth.uid()) AS liked
FROM public.posts p;

-- Reviews with their live helpful count and the caller's vote.
CREATE OR REPLACE VIEW public.reviews_with_stats AS
SELECT
  r.*,
  r.seed_helpful + (SELECT count(*) FROM public.review_votes v WHERE v.review_id = r.id)::int AS helpful,
  EXISTS (SELECT 1 FROM public.review_votes v WHERE v.review_id = r.id AND v.user_id = auth.uid()) AS voted
FROM public.reviews r;

-- Reward-points leaderboard across drivers.
CREATE OR REPLACE VIEW public.leaderboard AS
SELECT
  rank() OVER (ORDER BY p.points DESC, p.name)::int AS rank,
  p.id,
  p.name,
  p.points,
  p.sessions
FROM public.profiles p
WHERE p.role = 'driver' AND p.status = 'active';

-- ---------------------------------------------------------------------------
-- 10. Row level security
-- ---------------------------------------------------------------------------
ALTER TABLE public.reviews            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.review_votes       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.posts              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.post_likes         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tickets            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ticket_events      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sla_policies       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fault_categories   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_reads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wallet_accounts    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_cards      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fleet_settings     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fleet_drivers      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fleet_vehicles     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.charging_schedule  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.booking_slots      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.analytics_series   ENABLE ROW LEVEL SECURITY;

-- Public catalogue -----------------------------------------------------------
DROP POLICY IF EXISTS "Anyone can read reviews" ON public.reviews;
CREATE POLICY "Anyone can read reviews" ON public.reviews FOR SELECT USING (true);
DROP POLICY IF EXISTS "Drivers write own reviews" ON public.reviews;
CREATE POLICY "Drivers write own reviews" ON public.reviews FOR INSERT WITH CHECK (auth.uid() = author_id);
DROP POLICY IF EXISTS "Authors edit own reviews" ON public.reviews;
CREATE POLICY "Authors edit own reviews" ON public.reviews FOR UPDATE USING (auth.uid() = author_id);

DROP POLICY IF EXISTS "Anyone can read posts" ON public.posts;
CREATE POLICY "Anyone can read posts" ON public.posts FOR SELECT USING (true);
DROP POLICY IF EXISTS "Users write own posts" ON public.posts;
CREATE POLICY "Users write own posts" ON public.posts FOR INSERT WITH CHECK (auth.uid() = author_id);
DROP POLICY IF EXISTS "Authors edit own posts" ON public.posts;
CREATE POLICY "Authors edit own posts" ON public.posts FOR UPDATE USING (auth.uid() = author_id);

DROP POLICY IF EXISTS "Anyone can read products" ON public.products;
CREATE POLICY "Anyone can read products" ON public.products FOR SELECT USING (true);
DROP POLICY IF EXISTS "Admins curate the catalogue" ON public.products;
CREATE POLICY "Admins curate the catalogue" ON public.products FOR UPDATE
  USING (public.current_user_role() = 'admin');
DROP POLICY IF EXISTS "Admins add products" ON public.products;
CREATE POLICY "Admins add products" ON public.products FOR INSERT
  WITH CHECK (public.current_user_role() = 'admin');
DROP POLICY IF EXISTS "Anyone can read categories" ON public.product_categories;
CREATE POLICY "Anyone can read categories" ON public.product_categories FOR SELECT USING (true);
DROP POLICY IF EXISTS "Anyone can read slots" ON public.booking_slots;
CREATE POLICY "Anyone can read slots" ON public.booking_slots FOR SELECT USING (true);
DROP POLICY IF EXISTS "Anyone can read fault categories" ON public.fault_categories;
CREATE POLICY "Anyone can read fault categories" ON public.fault_categories FOR SELECT USING (true);
DROP POLICY IF EXISTS "Anyone can read sla" ON public.sla_policies;
CREATE POLICY "Anyone can read sla" ON public.sla_policies FOR SELECT USING (true);

-- Own-row votes and likes ----------------------------------------------------
DROP POLICY IF EXISTS "Anyone can read likes" ON public.post_likes;
CREATE POLICY "Anyone can read likes" ON public.post_likes FOR SELECT USING (true);
DROP POLICY IF EXISTS "Users like as themselves" ON public.post_likes;
CREATE POLICY "Users like as themselves" ON public.post_likes FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users unlike own likes" ON public.post_likes;
CREATE POLICY "Users unlike own likes" ON public.post_likes FOR DELETE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Anyone can read votes" ON public.review_votes;
CREATE POLICY "Anyone can read votes" ON public.review_votes FOR SELECT USING (true);
DROP POLICY IF EXISTS "Users vote as themselves" ON public.review_votes;
CREATE POLICY "Users vote as themselves" ON public.review_votes FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users withdraw own votes" ON public.review_votes;
CREATE POLICY "Users withdraw own votes" ON public.review_votes FOR DELETE USING (auth.uid() = user_id);

-- Tickets: reporters see their own, operators and admins see the queue --------
DROP POLICY IF EXISTS "Reporters and operators read tickets" ON public.tickets;
CREATE POLICY "Reporters and operators read tickets" ON public.tickets FOR SELECT
  USING (
    auth.uid() = reporter_id
    OR reporter_id = public.demo_persona_id()
    OR public.current_user_role() IN ('operator','admin')
  );
DROP POLICY IF EXISTS "Users report faults" ON public.tickets;
CREATE POLICY "Users report faults" ON public.tickets FOR INSERT WITH CHECK (auth.uid() = reporter_id);
DROP POLICY IF EXISTS "Operators update tickets" ON public.tickets;
CREATE POLICY "Operators update tickets" ON public.tickets FOR UPDATE
  USING (public.current_user_role() IN ('operator','admin'));

DROP POLICY IF EXISTS "Ticket events follow the ticket" ON public.ticket_events;
CREATE POLICY "Ticket events follow the ticket" ON public.ticket_events FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.tickets t WHERE t.id = ticket_id));
DROP POLICY IF EXISTS "Operators append ticket events" ON public.ticket_events;
CREATE POLICY "Operators append ticket events" ON public.ticket_events FOR INSERT
  WITH CHECK (public.current_user_role() IN ('operator','admin'));

-- Notifications --------------------------------------------------------------
DROP POLICY IF EXISTS "Users read their notifications" ON public.notifications;
CREATE POLICY "Users read their notifications" ON public.notifications FOR SELECT
  USING (
    auth.uid() = user_id
    OR user_id = public.demo_persona_id()
    OR (user_id IS NULL AND public.current_user_role() = ANY (roles))
  );
DROP POLICY IF EXISTS "Users read own receipts" ON public.notification_reads;
CREATE POLICY "Users read own receipts" ON public.notification_reads FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users write own receipts" ON public.notification_reads;
CREATE POLICY "Users write own receipts" ON public.notification_reads FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users clear own receipts" ON public.notification_reads;
CREATE POLICY "Users clear own receipts" ON public.notification_reads FOR DELETE USING (auth.uid() = user_id);

-- Wallet ---------------------------------------------------------------------
DROP POLICY IF EXISTS "Users read own wallet" ON public.wallet_accounts;
CREATE POLICY "Users read own wallet" ON public.wallet_accounts FOR SELECT
  USING (auth.uid() = user_id OR user_id = public.demo_persona_id());
DROP POLICY IF EXISTS "Users update own wallet" ON public.wallet_accounts;
CREATE POLICY "Users update own wallet" ON public.wallet_accounts FOR UPDATE
  USING (auth.uid() = user_id OR user_id = public.demo_persona_id());

DROP POLICY IF EXISTS "Users read own cards" ON public.payment_cards;
CREATE POLICY "Users read own cards" ON public.payment_cards FOR SELECT
  USING (auth.uid() = user_id OR user_id = public.demo_persona_id());
DROP POLICY IF EXISTS "Users manage own cards" ON public.payment_cards;
CREATE POLICY "Users manage own cards" ON public.payment_cards FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users read own transactions" ON public.transactions;
CREATE POLICY "Users read own transactions" ON public.transactions FOR SELECT
  USING (
    auth.uid() = user_id
    OR user_id = public.demo_persona_id()
    OR public.current_user_role() = 'admin'
  );
-- The demo persona's wallet is the one a brand-new account is shown, so the
-- ledger entry that pairs with a demo-wallet debit has to be allowed too.
DROP POLICY IF EXISTS "Users write own transactions" ON public.transactions;
CREATE POLICY "Users write own transactions" ON public.transactions FOR INSERT
  WITH CHECK (auth.uid() = user_id OR user_id = public.demo_persona_id());

-- Fleet: fleet managers and admins ------------------------------------------
DROP POLICY IF EXISTS "Fleet reads vehicles" ON public.fleet_vehicles;
CREATE POLICY "Fleet reads vehicles" ON public.fleet_vehicles FOR SELECT
  USING (public.current_user_role() IN ('fleet','admin'));
DROP POLICY IF EXISTS "Fleet reads drivers" ON public.fleet_drivers;
CREATE POLICY "Fleet reads drivers" ON public.fleet_drivers FOR SELECT
  USING (public.current_user_role() IN ('fleet','admin'));
DROP POLICY IF EXISTS "Fleet reads invoices" ON public.invoices;
CREATE POLICY "Fleet reads invoices" ON public.invoices FOR SELECT
  USING (public.current_user_role() IN ('fleet','admin'));
DROP POLICY IF EXISTS "Fleet settles invoices" ON public.invoices;
CREATE POLICY "Fleet settles invoices" ON public.invoices FOR UPDATE
  USING (public.current_user_role() IN ('fleet','admin'));
DROP POLICY IF EXISTS "Fleet reads schedule" ON public.charging_schedule;
CREATE POLICY "Fleet reads schedule" ON public.charging_schedule FOR SELECT
  USING (public.current_user_role() IN ('fleet','admin'));
DROP POLICY IF EXISTS "Fleet writes schedule" ON public.charging_schedule;
CREATE POLICY "Fleet writes schedule" ON public.charging_schedule FOR INSERT
  WITH CHECK (public.current_user_role() IN ('fleet','admin'));
DROP POLICY IF EXISTS "Fleet updates schedule" ON public.charging_schedule;
CREATE POLICY "Fleet updates schedule" ON public.charging_schedule FOR UPDATE
  USING (public.current_user_role() IN ('fleet','admin'));
DROP POLICY IF EXISTS "Fleet reads settings" ON public.fleet_settings;
CREATE POLICY "Fleet reads settings" ON public.fleet_settings FOR SELECT
  USING (public.current_user_role() IN ('fleet','admin'));

-- Managing the roster is the whole point of the fleet portal, so the same two
-- roles can add, edit and retire vehicles and drivers.
DROP POLICY IF EXISTS "Fleet writes vehicles" ON public.fleet_vehicles;
CREATE POLICY "Fleet writes vehicles" ON public.fleet_vehicles FOR INSERT
  WITH CHECK (public.current_user_role() IN ('fleet','admin'));
DROP POLICY IF EXISTS "Fleet updates vehicles" ON public.fleet_vehicles;
CREATE POLICY "Fleet updates vehicles" ON public.fleet_vehicles FOR UPDATE
  USING (public.current_user_role() IN ('fleet','admin'));
DROP POLICY IF EXISTS "Fleet retires vehicles" ON public.fleet_vehicles;
CREATE POLICY "Fleet retires vehicles" ON public.fleet_vehicles FOR DELETE
  USING (public.current_user_role() IN ('fleet','admin'));

DROP POLICY IF EXISTS "Fleet writes drivers" ON public.fleet_drivers;
CREATE POLICY "Fleet writes drivers" ON public.fleet_drivers FOR INSERT
  WITH CHECK (public.current_user_role() IN ('fleet','admin'));
DROP POLICY IF EXISTS "Fleet updates drivers" ON public.fleet_drivers;
CREATE POLICY "Fleet updates drivers" ON public.fleet_drivers FOR UPDATE
  USING (public.current_user_role() IN ('fleet','admin'));

-- Reporting ------------------------------------------------------------------
DROP POLICY IF EXISTS "Signed-in users read analytics" ON public.analytics_series;
CREATE POLICY "Signed-in users read analytics" ON public.analytics_series FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- Widen the init policies so demo data and back-office roles work -------------
DROP POLICY IF EXISTS "Users can view own sessions" ON public.sessions;
CREATE POLICY "Users can view own sessions" ON public.sessions FOR SELECT
  USING (
    auth.uid() = user_id
    OR user_id = public.demo_persona_id()
    OR public.current_user_role() IN ('operator','admin')
  );
DROP POLICY IF EXISTS "Users insert own sessions" ON public.sessions;
CREATE POLICY "Users insert own sessions" ON public.sessions FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users update own sessions" ON public.sessions;
CREATE POLICY "Users update own sessions" ON public.sessions FOR UPDATE
  USING (auth.uid() = user_id OR user_id = public.demo_persona_id());

DROP POLICY IF EXISTS "Users can view own reservations" ON public.reservations;
CREATE POLICY "Users can view own reservations" ON public.reservations FOR SELECT
  USING (
    auth.uid() = user_id
    OR user_id = public.demo_persona_id()
    OR public.current_user_role() IN ('operator','admin')
  );

DROP POLICY IF EXISTS "Users can view own waitlist" ON public.waitlists;
CREATE POLICY "Users can view own waitlist" ON public.waitlists FOR SELECT
  USING (
    auth.uid() = user_id
    OR user_id = public.demo_persona_id()
    OR public.current_user_role() IN ('operator','admin')
  );

-- Leaving a queue is a delete, which the init migration never granted.
DROP POLICY IF EXISTS "Users leave own waitlist" ON public.waitlists;
CREATE POLICY "Users leave own waitlist" ON public.waitlists FOR DELETE
  USING (auth.uid() = user_id OR user_id = public.demo_persona_id());

-- ---------------------------------------------------------------------------
-- Demo rows are writable, on purpose
--
-- Everything seeded by 20260821160000 belongs to a demo persona rather than to
-- whoever is signed in. Left read-only, every button in the app -- cancel a
-- reservation, leave a waitlist, stop a session -- would fail for a fresh
-- account, because the row it acts on is not theirs. The UPDATE and DELETE
-- policies above therefore also accept `user_id = demo_persona_id()`.
--
-- The consequence is that the demo dataset is shared mutable state: two people
-- signed in as drivers act on the same rows. That is the right trade for a
-- demonstration and the wrong one for production.
--
-- To lock it down, drop `OR user_id = public.demo_persona_id()` from every
-- UPDATE/DELETE policy in this file (the SELECT ones can stay -- reading the
-- demo data is harmless) and give each new account its own seed instead.
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Users can update own reservations" ON public.reservations;
CREATE POLICY "Users can update own reservations" ON public.reservations FOR UPDATE
  USING (
    auth.uid() = user_id
    OR user_id = public.demo_persona_id()
    -- The operator console confirms and cancels other people's bookings.
    OR public.current_user_role() IN ('operator','admin')
  );

DROP POLICY IF EXISTS "Users can update own waitlist" ON public.waitlists;
CREATE POLICY "Users can update own waitlist" ON public.waitlists FOR UPDATE
  USING (auth.uid() = user_id OR user_id = public.demo_persona_id());

-- Operators need write access to run the connector and station screens.
DROP POLICY IF EXISTS "Operators manage connectors" ON public.connectors;
CREATE POLICY "Operators manage connectors" ON public.connectors FOR UPDATE
  USING (public.current_user_role() IN ('operator','admin'));
DROP POLICY IF EXISTS "Operators add connectors" ON public.connectors;
CREATE POLICY "Operators add connectors" ON public.connectors FOR INSERT
  WITH CHECK (public.current_user_role() IN ('operator','admin'));
DROP POLICY IF EXISTS "Operators manage stations" ON public.stations;
CREATE POLICY "Operators manage stations" ON public.stations FOR UPDATE
  USING (public.current_user_role() IN ('operator','admin'));
DROP POLICY IF EXISTS "Operators add stations" ON public.stations;
CREATE POLICY "Operators add stations" ON public.stations FOR INSERT
  WITH CHECK (public.current_user_role() IN ('operator','admin'));

-- ---------------------------------------------------------------------------
-- 10b. Admin account actions
--
-- The admin console suspends accounts and removes them. Both change columns a
-- user must never be able to write on their own row -- and a column-level
-- GRANT cannot express "only when you are an admin", because the existing
-- "Users can update own profile" policy would then let anyone set their own
-- `role`. That is exactly the hole 20260821130000 closed.
--
-- So these run as SECURITY DEFINER functions that check the caller's role
-- themselves. No new column privileges are handed out.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.admin_set_user_status(target uuid, new_status user_status)
RETURNS public.profiles AS $$
DECLARE
  updated public.profiles;
BEGIN
  IF public.current_user_role() <> 'admin' THEN
    RAISE EXCEPTION 'Only administrators can change account status';
  END IF;
  UPDATE public.profiles SET status = new_status WHERE id = target RETURNING * INTO updated;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'No such account';
  END IF;
  RETURN updated;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.admin_set_user_role(target uuid, new_role user_role)
RETURNS public.profiles AS $$
DECLARE
  updated public.profiles;
BEGIN
  IF public.current_user_role() <> 'admin' THEN
    RAISE EXCEPTION 'Only administrators can change roles';
  END IF;
  UPDATE public.profiles SET role = new_role WHERE id = target RETURNING * INTO updated;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'No such account';
  END IF;
  RETURN updated;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Removes the profile and everything that cascades from it. The row in
-- auth.users survives: deleting a login needs the service-role key, which the
-- browser does not have. Do that from the dashboard, or from an edge function.
CREATE OR REPLACE FUNCTION public.admin_delete_profile(target uuid)
RETURNS void AS $$
BEGIN
  IF public.current_user_role() <> 'admin' THEN
    RAISE EXCEPTION 'Only administrators can remove accounts';
  END IF;
  IF target = auth.uid() THEN
    RAISE EXCEPTION 'You cannot remove your own account';
  END IF;
  DELETE FROM public.profiles WHERE id = target;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

REVOKE ALL ON FUNCTION public.admin_set_user_status(uuid, user_status) FROM public;
REVOKE ALL ON FUNCTION public.admin_set_user_role(uuid, user_role)     FROM public;
REVOKE ALL ON FUNCTION public.admin_delete_profile(uuid)               FROM public;
GRANT EXECUTE ON FUNCTION public.admin_set_user_status(uuid, user_status) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_set_user_role(uuid, user_role)     TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_delete_profile(uuid)               TO authenticated;

-- ---------------------------------------------------------------------------
-- 11. Grants
--
-- Same reasoning as 20260821140000: without these, PostgREST refuses before RLS
-- is ever consulted.
-- ---------------------------------------------------------------------------
GRANT USAGE ON SCHEMA public TO anon, authenticated;

GRANT SELECT ON
  public.reviews, public.reviews_with_stats, public.review_votes,
  public.posts, public.posts_with_stats, public.post_likes,
  public.products, public.product_categories,
  public.booking_slots, public.fault_categories, public.sla_policies,
  public.station_connector_groups
TO anon, authenticated;

GRANT SELECT ON
  public.tickets, public.ticket_events, public.notifications,
  public.notification_reads, public.wallet_accounts, public.payment_cards,
  public.transactions, public.fleet_settings, public.fleet_drivers,
  public.fleet_vehicles, public.invoices, public.charging_schedule,
  public.analytics_series, public.leaderboard
TO authenticated;

GRANT INSERT         ON public.reviews, public.posts, public.tickets, public.ticket_events TO authenticated;
GRANT INSERT, DELETE ON public.post_likes, public.review_votes, public.notification_reads  TO authenticated;
GRANT DELETE         ON public.waitlists                                                   TO authenticated;
GRANT INSERT         ON public.transactions, public.payment_cards                          TO authenticated;
GRANT INSERT, UPDATE ON public.charging_schedule                                           TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.fleet_vehicles                                      TO authenticated;
GRANT INSERT, UPDATE ON public.fleet_drivers                                               TO authenticated;
GRANT UPDATE         ON public.invoices                                                    TO authenticated;
GRANT INSERT, UPDATE ON public.products                                                    TO authenticated;
GRANT UPDATE         ON public.wallet_accounts, public.tickets                             TO authenticated;
GRANT UPDATE (rating, title, body) ON public.reviews   TO authenticated;
GRANT UPDATE (title, body, tag)    ON public.posts     TO authenticated;
GRANT INSERT, UPDATE ON public.sessions    TO authenticated;
GRANT INSERT, UPDATE ON public.connectors  TO authenticated;
GRANT INSERT, UPDATE ON public.stations    TO authenticated;
GRANT USAGE, SELECT  ON SEQUENCE public.ticket_events_id_seq TO authenticated;
