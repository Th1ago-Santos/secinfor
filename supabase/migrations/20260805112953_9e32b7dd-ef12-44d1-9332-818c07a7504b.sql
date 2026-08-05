
-- Helper: section_id do usuário
CREATE OR REPLACE FUNCTION public.get_user_section_id(_user_id uuid)
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT section_id FROM public.profiles WHERE user_id = _user_id LIMIT 1
$$;

REVOKE ALL ON FUNCTION public.get_user_section_id(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_user_section_id(uuid) TO authenticated;

-- Helper: chefe de seção pode acessar este chamado?
CREATE OR REPLACE FUNCTION public.can_access_ticket(_ticket_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT CASE
    WHEN auth.uid() IS NULL THEN false
    WHEN public.has_role(auth.uid(), 'chefe_secao'::app_role) THEN EXISTS (
      SELECT 1 FROM public.tickets t, public.profiles p
      WHERE t.id = _ticket_id
        AND p.user_id = auth.uid()
        AND (
          (t.client_section_id IS NOT NULL AND t.client_section_id = p.section_id)
          OR (p.section_name IS NOT NULL AND t.client_section_name = p.section_name)
        )
    )
    ELSE true
  END
$$;

REVOKE ALL ON FUNCTION public.can_access_ticket(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.can_access_ticket(uuid) TO authenticated;

-- tickets
DROP POLICY IF EXISTS "Authenticated can view tickets" ON public.tickets;
CREATE POLICY "Authenticated can view tickets" ON public.tickets
FOR SELECT TO authenticated
USING (
  deleted_at IS NULL
  AND (
    NOT public.has_role(auth.uid(), 'chefe_secao'::app_role)
    OR client_section_id = public.get_user_section_id(auth.uid())
    OR (client_section_name IS NOT NULL AND client_section_name = public.get_user_section(auth.uid()))
  )
);

-- ticket_messages
DROP POLICY IF EXISTS "Authenticated can view messages" ON public.ticket_messages;
CREATE POLICY "Authenticated can view messages" ON public.ticket_messages
FOR SELECT TO authenticated
USING (deleted_at IS NULL AND public.can_access_ticket(ticket_id));

-- ticket_attachments
DROP POLICY IF EXISTS "Authenticated can view attachments" ON public.ticket_attachments;
CREATE POLICY "Authenticated can view attachments" ON public.ticket_attachments
FOR SELECT TO authenticated
USING (public.can_access_ticket(ticket_id));

-- ticket_history
DROP POLICY IF EXISTS "Authenticated can view ticket history" ON public.ticket_history;
CREATE POLICY "Authenticated can view ticket history" ON public.ticket_history
FOR SELECT TO authenticated
USING (public.can_access_ticket(ticket_id));
