-- Booked charging sessions use a station-owner controlled meter and a driver-paid
-- wallet checkout. Money moves only in the payment function, atomically and once.
ALTER TABLE public.sessions ADD COLUMN IF NOT EXISTS reservation_id text REFERENCES public.reservations(id);
ALTER TABLE public.sessions ADD COLUMN IF NOT EXISTS price_per_kwh numeric;
ALTER TABLE public.sessions ADD COLUMN IF NOT EXISTS payment_status text NOT NULL DEFAULT 'unpaid';
UPDATE public.sessions SET payment_status='paid' WHERE status='completed' AND reservation_id IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS sessions_reservation_once_idx ON public.sessions(reservation_id) WHERE reservation_id IS NOT NULL;
REVOKE UPDATE ON public.sessions FROM authenticated;

CREATE OR REPLACE FUNCTION public.operator_start_booked_session(p_reservation_id text, p_session_id text, p_vehicle text DEFAULT 'EV', p_start_soc int DEFAULT 22, p_target_soc int DEFAULT 80)
RETURNS public.sessions LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE r public.reservations; s public.stations; created public.sessions;
BEGIN
  SELECT * INTO r FROM public.reservations WHERE id = p_reservation_id FOR UPDATE;
  IF NOT FOUND OR r.status <> 'RESERVED' THEN RAISE EXCEPTION 'Booking is not approved or has already started'; END IF;
  SELECT * INTO s FROM public.stations WHERE id = r.station_id;
  IF s.operator_id IS DISTINCT FROM auth.uid() THEN RAISE EXCEPTION 'This station is not yours'; END IF;
  IF r.connector_id IS NULL THEN RAISE EXCEPTION 'Booking has no assigned connector'; END IF;
  IF EXISTS (SELECT 1 FROM public.sessions WHERE connector_id = r.connector_id AND status = 'active') THEN
    RAISE EXCEPTION 'Connector is already charging';
  END IF;
  IF p_start_soc < 0 OR p_target_soc > 100 OR p_target_soc <= p_start_soc THEN RAISE EXCEPTION 'Invalid charge target'; END IF;
  INSERT INTO public.sessions(id,user_id,station_id,connector_id,reservation_id,vehicle,status,started_at,start_soc,current_soc,target_soc,power_kw,energy_kwh,cost,price_per_kwh,payment_status)
  SELECT p_session_id,r.user_id,r.station_id,r.connector_id,r.id,p_vehicle,'active',now(),p_start_soc,p_start_soc,p_target_soc,c.power_kw,0,0,s.price_per_kwh,'unpaid'
  FROM public.connectors c WHERE c.id = r.connector_id AND c.station_id = r.station_id
  RETURNING * INTO created;
  IF NOT FOUND THEN RAISE EXCEPTION 'Booking connector is invalid'; END IF;
  UPDATE public.reservations SET status = 'ACTIVE' WHERE id = r.id;
  RETURN created;
END $$;

CREATE OR REPLACE FUNCTION public.operator_meter_booked_session(p_session_id text, p_energy_kwh numeric, p_current_soc int)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE sess public.sessions;
BEGIN
  SELECT * INTO sess FROM public.sessions WHERE id = p_session_id FOR UPDATE;
  IF NOT FOUND OR sess.status <> 'active' OR sess.reservation_id IS NULL THEN RETURN; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.stations WHERE id = sess.station_id AND operator_id = auth.uid()) THEN RAISE EXCEPTION 'This station is not yours'; END IF;
  IF p_energy_kwh < sess.energy_kwh OR p_energy_kwh > sess.energy_kwh + 20 OR p_current_soc < sess.current_soc OR p_current_soc > sess.target_soc THEN
    RAISE EXCEPTION 'Invalid meter reading';
  END IF;
  UPDATE public.sessions SET energy_kwh = round(p_energy_kwh, 3), cost = round(p_energy_kwh * price_per_kwh, 2), current_soc = p_current_soc
  WHERE id = p_session_id;
END $$;

CREATE OR REPLACE FUNCTION public.operator_finish_booked_session(p_session_id text, p_energy_kwh numeric, p_current_soc int)
RETURNS public.sessions LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE sess public.sessions; finished public.sessions;
BEGIN
  SELECT * INTO sess FROM public.sessions WHERE id = p_session_id FOR UPDATE;
  IF NOT FOUND OR sess.reservation_id IS NULL THEN RAISE EXCEPTION 'No booked session'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.stations WHERE id = sess.station_id AND operator_id = auth.uid()) THEN RAISE EXCEPTION 'This station is not yours'; END IF;
  IF sess.status = 'completed' THEN RETURN sess; END IF;
  IF sess.status <> 'active' THEN RAISE EXCEPTION 'Session is not active'; END IF;
  IF p_energy_kwh < sess.energy_kwh OR p_energy_kwh > sess.energy_kwh + 20 OR p_current_soc < sess.current_soc OR p_current_soc > sess.target_soc THEN
    RAISE EXCEPTION 'Invalid meter reading';
  END IF;
  UPDATE public.sessions SET status='completed', ended_at=now(), energy_kwh=round(p_energy_kwh,3), cost=round(p_energy_kwh * price_per_kwh,2), current_soc=p_current_soc
  WHERE id=p_session_id RETURNING * INTO finished;
  UPDATE public.reservations SET status='EXPIRED' WHERE id=sess.reservation_id;
  RETURN finished;
END $$;

CREATE OR REPLACE FUNCTION public.pay_charging_session(p_session_id text)
RETURNS public.sessions LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE sess public.sessions; wallet public.wallet_accounts; paid public.sessions;
BEGIN
  SELECT * INTO sess FROM public.sessions WHERE id=p_session_id FOR UPDATE;
  IF NOT FOUND OR sess.user_id IS DISTINCT FROM auth.uid() THEN RAISE EXCEPTION 'Session not found'; END IF;
  IF sess.status <> 'completed' THEN RAISE EXCEPTION 'Charging must finish before payment'; END IF;
  IF sess.payment_status = 'paid' THEN RETURN sess; END IF;
  SELECT * INTO wallet FROM public.wallet_accounts WHERE user_id=auth.uid() FOR UPDATE;
  IF NOT FOUND OR wallet.balance < sess.cost THEN RAISE EXCEPTION 'Insufficient wallet balance'; END IF;
  UPDATE public.wallet_accounts SET balance=balance-sess.cost WHERE user_id=auth.uid();
  IF sess.cost > 0 THEN
    INSERT INTO public.transactions(id,user_id,type,description,amount,status,method)
    VALUES ('charge-'||sess.id,auth.uid(),'purchase','Charging at '||(SELECT name FROM public.stations WHERE id=sess.station_id),-sess.cost,'completed','Wallet');
  END IF;
  UPDATE public.sessions SET payment_status='paid' WHERE id=p_session_id RETURNING * INTO paid;
  RETURN paid;
END $$;

REVOKE ALL ON FUNCTION public.operator_start_booked_session(text,text,text,int,int) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.operator_meter_booked_session(text,numeric,int) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.operator_finish_booked_session(text,numeric,int) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.pay_charging_session(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.operator_start_booked_session(text,text,text,int,int) TO authenticated;
GRANT EXECUTE ON FUNCTION public.operator_meter_booked_session(text,numeric,int) TO authenticated;
GRANT EXECUTE ON FUNCTION public.operator_finish_booked_session(text,numeric,int) TO authenticated;
GRANT EXECUTE ON FUNCTION public.pay_charging_session(text) TO authenticated;
