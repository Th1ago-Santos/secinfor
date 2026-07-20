
-- 1. Add public_token
ALTER TABLE public.tickets ADD COLUMN IF NOT EXISTS public_token text;
UPDATE public.tickets SET public_token = encode(gen_random_bytes(12), 'hex') WHERE public_token IS NULL;
ALTER TABLE public.tickets ALTER COLUMN public_token SET NOT NULL;
ALTER TABLE public.tickets ALTER COLUMN public_token SET DEFAULT encode(gen_random_bytes(12), 'hex');
CREATE UNIQUE INDEX IF NOT EXISTS tickets_public_token_key ON public.tickets(public_token);

-- 2. ticket_messages
CREATE TABLE IF NOT EXISTS public.ticket_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id uuid NOT NULL REFERENCES public.tickets(id) ON DELETE CASCADE,
  author_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  author_name text,
  message_type text NOT NULL DEFAULT 'atualizacao',
  content text NOT NULL,
  visibility text NOT NULL DEFAULT 'publica' CHECK (visibility IN ('publica','interna')),
  status_id_snapshot uuid,
  queue_id_snapshot uuid,
  assigned_user_id_snapshot uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);
CREATE INDEX IF NOT EXISTS idx_ticket_messages_ticket ON public.ticket_messages(ticket_id, created_at);

GRANT SELECT, INSERT ON public.ticket_messages TO authenticated;
GRANT ALL ON public.ticket_messages TO service_role;

ALTER TABLE public.ticket_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated can view messages" ON public.ticket_messages;
CREATE POLICY "Authenticated can view messages" ON public.ticket_messages
  FOR SELECT TO authenticated USING (deleted_at IS NULL);

DROP POLICY IF EXISTS "Admin/Operador can insert messages" ON public.ticket_messages;
CREATE POLICY "Admin/Operador can insert messages" ON public.ticket_messages
  FOR INSERT TO authenticated
  WITH CHECK (
    (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'operador'::app_role))
    AND author_id = auth.uid()
    AND visibility IN ('publica','interna')
  );

