-- A station belongs to the account that commissioned it. Existing stations
-- remain unassigned until an administrator explicitly assigns them.
ALTER TABLE public.stations
  ADD COLUMN IF NOT EXISTS operator_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS stations_operator_id_idx ON public.stations(operator_id);

ALTER TABLE public.stations ALTER COLUMN operator_id SET DEFAULT auth.uid();

-- Drivers and guests still need the public charging catalogue. Operators may
-- only see their own sites, including when querying Supabase outside the UI.
DROP POLICY IF EXISTS "Anyone can view stations" ON public.stations;
CREATE POLICY "Station catalogue and owned sites" ON public.stations FOR SELECT
  USING (public.current_user_role() IS DISTINCT FROM 'operator' OR operator_id = auth.uid());

DROP POLICY IF EXISTS "Operators manage stations" ON public.stations;
CREATE POLICY "Operators manage owned stations" ON public.stations FOR UPDATE
  USING (public.current_user_role() = 'admin' OR
    (public.current_user_role() = 'operator' AND operator_id = auth.uid()))
  WITH CHECK (public.current_user_role() = 'admin' OR
    (public.current_user_role() = 'operator' AND operator_id = auth.uid()));

DROP POLICY IF EXISTS "Operators add stations" ON public.stations;
CREATE POLICY "Operators add owned stations" ON public.stations FOR INSERT
  WITH CHECK (public.current_user_role() = 'admin' OR
    (public.current_user_role() = 'operator' AND operator_id = auth.uid()));

DROP POLICY IF EXISTS "Anyone can view connectors" ON public.connectors;
CREATE POLICY "Public catalogue and owned connectors" ON public.connectors FOR SELECT
  USING (public.current_user_role() IS DISTINCT FROM 'operator' OR
    EXISTS (SELECT 1 FROM public.stations s WHERE s.id = station_id AND s.operator_id = auth.uid()));

DROP POLICY IF EXISTS "Operators manage connectors" ON public.connectors;
CREATE POLICY "Operators manage owned connectors" ON public.connectors FOR UPDATE
  USING (public.current_user_role() = 'admin' OR
    (public.current_user_role() = 'operator' AND EXISTS
      (SELECT 1 FROM public.stations s WHERE s.id = station_id AND s.operator_id = auth.uid())))
  WITH CHECK (public.current_user_role() = 'admin' OR
    (public.current_user_role() = 'operator' AND EXISTS
      (SELECT 1 FROM public.stations s WHERE s.id = station_id AND s.operator_id = auth.uid())));

DROP POLICY IF EXISTS "Operators add connectors" ON public.connectors;
CREATE POLICY "Operators add owned connectors" ON public.connectors FOR INSERT
  WITH CHECK (public.current_user_role() = 'admin' OR
    (public.current_user_role() = 'operator' AND EXISTS
      (SELECT 1 FROM public.stations s WHERE s.id = station_id AND s.operator_id = auth.uid())));

DROP POLICY IF EXISTS "Users can view own sessions" ON public.sessions;
CREATE POLICY "Users and station owners view sessions" ON public.sessions FOR SELECT
  USING (auth.uid() = user_id OR
    (user_id = public.demo_persona_id() AND public.current_user_role() IS DISTINCT FROM 'operator') OR
    public.current_user_role() = 'admin' OR
    (public.current_user_role() = 'operator' AND EXISTS
      (SELECT 1 FROM public.stations s WHERE s.id = station_id AND s.operator_id = auth.uid())));

DROP POLICY IF EXISTS "Users can view own reservations" ON public.reservations;
CREATE POLICY "Users and station owners view reservations" ON public.reservations FOR SELECT
  USING (auth.uid() = user_id OR
    (user_id = public.demo_persona_id() AND public.current_user_role() IS DISTINCT FROM 'operator') OR
    public.current_user_role() = 'admin' OR
    (public.current_user_role() = 'operator' AND EXISTS
      (SELECT 1 FROM public.stations s WHERE s.id = station_id AND s.operator_id = auth.uid())));

DROP POLICY IF EXISTS "Users can update own reservations" ON public.reservations;
CREATE POLICY "Users and station owners update reservations" ON public.reservations FOR UPDATE
  USING (auth.uid() = user_id OR
    (user_id = public.demo_persona_id() AND public.current_user_role() IS DISTINCT FROM 'operator') OR
    public.current_user_role() = 'admin' OR
    (public.current_user_role() = 'operator' AND EXISTS
      (SELECT 1 FROM public.stations s WHERE s.id = station_id AND s.operator_id = auth.uid())))
  WITH CHECK (auth.uid() = user_id OR
    (user_id = public.demo_persona_id() AND public.current_user_role() IS DISTINCT FROM 'operator') OR
    public.current_user_role() = 'admin' OR
    (public.current_user_role() = 'operator' AND EXISTS
      (SELECT 1 FROM public.stations s WHERE s.id = station_id AND s.operator_id = auth.uid())));

DROP POLICY IF EXISTS "Reporters and operators read tickets" ON public.tickets;
CREATE POLICY "Reporters and station owners read tickets" ON public.tickets FOR SELECT
  USING (auth.uid() = reporter_id OR
    (reporter_id = public.demo_persona_id() AND public.current_user_role() IS DISTINCT FROM 'operator') OR
    public.current_user_role() = 'admin' OR
    (public.current_user_role() = 'operator' AND EXISTS
      (SELECT 1 FROM public.stations s WHERE s.id = station_id AND s.operator_id = auth.uid())));

DROP POLICY IF EXISTS "Operators update tickets" ON public.tickets;
CREATE POLICY "Station owners update tickets" ON public.tickets FOR UPDATE
  USING (public.current_user_role() = 'admin' OR
    (public.current_user_role() = 'operator' AND EXISTS
      (SELECT 1 FROM public.stations s WHERE s.id = station_id AND s.operator_id = auth.uid())))
  WITH CHECK (public.current_user_role() = 'admin' OR
    (public.current_user_role() = 'operator' AND EXISTS
      (SELECT 1 FROM public.stations s WHERE s.id = station_id AND s.operator_id = auth.uid())));

DROP POLICY IF EXISTS "Operators append ticket events" ON public.ticket_events;
CREATE POLICY "Station owners append ticket events" ON public.ticket_events FOR INSERT
  WITH CHECK (public.current_user_role() = 'admin' OR
    (public.current_user_role() = 'operator' AND EXISTS
      (SELECT 1 FROM public.tickets t JOIN public.stations s ON s.id = t.station_id
       WHERE t.id = ticket_id AND s.operator_id = auth.uid())));

-- Make the connector aggregation obey the caller's connector SELECT policy.
ALTER VIEW public.station_connector_groups SET (security_invoker = true);

DROP POLICY IF EXISTS "Signed-in users read analytics" ON public.analytics_series;
CREATE POLICY "Non-operators read platform snapshots" ON public.analytics_series FOR SELECT
  USING (auth.uid() IS NOT NULL AND public.current_user_role() IS DISTINCT FROM 'operator');

-- A normal account cannot transfer a station by editing its owner field.
REVOKE UPDATE ON public.stations FROM authenticated;
GRANT UPDATE (price_per_kwh, status, latitude, longitude) ON public.stations TO authenticated;
