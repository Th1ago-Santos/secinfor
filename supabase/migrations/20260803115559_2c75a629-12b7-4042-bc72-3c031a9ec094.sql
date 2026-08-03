ALTER TABLE public.tickets ADD COLUMN IF NOT EXISTS public_summary text;

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
    'public_summary', t.public_summary,
    'category', t.category,
    'priority', t.priority,
    'client_section_name', t.client_section_name,
    'plate_name', t.plate_name,
    'equipment_type', t.equipment_type,
    'equipment_patrimonio', t.equipment_patrimonio,
    'created_at', t.created_at,
    'updated_at', t.updated_at,
    'closed_at', t.closed_at,
    'first_response_at', t.first_response_at,
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

REVOKE ALL ON FUNCTION public.lookup_ticket_public(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.lookup_ticket_public(text) TO anon, authenticated;

-- add_ticket_update: registra first_response_at na primeira resposta pública do técnico
CREATE OR REPLACE FUNCTION public.add_ticket_update(p_ticket_id uuid, p_content text, p_visibility text DEFAULT 'publica'::text, p_message_type text DEFAULT 'atualizacao'::text, p_status_id uuid DEFAULT NULL::uuid, p_queue_id uuid DEFAULT NULL::uuid, p_priority text DEFAULT NULL::text, p_assigned_user_id uuid DEFAULT NULL::uuid, p_assigned_user_name text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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

  IF p_visibility = 'publica' AND v_ticket.first_response_at IS NULL THEN
    UPDATE public.tickets SET first_response_at = now() WHERE id = p_ticket_id;
    INSERT INTO public.ticket_history (ticket_id, user_id, user_name, action, description)
    VALUES (p_ticket_id, v_user_id, v_user_name, 'primeira resposta', 'Primeira resposta pública registrada');
  END IF;

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

  UPDATE public.tickets SET updated_at = now() WHERE id = p_ticket_id;

  RETURN jsonb_build_object('message_id', v_message_id, 'ticket_id', p_ticket_id);
END;
$function$;

REVOKE ALL ON FUNCTION public.add_ticket_update(uuid, text, text, text, uuid, uuid, text, uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.add_ticket_update(uuid, text, text, text, uuid, uuid, text, uuid, text) TO authenticated;