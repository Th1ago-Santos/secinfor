
-- 1) Storage: remove anon SELECT policy on notebook-photos; access goes through edge function
DROP POLICY IF EXISTS "Public can view notebook photos for QR lookup" ON storage.objects;

-- 2) Tickets: remove anon SELECT policy; add public lookup RPC returning limited fields
DROP POLICY IF EXISTS "Anyone can view non-deleted tickets" ON public.tickets;
DROP POLICY IF EXISTS "Public can view tickets for QR lookup" ON public.tickets;
DROP POLICY IF EXISTS "Anon can view tickets" ON public.tickets;

CREATE OR REPLACE FUNCTION public.lookup_ticket_public(p_ticket_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result jsonb;
BEGIN
  SELECT jsonb_build_object(
    'id', t.id,
    'ticket_number', t.ticket_number,
    'subject', t.subject,
    'description', t.description,
    'priority', t.priority,
    'client_section_name', t.client_section_name,
    'plate_name', t.plate_name,
    'equipment_type', t.equipment_type,
    'equipment_patrimonio', t.equipment_patrimonio,
    'created_at', t.created_at,
    'closed_at', t.closed_at,
    'queue_name', q.name,
    'status_name', s.name,
    'status_color', s.color
  ) INTO result
  FROM public.tickets t
  LEFT JOIN public.ticket_queues q ON q.id = t.queue_id
  LEFT JOIN public.ticket_statuses s ON s.id = t.status_id
  WHERE t.id = p_ticket_id AND t.deleted_at IS NULL;
  RETURN result;
END;
$$;

REVOKE ALL ON FUNCTION public.lookup_ticket_public(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.lookup_ticket_public(uuid) TO anon, authenticated;

-- 3) inventory_items / inventory_sessions: scope SELECT to owner or admin
DROP POLICY IF EXISTS "Authenticated can view inventory items" ON public.inventory_items;
DROP POLICY IF EXISTS "inventory_items_select" ON public.inventory_items;
DROP POLICY IF EXISTS "Anyone authenticated can view inventory items" ON public.inventory_items;
CREATE POLICY "Owners or admins can view inventory items"
  ON public.inventory_items FOR SELECT
  TO authenticated
  USING (usuario_id = auth.uid() OR public.has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Authenticated can view inventory sessions" ON public.inventory_sessions;
DROP POLICY IF EXISTS "inventory_sessions_select" ON public.inventory_sessions;
DROP POLICY IF EXISTS "Anyone authenticated can view inventory sessions" ON public.inventory_sessions;
CREATE POLICY "Owners or admins can view inventory sessions"
  ON public.inventory_sessions FOR SELECT
  TO authenticated
  USING (usuario_id = auth.uid() OR public.has_role(auth.uid(), 'admin'::app_role));

-- 4) ticket_history: restrict SELECT to authenticated only
DROP POLICY IF EXISTS "Anyone can view ticket history" ON public.ticket_history;
DROP POLICY IF EXISTS "Public can view ticket history" ON public.ticket_history;
CREATE POLICY "Authenticated can view ticket history"
  ON public.ticket_history FOR SELECT
  TO authenticated
  USING (true);

-- 5) ticket_queues / ticket_statuses: restrict SELECT to authenticated only
DROP POLICY IF EXISTS "Anyone can view ticket queues" ON public.ticket_queues;
DROP POLICY IF EXISTS "Public can view ticket queues" ON public.ticket_queues;
CREATE POLICY "Authenticated can view ticket queues"
  ON public.ticket_queues FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Anyone can view ticket statuses" ON public.ticket_statuses;
DROP POLICY IF EXISTS "Public can view ticket statuses" ON public.ticket_statuses;
CREATE POLICY "Authenticated can view ticket statuses"
  ON public.ticket_statuses FOR SELECT
  TO authenticated
  USING (true);

-- 6) SECURITY DEFINER functions: revoke EXECUTE from anon/authenticated where not client-callable
REVOKE ALL ON FUNCTION public.handle_new_user() FROM anon, authenticated, PUBLIC;
REVOKE ALL ON FUNCTION public.handle_new_user_role() FROM anon, authenticated, PUBLIC;
REVOKE ALL ON FUNCTION public.generate_ticket_number() FROM anon, authenticated, PUBLIC;
REVOKE ALL ON FUNCTION public.update_updated_at_column() FROM anon, authenticated, PUBLIC;
REVOKE ALL ON FUNCTION public.soft_delete_ticket(uuid) FROM anon, PUBLIC;
GRANT EXECUTE ON FUNCTION public.soft_delete_ticket(uuid) TO authenticated;
REVOKE ALL ON FUNCTION public.batch_update_priority_order(uuid[], integer[]) FROM anon, PUBLIC;
GRANT EXECUTE ON FUNCTION public.batch_update_priority_order(uuid[], integer[]) TO authenticated;
REVOKE ALL ON FUNCTION public.lookup_patrimonio(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.lookup_patrimonio(text) TO anon, authenticated;
