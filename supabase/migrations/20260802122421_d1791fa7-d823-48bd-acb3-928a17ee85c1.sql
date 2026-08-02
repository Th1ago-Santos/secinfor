CREATE OR REPLACE FUNCTION public.update_ticket_attachment_metadata(
  p_attachment_id uuid,
  p_visibility text DEFAULT NULL,
  p_kind text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_user_name text;
  v_att public.ticket_attachments%ROWTYPE;
  v_new_vis text;
  v_new_kind text;
BEGIN
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;
  IF NOT (has_role(v_user_id, 'admin'::app_role) OR has_role(v_user_id, 'operador'::app_role)) THEN
    RAISE EXCEPTION 'permission denied';
  END IF;

  SELECT * INTO v_att FROM public.ticket_attachments WHERE id = p_attachment_id;
  IF v_att.id IS NULL THEN RAISE EXCEPTION 'attachment not found'; END IF;

  v_new_vis := COALESCE(p_visibility, v_att.visibility);
  v_new_kind := COALESCE(p_kind, v_att.kind);

  IF v_new_vis NOT IN ('publica','interna') THEN RAISE EXCEPTION 'invalid visibility'; END IF;
  IF v_new_kind NOT IN ('foto_problema','foto_equipamento','documento','cautela','outro') THEN
    RAISE EXCEPTION 'invalid kind';
  END IF;

  UPDATE public.ticket_attachments
     SET visibility = v_new_vis, kind = v_new_kind
   WHERE id = p_attachment_id;

  SELECT display_name INTO v_user_name FROM public.profiles WHERE user_id = v_user_id;

  INSERT INTO public.ticket_history (ticket_id, user_id, user_name, action, old_value, new_value, description)
  VALUES (v_att.ticket_id, v_user_id, v_user_name, 'anexo atualizado',
          v_att.visibility || '/' || v_att.kind,
          v_new_vis || '/' || v_new_kind,
          'Anexo "' || v_att.file_name || '" agora é ' ||
          CASE WHEN v_new_vis = 'publica' THEN 'público' ELSE 'interno' END);

  RETURN jsonb_build_object('id', p_attachment_id, 'visibility', v_new_vis, 'kind', v_new_kind);
END;
$$;

REVOKE ALL ON FUNCTION public.update_ticket_attachment_metadata(uuid, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.update_ticket_attachment_metadata(uuid, text, text) TO authenticated;

-- Allow admins/operators to update attachment metadata rows directly as well
DROP POLICY IF EXISTS "Staff can update attachment metadata" ON public.ticket_attachments;
CREATE POLICY "Staff can update attachment metadata"
ON public.ticket_attachments FOR UPDATE TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'operador'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'operador'::app_role));