-- ============ AUDITORIA CENTRAL ============
ALTER TABLE public.audit_log
  ADD COLUMN IF NOT EXISTS event_type text NOT NULL DEFAULT 'sistema',
  ADD COLUMN IF NOT EXISTS severity text NOT NULL DEFAULT 'baixo',
  ADD COLUMN IF NOT EXISTS section_name text,
  ADD COLUMN IF NOT EXISTS old_value text,
  ADD COLUMN IF NOT EXISTS new_value text;

CREATE INDEX IF NOT EXISTS idx_audit_log_created_at ON public.audit_log (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_log_event_type ON public.audit_log (event_type);
CREATE INDEX IF NOT EXISTS idx_audit_log_severity ON public.audit_log (severity);

-- Escrita direta proibida: somente via RPC/triggers SECURITY DEFINER
DROP POLICY IF EXISTS "Authenticated can insert audit log" ON public.audit_log;
REVOKE INSERT, UPDATE, DELETE ON public.audit_log FROM authenticated, anon;
GRANT SELECT ON public.audit_log TO authenticated;
GRANT ALL ON public.audit_log TO service_role;

-- Gravador interno (usado por triggers e RPC)
CREATE OR REPLACE FUNCTION public.audit_write(
  p_action text,
  p_entity_type text,
  p_entity_id uuid,
  p_entity_label text,
  p_event_type text,
  p_severity text,
  p_old_value text,
  p_new_value text,
  p_section_name text,
  p_details jsonb
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_user_name text;
  v_id uuid;
BEGIN
  IF v_user_id IS NOT NULL THEN
    SELECT display_name INTO v_user_name FROM public.profiles WHERE user_id = v_user_id;
  END IF;

  INSERT INTO public.audit_log (
    user_id, user_name, action, entity_type, entity_id, entity_label,
    event_type, severity, old_value, new_value, section_name, details
  ) VALUES (
    v_user_id,
    COALESCE(v_user_name, 'Sistema'),
    left(COALESCE(p_action, 'acao'), 120),
    left(COALESCE(p_entity_type, 'sistema'), 60),
    p_entity_id,
    left(p_entity_label, 200),
    CASE WHEN COALESCE(p_event_type,'sistema') IN
      ('chamado','mensagem','anexo','inventario','equipamento','material','usuario','seguranca','sistema')
      THEN p_event_type ELSE 'sistema' END,
    CASE WHEN COALESCE(p_severity,'baixo') IN ('baixo','medio','alto') THEN p_severity ELSE 'baixo' END,
    left(p_old_value, 200),
    left(p_new_value, 200),
    left(p_section_name, 200),
    COALESCE(p_details, '{}'::jsonb)
  ) RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

REVOKE ALL ON FUNCTION public.audit_write(text,text,uuid,text,text,text,text,text,text,jsonb) FROM PUBLIC, anon, authenticated;

-- RPC pública para o frontend (autor sempre = auth.uid())
CREATE OR REPLACE FUNCTION public.log_audit_event(
  p_action text,
  p_entity_type text,
  p_entity_id uuid DEFAULT NULL,
  p_entity_label text DEFAULT NULL,
  p_event_type text DEFAULT 'sistema',
  p_severity text DEFAULT 'baixo',
  p_old_value text DEFAULT NULL,
  p_new_value text DEFAULT NULL,
  p_details jsonb DEFAULT '{}'::jsonb
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
BEGIN
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;
  RETURN public.audit_write(
    p_action, p_entity_type, p_entity_id, p_entity_label,
    p_event_type, p_severity, p_old_value, p_new_value,
    public.get_user_section(v_user_id),
    COALESCE(p_details, '{}'::jsonb)
  );
END;
$$;

REVOKE ALL ON FUNCTION public.log_audit_event(text,text,uuid,text,text,text,text,text,jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.log_audit_event(text,text,uuid,text,text,text,text,text,jsonb) TO authenticated;

-- ============ TRIGGERS ============

-- Chamados
CREATE OR REPLACE FUNCTION public.audit_tickets() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  old_s text; new_s text; old_q text; new_q text;
BEGIN
  IF TG_OP = 'INSERT' THEN
    PERFORM public.audit_write('chamado criado','tickets',NEW.id,NEW.ticket_number,'chamado','baixo',
      NULL, NEW.subject, NEW.client_section_name, jsonb_build_object('priority', NEW.priority));
    RETURN NEW;
  END IF;

  IF NEW.deleted_at IS NOT NULL AND OLD.deleted_at IS NULL THEN
    PERFORM public.audit_write('chamado excluído','tickets',NEW.id,NEW.ticket_number,'chamado','alto',
      NULL, NULL, NEW.client_section_name, '{}'::jsonb);
  END IF;

  IF NEW.status_id IS DISTINCT FROM OLD.status_id THEN
    SELECT name INTO old_s FROM public.ticket_statuses WHERE id = OLD.status_id;
    SELECT name INTO new_s FROM public.ticket_statuses WHERE id = NEW.status_id;
    PERFORM public.audit_write('status alterado','tickets',NEW.id,NEW.ticket_number,'chamado','medio',
      old_s, new_s, NEW.client_section_name, '{}'::jsonb);
  END IF;

  IF NEW.priority IS DISTINCT FROM OLD.priority THEN
    PERFORM public.audit_write('prioridade alterada','tickets',NEW.id,NEW.ticket_number,'chamado','medio',
      OLD.priority, NEW.priority, NEW.client_section_name, '{}'::jsonb);
  END IF;

  IF NEW.queue_id IS DISTINCT FROM OLD.queue_id THEN
    SELECT name INTO old_q FROM public.ticket_queues WHERE id = OLD.queue_id;
    SELECT name INTO new_q FROM public.ticket_queues WHERE id = NEW.queue_id;
    PERFORM public.audit_write('fila alterada','tickets',NEW.id,NEW.ticket_number,'chamado','medio',
      old_q, new_q, NEW.client_section_name, '{}'::jsonb);
  END IF;

  IF NEW.assigned_user_id IS DISTINCT FROM OLD.assigned_user_id THEN
    PERFORM public.audit_write('responsável alterado','tickets',NEW.id,NEW.ticket_number,'chamado','alto',
      OLD.assigned_user_name, NEW.assigned_user_name, NEW.client_section_name, '{}'::jsonb);
  END IF;

  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_audit_tickets ON public.tickets;
CREATE TRIGGER trg_audit_tickets AFTER INSERT OR UPDATE ON public.tickets
FOR EACH ROW EXECUTE FUNCTION public.audit_tickets();

-- Mensagens (nunca registra conteúdo interno)
CREATE OR REPLACE FUNCTION public.audit_ticket_messages() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_num text; v_sec text;
BEGIN
  SELECT ticket_number, client_section_name INTO v_num, v_sec FROM public.tickets WHERE id = NEW.ticket_id;
  PERFORM public.audit_write(
    CASE WHEN NEW.visibility = 'interna' THEN 'mensagem interna registrada' ELSE 'mensagem pública registrada' END,
    'ticket_messages', NEW.id, v_num, 'mensagem',
    CASE WHEN NEW.visibility = 'interna' THEN 'medio' ELSE 'baixo' END,
    NULL, NULL, v_sec,
    jsonb_build_object('ticket_id', NEW.ticket_id, 'message_type', NEW.message_type, 'visibility', NEW.visibility)
  );
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_audit_ticket_messages ON public.ticket_messages;
CREATE TRIGGER trg_audit_ticket_messages AFTER INSERT ON public.ticket_messages
FOR EACH ROW EXECUTE FUNCTION public.audit_ticket_messages();

-- Anexos
CREATE OR REPLACE FUNCTION public.audit_ticket_attachments() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_num text; v_sec text;
BEGIN
  SELECT ticket_number, client_section_name INTO v_num, v_sec FROM public.tickets
   WHERE id = COALESCE(NEW.ticket_id, OLD.ticket_id);

  IF TG_OP = 'INSERT' THEN
    PERFORM public.audit_write('anexo enviado','ticket_attachments',NEW.id,NEW.file_name,'anexo','baixo',
      NULL, NEW.visibility, v_sec, jsonb_build_object('ticket_id', NEW.ticket_id, 'kind', NEW.kind));
    RETURN NEW;
  END IF;

  IF NEW.visibility IS DISTINCT FROM OLD.visibility THEN
    PERFORM public.audit_write('visibilidade de anexo alterada','ticket_attachments',NEW.id,NEW.file_name,'anexo','alto',
      OLD.visibility, NEW.visibility, v_sec, jsonb_build_object('ticket_id', NEW.ticket_id));
  END IF;
  IF NEW.kind IS DISTINCT FROM OLD.kind THEN
    PERFORM public.audit_write('tipo de anexo alterado','ticket_attachments',NEW.id,NEW.file_name,'anexo','baixo',
      OLD.kind, NEW.kind, v_sec, jsonb_build_object('ticket_id', NEW.ticket_id));
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_audit_ticket_attachments ON public.ticket_attachments;
CREATE TRIGGER trg_audit_ticket_attachments AFTER INSERT OR UPDATE ON public.ticket_attachments
FOR EACH ROW EXECUTE FUNCTION public.audit_ticket_attachments();

-- Notebooks
CREATE OR REPLACE FUNCTION public.audit_notebooks() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    PERFORM public.audit_write('equipamento cadastrado','notebooks',NEW.id,NEW.patrimonio,'equipamento','baixo',
      NULL, NEW.status, NEW.secao, jsonb_build_object('modelo', NEW.modelo));
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    PERFORM public.audit_write('equipamento excluído','notebooks',OLD.id,OLD.patrimonio,'equipamento','alto',
      OLD.status, NULL, OLD.secao, '{}'::jsonb);
    RETURN OLD;
  END IF;

  IF NEW.status IS DISTINCT FROM OLD.status THEN
    PERFORM public.audit_write('status do equipamento alterado','notebooks',NEW.id,NEW.patrimonio,'equipamento','medio',
      OLD.status, NEW.status, NEW.secao, '{}'::jsonb);
  END IF;
  IF NEW.secao IS DISTINCT FROM OLD.secao THEN
    PERFORM public.audit_write('seção do equipamento alterada','notebooks',NEW.id,NEW.patrimonio,'equipamento','medio',
      OLD.secao, NEW.secao, NEW.secao, '{}'::jsonb);
  END IF;
  IF NEW.militar IS DISTINCT FROM OLD.militar THEN
    PERFORM public.audit_write('responsável do equipamento alterado','notebooks',NEW.id,NEW.patrimonio,'equipamento','alto',
      OLD.militar, NEW.militar, NEW.secao, '{}'::jsonb);
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_audit_notebooks ON public.notebooks;
CREATE TRIGGER trg_audit_notebooks AFTER INSERT OR UPDATE OR DELETE ON public.notebooks
FOR EACH ROW EXECUTE FUNCTION public.audit_notebooks();

-- Materiais
CREATE OR REPLACE FUNCTION public.audit_materials() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    PERFORM public.audit_write('material cadastrado','materials',NEW.id,NEW.patrimonio,'material','baixo',
      NULL, NEW.nome, NULL, jsonb_build_object('codigo_material', NEW.codigo_material));
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    PERFORM public.audit_write('material excluído','materials',OLD.id,OLD.patrimonio,'material','alto',
      OLD.nome, NULL, NULL, '{}'::jsonb);
    RETURN OLD;
  END IF;
  PERFORM public.audit_write('material atualizado','materials',NEW.id,NEW.patrimonio,'material','baixo',
    OLD.nome, NEW.nome, NULL, '{}'::jsonb);
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_audit_materials ON public.materials;
CREATE TRIGGER trg_audit_materials AFTER INSERT OR UPDATE OR DELETE ON public.materials
FOR EACH ROW EXECUTE FUNCTION public.audit_materials();

-- Inventário
CREATE OR REPLACE FUNCTION public.audit_inventory_sessions() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    PERFORM public.audit_write('sessão de inventário iniciada','inventory_sessions',NEW.id,NEW.secao_alvo,'inventario','medio',
      NULL, NEW.status, NEW.secao_alvo, '{}'::jsonb);
    RETURN NEW;
  END IF;
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    PERFORM public.audit_write('sessão de inventário atualizada','inventory_sessions',NEW.id,NEW.secao_alvo,'inventario','medio',
      OLD.status, NEW.status, NEW.secao_alvo, '{}'::jsonb);
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_audit_inventory_sessions ON public.inventory_sessions;
CREATE TRIGGER trg_audit_inventory_sessions AFTER INSERT OR UPDATE ON public.inventory_sessions
FOR EACH ROW EXECUTE FUNCTION public.audit_inventory_sessions();

CREATE OR REPLACE FUNCTION public.audit_inventory_items() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_sec text;
BEGIN
  SELECT secao_alvo INTO v_sec FROM public.inventory_sessions WHERE id = NEW.session_id;
  PERFORM public.audit_write('item conferido','inventory_items',NEW.id,NEW.patrimonio,'inventario','baixo',
    NULL, NEW.status, v_sec, jsonb_build_object('session_id', NEW.session_id, 'item_tipo', NEW.item_tipo));
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_audit_inventory_items ON public.inventory_items;
CREATE TRIGGER trg_audit_inventory_items AFTER INSERT ON public.inventory_items
FOR EACH ROW EXECUTE FUNCTION public.audit_inventory_items();

-- Perfis e permissões
CREATE OR REPLACE FUNCTION public.audit_profiles() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.section_name IS DISTINCT FROM OLD.section_name THEN
    PERFORM public.audit_write('seção do usuário alterada','profiles',NEW.user_id,NEW.display_name,'usuario','alto',
      OLD.section_name, NEW.section_name, NEW.section_name, '{}'::jsonb);
  END IF;
  IF NEW.role IS DISTINCT FROM OLD.role THEN
    PERFORM public.audit_write('perfil do usuário alterado','profiles',NEW.user_id,NEW.display_name,'usuario','alto',
      OLD.role, NEW.role, NEW.section_name, '{}'::jsonb);
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_audit_profiles ON public.profiles;
CREATE TRIGGER trg_audit_profiles AFTER UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.audit_profiles();

CREATE OR REPLACE FUNCTION public.audit_user_roles() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_name text;
BEGIN
  IF TG_OP = 'INSERT' THEN
    SELECT display_name INTO v_name FROM public.profiles WHERE user_id = NEW.user_id;
    PERFORM public.audit_write('permissão concedida','user_roles',NEW.user_id,v_name,'usuario','alto',
      NULL, NEW.role::text, NULL, '{}'::jsonb);
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    SELECT display_name INTO v_name FROM public.profiles WHERE user_id = OLD.user_id;
    PERFORM public.audit_write('permissão removida','user_roles',OLD.user_id,v_name,'usuario','alto',
      OLD.role::text, NULL, NULL, '{}'::jsonb);
    RETURN OLD;
  END IF;
  SELECT display_name INTO v_name FROM public.profiles WHERE user_id = NEW.user_id;
  PERFORM public.audit_write('permissão alterada','user_roles',NEW.user_id,v_name,'usuario','alto',
    OLD.role::text, NEW.role::text, NULL, '{}'::jsonb);
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_audit_user_roles ON public.user_roles;
CREATE TRIGGER trg_audit_user_roles AFTER INSERT OR UPDATE OR DELETE ON public.user_roles
FOR EACH ROW EXECUTE FUNCTION public.audit_user_roles();

-- ============ SLA ============
ALTER TABLE public.ticket_sla
  ADD COLUMN IF NOT EXISTS queue_id uuid REFERENCES public.ticket_queues(id) ON DELETE CASCADE;

CREATE UNIQUE INDEX IF NOT EXISTS idx_ticket_sla_priority_global
  ON public.ticket_sla (priority) WHERE queue_id IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_ticket_sla_priority_queue
  ON public.ticket_sla (priority, queue_id) WHERE queue_id IS NOT NULL;

DROP POLICY IF EXISTS "sla readable by authenticated" ON public.ticket_sla;
CREATE POLICY "sla readable by staff" ON public.ticket_sla
FOR SELECT TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'operador'::app_role)
  OR has_role(auth.uid(), 'chefe_secao'::app_role)
);