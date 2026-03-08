
CREATE OR REPLACE FUNCTION public.batch_update_priority_order(ids uuid[], orders int[])
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  FOR i IN 1..array_length(ids, 1) LOOP
    UPDATE public.computer_priorities SET ordem = orders[i] WHERE id = ids[i];
  END LOOP;
END;
$$;
