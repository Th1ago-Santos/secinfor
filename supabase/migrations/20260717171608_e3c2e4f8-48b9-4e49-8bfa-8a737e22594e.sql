
CREATE OR REPLACE FUNCTION public.generate_ticket_number()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  yr text;
  seq_val bigint;
BEGIN
  IF NEW.ticket_number IS NULL OR NEW.ticket_number = '' THEN
    yr := to_char(COALESCE(NEW.created_at, now()), 'YYYY');
    seq_val := nextval('public.ticket_number_seq');
    NEW.ticket_number := yr || '-' || LPAD(seq_val::text, 6, '0');
  END IF;
  RETURN NEW;
END;
$$;
