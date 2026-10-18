-- Immediate booking uses India local time and checks the actual bay state.
-- The request RPC rechecks under a station lock so two simultaneous requests
-- through this path cannot claim the same charger.
CREATE OR REPLACE FUNCTION public.book_now_availability(
  p_station_id text,
  p_connector_type text DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_start timestamp := date_trunc('minute', timezone('Asia/Kolkata', now()));
  v_end timestamp;
  v_total integer;
  v_free integer;
  v_station_status public.station_status;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Sign in required'; END IF;
  v_end := v_start + interval '30 minutes';
  SELECT status INTO v_station_status FROM public.stations WHERE id = p_station_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Station not found'; END IF;

  SELECT count(*)::int,
         count(*) FILTER (WHERE v_station_status IN ('online', 'in-use')
           AND c.status = 'AVAILABLE'
           AND NOT EXISTS (
             SELECT 1 FROM public.sessions s
             WHERE s.connector_id = c.id AND s.status = 'active'
           )
           AND NOT EXISTS (
             SELECT 1 FROM public.reservations r
             WHERE r.station_id = p_station_id
               AND (r.connector_id = c.id OR r.connector_id IS NULL)
               AND r.status IN ('PENDING', 'RESERVED', 'ACTIVE')
               AND (r.date + r.start_time) < v_end
               AND (r.date + r.end_time + CASE WHEN r.end_time <= r.start_time
                 THEN interval '1 day' ELSE interval '0 day' END) > v_start
           ))::int
  INTO v_total, v_free
  FROM public.connectors c
  WHERE c.station_id = p_station_id
    AND (p_connector_type IS NULL OR c.type = p_connector_type);

  RETURN jsonb_build_object('total', v_total, 'free', v_free,
    'stationStatus', v_station_status, 'checkedAt', now());
END $$;

CREATE OR REPLACE FUNCTION public.request_book_now(
  p_station_id text,
  p_connector_type text
) RETURNS public.reservations
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_start timestamp := date_trunc('minute', timezone('Asia/Kolkata', now()));
  v_end timestamp;
  v_bay public.connectors;
  v_reservation public.reservations;
BEGIN
  IF auth.uid() IS NULL OR public.current_user_role() <> 'driver' THEN
    RAISE EXCEPTION 'Driver sign-in required';
  END IF;
  IF p_connector_type IS NULL OR btrim(p_connector_type) = '' THEN
    RAISE EXCEPTION 'Choose a connector type';
  END IF;
  v_end := v_start + interval '30 minutes';

  -- Serialise immediate requests for this station, then recheck the live data.
  PERFORM pg_advisory_xact_lock(hashtext(p_station_id));
  IF NOT EXISTS (SELECT 1 FROM public.stations
                 WHERE id = p_station_id AND status IN ('online', 'in-use')) THEN
    RAISE EXCEPTION 'Station is not available right now';
  END IF;
  IF EXISTS (
    SELECT 1 FROM public.reservations r
    WHERE r.user_id = auth.uid() AND r.station_id = p_station_id
      AND r.status IN ('PENDING', 'RESERVED', 'ACTIVE')
      AND (r.date + r.start_time) < v_end
      AND (r.date + r.end_time + CASE WHEN r.end_time <= r.start_time
        THEN interval '1 day' ELSE interval '0 day' END) > v_start
  ) THEN RAISE EXCEPTION 'You already have a booking at this station right now'; END IF;

  SELECT c.* INTO v_bay FROM public.connectors c
  WHERE c.station_id = p_station_id AND c.type = p_connector_type
    AND c.status = 'AVAILABLE'
    AND NOT EXISTS (
      SELECT 1 FROM public.sessions s
      WHERE s.connector_id = c.id AND s.status = 'active'
    )
    AND NOT EXISTS (
      SELECT 1 FROM public.reservations r
      WHERE r.station_id = p_station_id
        AND (r.connector_id = c.id OR r.connector_id IS NULL)
        AND r.status IN ('PENDING', 'RESERVED', 'ACTIVE')
        AND (r.date + r.start_time) < v_end
        AND (r.date + r.end_time + CASE WHEN r.end_time <= r.start_time
          THEN interval '1 day' ELSE interval '0 day' END) > v_start
    )
  ORDER BY c.label LIMIT 1;
  IF NOT FOUND THEN RAISE EXCEPTION 'No free charger of this type right now'; END IF;

  INSERT INTO public.reservations
    (id, user_id, station_id, connector_id, date, start_time, end_time, status)
  VALUES
    ('RS-' || replace(gen_random_uuid()::text, '-', ''), auth.uid(), p_station_id,
     v_bay.id, v_start::date, v_start::time, v_end::time, 'PENDING')
  RETURNING * INTO v_reservation;
  RETURN v_reservation;
END $$;

REVOKE ALL ON FUNCTION public.book_now_availability(text,text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.request_book_now(text,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.book_now_availability(text,text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.request_book_now(text,text) TO authenticated;