CREATE TRIGGER update_ticket_messages_updated_at
  BEFORE UPDATE ON public.ticket_messages
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 3. lookup_ticket_public by token
CREATE OR REPLACE FUNCTION public.lookup_ticket_public(p_token text)
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE result jsonb;
BEGIN
  SELECT jsonb_build_object(
    'id', t.id,
    'public_token', t.public_token,
    'ticket_number', t.ticket_number,
    'subject', t.subject,
    'description', t.description,
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
$$;

-- Keep old signature by-id as fallback removed to avoid ambiguity; drop if exists with uuid arg
DROP FUNCTION IF EXISTS public.lookup_ticket_public(uuid);

REVOKE ALL ON FUNCTION public.lookup_ticket_public(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.lookup_ticket_public(text) TO anon, authenticated;

-- 4. list_ticket_messages_public
CREATE OR REPLACE FUNCTION public.list_ticket_messages_public(p_token text, p_limit int DEFAULT 20)
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_ticket_id uuid;
  result jsonb;
BEGIN
  SELECT id INTO v_ticket_id FROM public.tickets
    WHERE public_token = p_token AND deleted_at IS NULL;
  IF v_ticket_id IS NULL THEN
    RETURN '[]'::jsonb;
  END IF;

  SELECT COALESCE(jsonb_agg(x ORDER BY created_at ASC), '[]'::jsonb) INTO result
  FROM (
    SELECT jsonb_build_object(
      'created_at', m.created_at,
      'message_type', m.message_type,
      'content', m.content,
      'status_name', s.name
    ) AS x, m.created_at
    FROM public.ticket_messages m
    LEFT JOIN public.ticket_statuses s ON s.id = m.status_id_snapshot
    WHERE m.ticket_id = v_ticket_id
      AND m.visibility = 'publica'
      AND m.deleted_at IS NULL
    ORDER BY m.created_at DESC
    LIMIT LEAST(GREATEST(p_limit, 1), 50)
  ) sub;

  RETURN result;
END;
$$;

REVOKE ALL ON FUNCTION public.list_ticket_messages_public(text, int) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.list_ticket_messages_public(text, int) TO anon, authenticated;

-- 5. add_ticket_update transactional RPC
CREATE OR REPLACE FUNCTION public.add_ticket_update(
  p_ticket_id uuid,
  p_content text,
  p_visibility text DEFAULT 'publica',
  p_message_type text DEFAULT 'atualizacao',
  p_status_id uuid DEFAULT NULL,
  p_queue_id uuid DEFAULT NULL,
  p_priority text DEFAULT NULL,
  p_assigned_user_id uuid DEFAULT NULL,
  p_assigned_user_name text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_user_name text;
  v_ticket public.tickets%ROWTYPE;
  v_message_id uuid;
  v_status_name text;
  v_queue_name text;
BEGIN
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;
  IF NOT (has_role(v_user_id, 'admin'::app_role) OR has_role(v_user_id, 'operador'::app_role)) THEN
    RAISE EXCEPTION 'permission denied';
  END IF;
  IF p_content IS NULL OR btrim(p_content) = '' THEN RAISE EXCEPTION 'empty content'; END IF;
  IF p_visibility NOT IN ('publica','interna') THEN RAISE EXCEPTION 'invalid visibility'; END IF;
  IF length(p_content) > 5000 THEN RAISE EXCEPTION 'content too long'; END IF;

  SELECT * INTO v_ticket FROM public.tickets WHERE id = p_ticket_id AND deleted_at IS NULL;
  IF v_ticket.id IS NULL THEN RAISE EXCEPTION 'ticket not found'; END IF;

  SELECT display_name INTO v_user_name FROM public.profiles WHERE user_id = v_user_id;

  INSERT INTO public.ticket_messages (
    ticket_id, author_id, author_name, message_type, content, visibility,
    status_id_snapshot, queue_id_snapshot, assigned_user_id_snapshot
  ) VALUES (
    p_ticket_id, v_user_id, v_user_name, p_message_type, p_content, p_visibility,
    COALESCE(p_status_id, v_ticket.status_id),
    COALESCE(p_queue_id, v_ticket.queue_id),
    COALESCE(p_assigned_user_id, v_ticket.assigned_user_id)
  ) RETURNING id INTO v_message_id;

  INSERT INTO public.ticket_history (ticket_id, user_id, user_name, action, description)
  VALUES (p_ticket_id, v_user_id, v_user_name,
    CASE WHEN p_visibility='interna' THEN 'mensagem interna' ELSE 'mensagem' END,
    left(p_content, 200));

  -- Optional status update
  IF p_status_id IS NOT NULL AND p_status_id <> COALESCE(v_ticket.status_id, '00000000-0000-0000-0000-000000000000') THEN
    UPDATE public.tickets SET status_id = p_status_id, updated_at = now(),
      closed_at = CASE WHEN (SELECT is_closed FROM public.ticket_statuses WHERE id = p_status_id) THEN now() ELSE NULL END
      WHERE id = p_ticket_id;
    SELECT name INTO v_status_name FROM public.ticket_statuses WHERE id = p_status_id;
    INSERT INTO public.ticket_history (ticket_id, user_id, user_name, action, new_value, description)
    VALUES (p_ticket_id, v_user_id, v_user_name, 'status alterado', v_status_name, 'Status: ' || COALESCE(v_status_name,''));
  END IF;

  IF p_queue_id IS NOT NULL AND p_queue_id <> COALESCE(v_ticket.queue_id, '00000000-0000-0000-0000-000000000000') THEN
    UPDATE public.tickets SET queue_id = p_queue_id, updated_at = now() WHERE id = p_ticket_id;
    SELECT name INTO v_queue_name FROM public.ticket_queues WHERE id = p_queue_id;
    INSERT INTO public.ticket_history (ticket_id, user_id, user_name, action, new_value, description)
    VALUES (p_ticket_id, v_user_id, v_user_name, 'fila alterada', v_queue_name, 'Fila: ' || COALESCE(v_queue_name,''));
  END IF;

  IF p_priority IS NOT NULL AND p_priority <> v_ticket.priority THEN
    UPDATE public.tickets SET priority = p_priority, updated_at = now() WHERE id = p_ticket_id;
    INSERT INTO public.ticket_history (ticket_id, user_id, user_name, action, new_value, description)
    VALUES (p_ticket_id, v_user_id, v_user_name, 'prioridade alterada', p_priority, 'Prioridade: ' || p_priority);
  END IF;

  IF p_assigned_user_id IS NOT NULL AND p_assigned_user_id <> COALESCE(v_ticket.assigned_user_id, '00000000-0000-0000-0000-000000000000') THEN
    UPDATE public.tickets SET assigned_user_id = p_assigned_user_id, assigned_user_name = p_assigned_user_name, updated_at = now() WHERE id = p_ticket_id;
    INSERT INTO public.ticket_history (ticket_id, user_id, user_name, action, new_value, description)
    VALUES (p_ticket_id, v_user_id, v_user_name, 'responsável atribuído', p_assigned_user_name, 'Responsável: ' || COALESCE(p_assigned_user_name,''));
  END IF;

  -- Touch updated_at
  UPDATE public.tickets SET updated_at = now() WHERE id = p_ticket_id;

  RETURN jsonb_build_object('message_id', v_message_id, 'ticket_id', p_ticket_id);
END;
$$;

REVOKE ALL ON FUNCTION public.add_ticket_update(uuid, text, text, text, uuid, uuid, text, uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.add_ticket_update(uuid, text, text, text, uuid, uuid, text, uuid, text) TO authenticated;
