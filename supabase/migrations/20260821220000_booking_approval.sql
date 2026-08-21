-- ============================================================================
-- Booking approval: tell the operators a request is waiting
--
-- THE PROBLEM
--
-- A driver's booking now lands as PENDING instead of RESERVED, so a bay is only
-- held once an operator confirms it on /operator/reservations. That is useless
-- if nothing tells the operator the request exists.
--
-- WHY THIS IS NOT AN INSERT IN THE CLIENT
--
-- `src/lib/api/reservations.js` cannot write the notification itself. Two
-- independent things stop it, and only one of them is a mistake:
--
--   1. `notifications` has no INSERT grant. 20260821150000 granted INSERT on
--      `notification_reads` (the per-user receipt table) and deliberately not on
--      `notifications` itself. A client insert fails with 42501.
--   2. `notifications` has an RLS SELECT policy and no INSERT policy at all, so
--      even with the grant the row is refused.
--
-- Granting both would let ANY signed-in user insert a broadcast with
-- `roles = ['operator','admin']` and a title and body of their choosing --
-- notification spoofing, addressed to exactly the people who act on them. The
-- fix is the pattern `complete_onboarding()` already uses for "the client needs
-- one privileged write, under a precondition it cannot forge": a SECURITY
-- DEFINER routine that does the write itself.
--
-- Here it is a trigger rather than an RPC, which buys three things:
--
--   - the body is built from the row that was actually inserted, so there is
--     nothing for a caller to spoof;
--   - it is in the same transaction as the INSERT, so a reservation can never
--     exist without its notification, and a failed notification rolls the
--     booking back rather than losing it silently;
--   - it fires for every path that books -- the driver app today, the operator
--     console or an import tomorrow.
--
-- Idempotent.
-- ============================================================================

BEGIN;

CREATE OR REPLACE FUNCTION public.notify_operators_of_booking()
RETURNS trigger AS $$
DECLARE
  station_label text;
BEGIN
  -- Only a request awaiting approval is worth waking anyone for. An operator
  -- confirming a booking writes RESERVED and must not notify anybody.
  IF NEW.status IS DISTINCT FROM 'PENDING' THEN
    RETURN NEW;
  END IF;

  -- The name the operator knows the site by; the id is a poor second.
  SELECT s.name INTO station_label FROM public.stations s WHERE s.id = NEW.station_id;

  INSERT INTO public.notifications (id, user_id, roles, type, title, body)
  VALUES (
    -- Derived from the reservation, so it is unique without a clock and the
    -- notification can be traced back to what caused it.
    'NT-' || NEW.id,
    -- NULL user_id plus a roles array is what makes this a broadcast: the
    -- SELECT policy shows it to whoever currently holds one of these roles.
    NULL,
    ARRAY['operator']::user_role[],
    'booking',
    'New booking request',
    format(
      'A driver has requested %s on %s. Approve or decline it on the Reservations board.',
      COALESCE(station_label, NEW.station_id),
      -- date + time is a timestamp, which to_char definitely accepts. Formatting
      -- a bare TIME leans on an implicit cast to interval; not worth the risk.
      to_char(NEW.date + NEW.start_time, 'FMDay FMDD FMMon, FMHH12:MI AM')
    )
  )
  ON CONFLICT (id) DO NOTHING;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

COMMENT ON FUNCTION public.notify_operators_of_booking() IS
  'AFTER INSERT on reservations: broadcasts a PENDING booking to the operator role. SECURITY DEFINER because notifications is intentionally not client-writable -- see 20260821220000.';

DROP TRIGGER IF EXISTS reservations_notify_operators ON public.reservations;
CREATE TRIGGER reservations_notify_operators
  AFTER INSERT ON public.reservations
  FOR EACH ROW EXECUTE FUNCTION public.notify_operators_of_booking();

COMMIT;

-- ============================================================================
-- Verify
-- ============================================================================
-- -- Should be exactly one row:
-- SELECT tgname FROM pg_trigger WHERE tgname = 'reservations_notify_operators';
--
-- -- After a driver books in the app, the request and its broadcast:
-- SELECT r.id, r.status, n.title, n.body
--   FROM public.reservations r
--   LEFT JOIN public.notifications n ON n.id = 'NT-' || r.id
--  WHERE r.status = 'PENDING'
--  ORDER BY r.created_at DESC;
--
-- -- What an operator's bell will show (run while signed in as one):
-- SELECT title, body, created_at FROM public.notifications
--  WHERE user_id IS NULL AND 'operator' = ANY (roles)
--  ORDER BY created_at DESC;
