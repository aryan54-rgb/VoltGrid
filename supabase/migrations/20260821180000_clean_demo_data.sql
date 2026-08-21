-- ============================================================================
-- Clear the demo dataset
--
-- `20260821160000_phase2_seed.sql` populated the project with the fixture the
-- UI was designed around: 8 stations, ~70 connectors, a 14-person cast and all
-- of their sessions, reservations, reviews, tickets, transactions and charts.
-- This empties every one of those tables so real data can go in.
--
-- Idempotent: running it twice is a no-op the second time.
--
-- WHAT IS KEPT, AND WHY -------------------------------------------------------
--
-- Four tables are lookup configuration rather than demo business data, and
-- emptying them breaks screens rather than cleaning them:
--
--   booking_slots      the bookable time windows on /driver/stations/:id/book
--   fault_categories   the category dropdown on /driver/faults
--   product_categories the marketplace filter (and a FK target for products)
--   sla_policies       priority -> response-hours, read by the ticket trigger
--
-- To empty those too, uncomment the block at the bottom of this file. Section 4
-- of SUPABASE_HANDOVER.md has the INSERTs to put a fresh set back.
--
-- Real accounts (anything with a row in auth.users) are kept. Their wallet
-- balances and lifetime counters are reset, because the ledger behind them is
-- being deleted and a balance with no transactions is worse than no balance.
-- ============================================================================

BEGIN;

-- 1. Transactional and demo content ------------------------------------------
-- One statement so the foreign keys between these tables never matter. CASCADE
-- is belt-and-braces: every table that references one of these is already in
-- the list.

TRUNCATE TABLE
  -- network
  public.stations,
  public.connectors,
  public.sessions,
  public.reservations,
  public.waitlists,
  -- community
  public.reviews,
  public.review_votes,
  public.posts,
  public.post_likes,
  -- faults
  public.tickets,
  public.ticket_events,
  -- notifications
  public.notifications,
  public.notification_reads,
  -- money
  public.payment_cards,
  public.transactions,
  -- marketplace listings (product_categories deliberately survives)
  public.products,
  -- fleet
  public.fleet_settings,
  public.fleet_drivers,
  public.fleet_vehicles,
  public.invoices,
  public.charging_schedule,
  -- reporting snapshots
  public.analytics_series
RESTART IDENTITY CASCADE;

-- 2. The demo cast ------------------------------------------------------------
-- These 14 profiles have no login behind them. Four carry is_demo_persona,
-- which is what `demo_persona_id()` hands to every signed-in user -- so leaving
-- them in place would keep a brand-new account seeing someone else's history
-- no matter how much of the data above was cleared.
--
-- With them gone `demo_persona_id()` returns NULL, and `user_id = NULL` in the
-- RLS policies evaluates to NULL rather than true. The clause goes inert on its
-- own; no policy change is needed.
--
-- The NOT EXISTS arm also sweeps up any profile whose auth.users row was
-- deleted from the dashboard, which leaves an orphan behind.

DELETE FROM public.profiles p
WHERE p.is_demo
   OR NOT EXISTS (SELECT 1 FROM auth.users u WHERE u.id = p.id);

-- 3. Reset the surviving real accounts ----------------------------------------
-- `sessions`, `spend` and `points` are denormalised lifetime counters on the
-- profile; the rows they counted are gone.

UPDATE public.profiles
   SET sessions = 0,
       spend    = 0,
       points   = 0
 WHERE sessions <> 0 OR spend <> 0 OR points <> 0;

-- Wallet rows are created by the on_profile_created trigger, so they are not
-- truncated -- a real user losing their wallet row would break /driver/wallet.
-- They are reset to the trigger's defaults instead.

UPDATE public.wallet_accounts
   SET balance               = 0,
       auto_top_up           = false,
       auto_top_up_threshold = 20,
       auto_top_up_amount    = 50
 WHERE balance <> 0 OR auto_top_up;

COMMIT;

-- ============================================================================
-- OPTIONAL: empty the four lookup tables as well.
--
-- Only do this if you intend to insert your own booking windows, fault
-- categories, marketplace categories and SLA targets. Until you do, the booking
-- screen has no slots to offer and the fault form has an empty dropdown.
-- ============================================================================
-- BEGIN;
-- TRUNCATE TABLE
--   public.booking_slots,
--   public.fault_categories,
--   public.product_categories,
--   public.sla_policies
-- CASCADE;
-- COMMIT;

-- ============================================================================
-- Verify -- every count below should be 0.
-- ============================================================================
-- SELECT 'stations' AS table, count(*) FROM public.stations
-- UNION ALL SELECT 'connectors',   count(*) FROM public.connectors
-- UNION ALL SELECT 'sessions',     count(*) FROM public.sessions
-- UNION ALL SELECT 'reservations', count(*) FROM public.reservations
-- UNION ALL SELECT 'reviews',      count(*) FROM public.reviews
-- UNION ALL SELECT 'posts',        count(*) FROM public.posts
-- UNION ALL SELECT 'tickets',      count(*) FROM public.tickets
-- UNION ALL SELECT 'products',     count(*) FROM public.products
-- UNION ALL SELECT 'transactions', count(*) FROM public.transactions
-- UNION ALL SELECT 'demo profiles', count(*) FROM public.profiles WHERE is_demo;
