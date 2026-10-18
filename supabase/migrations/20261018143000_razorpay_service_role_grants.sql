-- The service role bypasses RLS, but it still needs table privileges granted.
GRANT SELECT ON public.wallet_accounts TO service_role;
GRANT SELECT, INSERT ON public.razorpay_topups TO service_role;
