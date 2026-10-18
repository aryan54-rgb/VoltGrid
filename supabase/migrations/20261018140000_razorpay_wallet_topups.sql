-- Test-mode Razorpay wallet funding. Existing prototype amounts are relabelled
-- as INR for this test environment; migrate real balances separately.
ALTER TABLE public.wallet_accounts ALTER COLUMN currency SET DEFAULT 'INR';
UPDATE public.wallet_accounts SET currency = 'INR' WHERE currency = 'USD';

CREATE TABLE IF NOT EXISTS public.razorpay_topups (
  order_id text PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  amount_paise integer NOT NULL CHECK (amount_paise > 0),
  currency text NOT NULL DEFAULT 'INR' CHECK (currency = 'INR'),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid')),
  payment_id text UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now(),
  paid_at timestamptz
);
CREATE INDEX IF NOT EXISTS razorpay_topups_user_idx ON public.razorpay_topups(user_id, created_at DESC);
ALTER TABLE public.razorpay_topups ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.razorpay_topups FROM anon, authenticated;

-- Browser clients must never write monetary balances or ledger entries.
REVOKE UPDATE ON public.wallet_accounts FROM authenticated;
REVOKE INSERT ON public.transactions FROM authenticated;
DROP POLICY IF EXISTS "Users write own transactions" ON public.transactions;
DROP POLICY IF EXISTS "Users update own wallet" ON public.wallet_accounts;

CREATE OR REPLACE FUNCTION public.update_wallet_preferences(
  p_enabled boolean,
  p_threshold numeric DEFAULT NULL,
  p_amount numeric DEFAULT NULL
) RETURNS public.wallet_accounts
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE updated public.wallet_accounts;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Sign in required'; END IF;
  IF p_threshold IS NOT NULL AND p_threshold < 0 THEN RAISE EXCEPTION 'Invalid threshold'; END IF;
  IF p_amount IS NOT NULL AND p_amount <= 0 THEN RAISE EXCEPTION 'Invalid amount'; END IF;
  UPDATE public.wallet_accounts
  SET auto_top_up = p_enabled,
      auto_top_up_threshold = COALESCE(p_threshold, auto_top_up_threshold),
      auto_top_up_amount = COALESCE(p_amount, auto_top_up_amount)
  WHERE user_id = auth.uid() RETURNING * INTO updated;
  IF NOT FOUND THEN RAISE EXCEPTION 'Wallet not found'; END IF;
  RETURN updated;
END $$;
REVOKE ALL ON FUNCTION public.update_wallet_preferences(boolean,numeric,numeric) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.update_wallet_preferences(boolean,numeric,numeric) TO authenticated;

-- Called only after server-side Razorpay verification. Row locking and the
-- pending -> paid transition make callback/webhook retries safe.
CREATE OR REPLACE FUNCTION public.credit_razorpay_topup(
  p_order_id text,
  p_payment_id text,
  p_amount_paise integer,
  p_currency text
) RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE topup public.razorpay_topups;
BEGIN
  SELECT * INTO topup FROM public.razorpay_topups WHERE order_id = p_order_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Unknown top-up order'; END IF;
  IF topup.amount_paise <> p_amount_paise OR topup.currency <> p_currency THEN
    RAISE EXCEPTION 'Top-up amount or currency mismatch';
  END IF;
  IF topup.status = 'paid' THEN
    IF topup.payment_id <> p_payment_id THEN RAISE EXCEPTION 'Order paid by a different payment'; END IF;
    RETURN false;
  END IF;
  IF EXISTS (SELECT 1 FROM public.razorpay_topups WHERE payment_id = p_payment_id) THEN
    RAISE EXCEPTION 'Payment already used';
  END IF;
  UPDATE public.wallet_accounts SET balance = balance + p_amount_paise / 100.0
  WHERE user_id = topup.user_id AND currency = p_currency;
  IF NOT FOUND THEN RAISE EXCEPTION 'Wallet currency mismatch'; END IF;
  INSERT INTO public.transactions(id, user_id, type, description, amount, status, method)
  VALUES ('rzp-' || p_payment_id, topup.user_id, 'topup', 'Razorpay wallet top-up',
          p_amount_paise / 100.0, 'completed', 'Razorpay');
  UPDATE public.razorpay_topups
  SET status = 'paid', payment_id = p_payment_id, paid_at = now()
  WHERE order_id = p_order_id;
  RETURN true;
END $$;
REVOKE ALL ON FUNCTION public.credit_razorpay_topup(text,text,integer,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.credit_razorpay_topup(text,text,integer,text) TO service_role;
