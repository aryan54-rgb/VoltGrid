-- Restore the booking alert trigger on projects whose migration history was
-- repaired, and fill in alerts for requests still awaiting operator action.
CREATE OR REPLACE FUNCTION public.notify_operators_of_booking()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.status = 'PENDING' THEN
    INSERT INTO public.notifications (id, user_id, roles, type, title, body)
    SELECT 'NT-' || NEW.id, NULL, ARRAY['operator']::public.user_role[],
      'booking', 'New booking request',
      format('A driver has requested %s on %s. Approve or decline it on the Reservations board.',
        s.name, to_char(NEW.date + NEW.start_time, 'FMDay FMDD FMMon, FMHH12:MI AM'))
    FROM public.stations s WHERE s.id = NEW.station_id
    ON CONFLICT (id) DO NOTHING;
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS reservations_notify_operators ON public.reservations;
CREATE TRIGGER reservations_notify_operators
  AFTER INSERT ON public.reservations
  FOR EACH ROW EXECUTE FUNCTION public.notify_operators_of_booking();

INSERT INTO public.notifications (id, user_id, roles, type, title, body)
SELECT 'NT-' || r.id, NULL, ARRAY['operator']::public.user_role[],
  'booking', 'New booking request',
  format('A driver has requested %s on %s. Approve or decline it on the Reservations board.',
    s.name, to_char(r.date + r.start_time, 'FMDay FMDD FMMon, FMHH12:MI AM'))
FROM public.reservations r
JOIN public.stations s ON s.id = r.station_id
WHERE r.status = 'PENDING'
ON CONFLICT (id) DO NOTHING;
