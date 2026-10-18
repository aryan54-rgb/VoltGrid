# Razorpay test-mode wallet funding

The app's wallet top-up flow uses Razorpay Standard Checkout, three Supabase
Edge Functions, and the `20261018140000_razorpay_wallet_topups.sql` migration.
The key secret and webhook secret stay on the server; the browser receives only
the public Key ID from `razorpay-create-order`.

## Current linked project

- The payment migration and all three Edge Functions have been deployed.
- Test Key ID, Test Key Secret, and a generated webhook secret have been saved
  as Supabase Edge Function secrets.
- The same secrets are in the ignored local file `supabase/functions/.env`.
- The downloaded Razorpay CSV is ignored by Git. Keep it private and delete it
  when it is no longer needed.

## Complete the Razorpay dashboard setup

In **Razorpay Test Mode**, open **Accounts & Settings → Webhooks → Add New
Webhook**. Set:

- **URL:** `https://zvurrntciayvbsaspzbz.supabase.co/functions/v1/razorpay-webhook`
- **Event:** `payment.captured`
- **Secret:** the value of `RAZORPAY_WEBHOOK_SECRET` in the ignored
  `supabase/functions/.env` file. It is a separate secret from the API Key
  Secret. Do not commit or share it.

The Razorpay dashboard may request its test-mode OTP. After saving, run a test
payment from **Driver → Wallet → Add funds**. The wallet and transaction ledger
should change only after Razorpay reports the payment as captured. Also test a
cancelled payment; it should leave the balance unchanged.

## Test-only currency note

The migration changes existing USD-labelled prototype wallet balances to INR
without changing their numeric value. This is appropriate for the current test
data, but real balances require a deliberate conversion and reconciliation plan
before any live-mode rollout.

Auto top-up and saved cards are not connected to Razorpay. The live Wallet UI
does not offer those prototype controls.
