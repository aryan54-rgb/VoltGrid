-- Run with `supabase db query --linked --file scripts/qa-kiosk-transaction.sql`.
-- Every row and wallet change is rolled back at the end.
BEGIN;

INSERT INTO public.reservations(id,user_id,station_id,connector_id,date,start_time,end_time,status)
SELECT 'RS-KIOSK-QA-ROLLBACK', p.id, s.id, c.id, current_date + 90, '12:00', '12:30', 'RESERVED'
FROM public.stations s
JOIN public.connectors c ON c.station_id=s.id
CROSS JOIN (SELECT id FROM public.profiles WHERE role='driver' LIMIT 1) p
WHERE s.operator_id IS NOT NULL
LIMIT 1;

UPDATE public.wallet_accounts SET balance=balance+100
WHERE user_id=(SELECT user_id FROM public.reservations WHERE id='RS-KIOSK-QA-ROLLBACK');

SELECT set_config('request.jwt.claim.sub', s.operator_id::text, true)
FROM public.reservations r JOIN public.stations s ON s.id=r.station_id
WHERE r.id='RS-KIOSK-QA-ROLLBACK';
SET LOCAL ROLE authenticated;

SELECT id, reservation_id, price_per_kwh FROM public.operator_start_booked_session('RS-KIOSK-QA-ROLLBACK','cs-kiosk-qa-rollback','QA EV',22,80);
SELECT public.operator_meter_booked_session('cs-kiosk-qa-rollback',0.5,23);
SELECT id, energy_kwh, cost, payment_status FROM public.operator_finish_booked_session('cs-kiosk-qa-rollback',1,24);
RESET ROLE;

SELECT set_config('request.jwt.claim.sub', user_id::text, true)
FROM public.reservations WHERE id='RS-KIOSK-QA-ROLLBACK';
SET LOCAL ROLE authenticated;
SELECT id, payment_status FROM public.pay_charging_session('cs-kiosk-qa-rollback');
SELECT id, payment_status FROM public.pay_charging_session('cs-kiosk-qa-rollback');
ROLLBACK;
