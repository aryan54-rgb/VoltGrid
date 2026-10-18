ALTER TABLE public.stations
  ADD CONSTRAINT stations_price_nonnegative CHECK (price_per_kwh >= 0);

ALTER TABLE public.sessions
  ADD CONSTRAINT sessions_meter_nonnegative CHECK (energy_kwh >= 0 AND cost >= 0);
