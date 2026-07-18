
-- Fix update policy to include WITH CHECK explicitly
DROP POLICY IF EXISTS "Admin/Operador can update tickets" ON public.tickets;
CREATE POLICY "Admin/Operador can update tickets"
ON public.tickets FOR UPDATE TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'operador'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'operador'::app_role));

-- Transactional soft-delete RPC
CREATE OR REPLACE FUNCTION public.soft_delete_ticket(p_ticket_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_ticket_number text;
  v_user_id uuid;
  v_user_name text;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'not authenticated';
  END IF;
  IF NOT public.has_role(v_user_id, 'admin'::app_role) THEN
    RAISE EXCEPTION 'permission denied';
  END IF;

  SELECT ticket_number INTO v_ticket_number
  FROM public.tickets
  WHERE id = p_ticket_id AND deleted_at IS NULL;

  IF v_ticket_number IS NULL THEN
    RAISE EXCEPTION 'ticket not found or already deleted';
  END IF;

  SELECT display_name INTO v_user_name FROM public.profiles WHERE user_id = v_user_id;

  UPDATE public.tickets
     SET deleted_at = now(), updated_at = now()
   WHERE id = p_ticket_id AND deleted_at IS NULL;

  INSERT INTO public.ticket_history (ticket_id, user_id, user_name, action, description)
  VALUES (p_ticket_id, v_user_id, v_user_name, 'excluido', 'Chamado ' || v_ticket_number || ' excluído');

  RETURN v_ticket_number;
END;
$$;

REVOKE ALL ON FUNCTION public.soft_delete_ticket(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.soft_delete_ticket(uuid) TO authenticated;
