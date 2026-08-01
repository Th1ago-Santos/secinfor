ALTER TABLE public.tickets
  ADD COLUMN IF NOT EXISTS category text,
  ADD COLUMN IF NOT EXISTS checklist jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS first_response_at timestamptz;

ALTER TABLE public.ticket_attachments
  ADD COLUMN IF NOT EXISTS visibility text NOT NULL DEFAULT 'interna',
  ADD COLUMN IF NOT EXISTS kind text NOT NULL DEFAULT 'documento';

ALTER TABLE public.ticket_attachments
  DROP CONSTRAINT IF EXISTS ticket_attachments_visibility_check;
ALTER TABLE public.ticket_attachments
  ADD CONSTRAINT ticket_attachments_visibility_check CHECK (visibility IN ('publica','interna'));
ALTER TABLE public.ticket_attachments
  DROP CONSTRAINT IF EXISTS ticket_attachments_kind_check;
ALTER TABLE public.ticket_attachments
  ADD CONSTRAINT ticket_attachments_kind_check CHECK (kind IN ('foto_problema','foto_equipamento','documento','outro'));

CREATE TABLE IF NOT EXISTS public.ticket_sla (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  priority text NOT NULL UNIQUE,
  response_minutes integer NOT NULL DEFAULT 240,
  resolution_minutes integer NOT NULL DEFAULT 2880,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.ticket_sla TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.ticket_sla TO authenticated;
GRANT ALL ON public.ticket_sla TO service_role;

ALTER TABLE public.ticket_sla ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "sla readable by authenticated" ON public.ticket_sla;
CREATE POLICY "sla readable by authenticated" ON public.ticket_sla
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "sla managed by admin" ON public.ticket_sla;
CREATE POLICY "sla managed by admin" ON public.ticket_sla
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

DROP TRIGGER IF EXISTS update_ticket_sla_updated_at ON public.ticket_sla;
CREATE TRIGGER update_ticket_sla_updated_at
  BEFORE UPDATE ON public.ticket_sla
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.ticket_sla (priority, response_minutes, resolution_minutes) VALUES
  ('Baixa', 480, 10080),
  ('Normal', 240, 4320),
  ('Alta', 120, 1440),
  ('Urgente', 30, 480)
ON CONFLICT (priority) DO NOTHING;

CREATE OR REPLACE FUNCTION public.assign_ticket_self(p_ticket_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_user_id uuid := auth.uid();
  v_user_name text;
  v_ticket public.tickets%ROWTYPE;
BEGIN
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;
  IF NOT (has_role(v_user_id, 'admin'::app_role) OR has_role(v_user_id, 'operador'::app_role)) THEN
    RAISE EXCEPTION 'permission denied';
  END IF;

  SELECT * INTO v_ticket FROM public.tickets WHERE id = p_ticket_id AND deleted_at IS NULL;
  IF v_ticket.id IS NULL THEN RAISE EXCEPTION 'ticket not found'; END IF;

  SELECT display_name INTO v_user_name FROM public.profiles WHERE user_id = v_user_id;

  UPDATE public.tickets
     SET assigned_user_id = v_user_id,
         assigned_user_name = COALESCE(v_user_name, 'Técnico'),
         first_response_at = COALESCE(first_response_at, now()),
         updated_at = now()
   WHERE id = p_ticket_id;

  INSERT INTO public.ticket_history (ticket_id, user_id, user_name, action, new_value, description)
  VALUES (p_ticket_id, v_user_id, v_user_name, 'responsável atribuído', COALESCE(v_user_name,'Técnico'),
          'Chamado assumido por ' || COALESCE(v_user_name,'Técnico'));

  RETURN jsonb_build_object('ticket_id', p_ticket_id, 'assigned_user_name', COALESCE(v_user_name,'Técnico'));
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.assign_ticket_self(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.assign_ticket_self(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.update_ticket_checklist(p_ticket_id uuid, p_checklist jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_user_id uuid := auth.uid();
  v_user_name text;
BEGIN
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;
  IF NOT (has_role(v_user_id, 'admin'::app_role) OR has_role(v_user_id, 'operador'::app_role)) THEN
    RAISE EXCEPTION 'permission denied';
  END IF;

  SELECT display_name INTO v_user_name FROM public.profiles WHERE user_id = v_user_id;

  UPDATE public.tickets SET checklist = COALESCE(p_checklist, '{}'::jsonb), updated_at = now()
   WHERE id = p_ticket_id AND deleted_at IS NULL;

  INSERT INTO public.ticket_history (ticket_id, user_id, user_name, action, description)
  VALUES (p_ticket_id, v_user_id, v_user_name, 'checklist atualizado', 'Checklist de atendimento atualizado');

  RETURN jsonb_build_object('ticket_id', p_ticket_id);
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.update_ticket_checklist(uuid, jsonb) FROM anon;
GRANT EXECUTE ON FUNCTION public.update_ticket_checklist(uuid, jsonb) TO authenticated;

CREATE OR REPLACE FUNCTION public.lookup_ticket_public(p_token text)
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE result jsonb;
BEGIN
  SELECT jsonb_build_object(
    'id', t.id,
    'public_token', t.public_token,
    'ticket_number', t.ticket_number,
    'subject', t.subject,
    'description', t.description,
    'category', t.category,
    'priority', t.priority,
    'client_section_name', t.client_section_name,
    'plate_name', t.plate_name,
    'equipment_type', t.equipment_type,
    'equipment_patrimonio', t.equipment_patrimonio,
    'created_at', t.created_at,
    'updated_at', t.updated_at,
    'closed_at', t.closed_at,
    'queue_name', q.name,
    'status_name', s.name,
    'status_color', s.color
  ) INTO result
  FROM public.tickets t
  LEFT JOIN public.ticket_queues q ON q.id = t.queue_id
  LEFT JOIN public.ticket_statuses s ON s.id = t.status_id
  WHERE t.public_token = p_token AND t.deleted_at IS NULL;
  RETURN result;
END;
$function$;