
-- ============ SEQUENCE for ticket numbers ============
CREATE SEQUENCE IF NOT EXISTS public.ticket_number_seq START 1;

-- ============ TICKET QUEUES ============
CREATE TABLE public.ticket_queues (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  active BOOLEAN NOT NULL DEFAULT true,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.ticket_queues TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ticket_queues TO authenticated;
GRANT ALL ON public.ticket_queues TO service_role;
ALTER TABLE public.ticket_queues ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view queues" ON public.ticket_queues FOR SELECT USING (true);
CREATE POLICY "Admin/Operador can insert queues" ON public.ticket_queues FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'operador'));
CREATE POLICY "Admin/Operador can update queues" ON public.ticket_queues FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'operador'));
CREATE POLICY "Admin can delete queues" ON public.ticket_queues FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- ============ TICKET STATUSES ============
CREATE TABLE public.ticket_statuses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  color TEXT,
  active BOOLEAN NOT NULL DEFAULT true,
  display_order INTEGER NOT NULL DEFAULT 0,
  is_closed BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.ticket_statuses TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ticket_statuses TO authenticated;
GRANT ALL ON public.ticket_statuses TO service_role;
ALTER TABLE public.ticket_statuses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view statuses" ON public.ticket_statuses FOR SELECT USING (true);
CREATE POLICY "Admin/Operador can manage statuses" ON public.ticket_statuses FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'operador'))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'operador'));

-- ============ TICKETS ============
CREATE TABLE public.tickets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ticket_number TEXT NOT NULL UNIQUE,
  client_section_id UUID REFERENCES public.sections(id) ON DELETE SET NULL,
  client_section_name TEXT NOT NULL,
  equipment_type TEXT,          -- 'notebook' | 'material' | null
  equipment_id UUID,
  equipment_patrimonio TEXT,
  plate_name TEXT,
  subject TEXT NOT NULL,
  description TEXT NOT NULL,
  queue_id UUID REFERENCES public.ticket_queues(id) ON DELETE SET NULL,
  priority TEXT NOT NULL DEFAULT 'Normal' CHECK (priority IN ('Baixa','Normal','Alta','Urgente')),
  status_id UUID REFERENCES public.ticket_statuses(id) ON DELETE SET NULL,
  assigned_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  assigned_user_name TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_by_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  closed_at TIMESTAMPTZ,
  deleted_at TIMESTAMPTZ
);
CREATE INDEX idx_tickets_status ON public.tickets(status_id);
CREATE INDEX idx_tickets_queue ON public.tickets(queue_id);
CREATE INDEX idx_tickets_section ON public.tickets(client_section_id);
CREATE INDEX idx_tickets_number ON public.tickets(ticket_number);
GRANT SELECT ON public.tickets TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tickets TO authenticated;
GRANT ALL ON public.tickets TO service_role;
ALTER TABLE public.tickets ENABLE ROW LEVEL SECURITY;
-- Public (anon) can only see non-deleted tickets (used by QR Code public page)
CREATE POLICY "Public can view tickets for QR lookup" ON public.tickets FOR SELECT TO anon
  USING (deleted_at IS NULL);
CREATE POLICY "Authenticated can view tickets" ON public.tickets FOR SELECT TO authenticated
  USING (deleted_at IS NULL);
CREATE POLICY "Admin/Operador can insert tickets" ON public.tickets FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'operador'));
CREATE POLICY "Admin/Operador can update tickets" ON public.tickets FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'operador'));
CREATE POLICY "Admin can delete tickets" ON public.tickets FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_tickets_updated_at
  BEFORE UPDATE ON public.tickets
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_ticket_queues_updated_at
  BEFORE UPDATE ON public.ticket_queues
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_ticket_statuses_updated_at
  BEFORE UPDATE ON public.ticket_statuses
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ TICKET HISTORY ============
CREATE TABLE public.ticket_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ticket_id UUID NOT NULL REFERENCES public.tickets(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  user_name TEXT,
  action TEXT NOT NULL,
  old_value TEXT,
  new_value TEXT,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_ticket_history_ticket ON public.ticket_history(ticket_id);
GRANT SELECT ON public.ticket_history TO anon;
GRANT SELECT, INSERT ON public.ticket_history TO authenticated;
GRANT ALL ON public.ticket_history TO service_role;
ALTER TABLE public.ticket_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view ticket history" ON public.ticket_history FOR SELECT USING (true);
CREATE POLICY "Authenticated can insert history" ON public.ticket_history FOR INSERT TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

-- ============ TICKET ATTACHMENTS ============
CREATE TABLE public.ticket_attachments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ticket_id UUID NOT NULL REFERENCES public.tickets(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_type TEXT,
  file_size INTEGER,
  uploaded_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_ticket_attachments_ticket ON public.ticket_attachments(ticket_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ticket_attachments TO authenticated;
GRANT ALL ON public.ticket_attachments TO service_role;
ALTER TABLE public.ticket_attachments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can view attachments" ON public.ticket_attachments FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin/Operador can insert attachments" ON public.ticket_attachments FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'operador'));
CREATE POLICY "Admin/Operador can delete attachments" ON public.ticket_attachments FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'operador'));

-- ============ Generate ticket_number ============
CREATE OR REPLACE FUNCTION public.generate_ticket_number()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.ticket_number IS NULL OR NEW.ticket_number = '' THEN
    NEW.ticket_number := 'CHM-' || LPAD(nextval('public.ticket_number_seq')::text, 6, '0');
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_generate_ticket_number
  BEFORE INSERT ON public.tickets
  FOR EACH ROW EXECUTE FUNCTION public.generate_ticket_number();

-- ============ Initial data ============
INSERT INTO public.ticket_queues (name, description, display_order) VALUES
  ('Apoio Técnico', 'Chamados de suporte técnico geral', 1),
  ('Pendentes de Material', 'Chamados aguardando peças ou materiais', 2);

INSERT INTO public.ticket_statuses (name, color, display_order, is_closed) VALUES
  ('Aberto', '#3b82f6', 1, false),
  ('Em atendimento', '#f59e0b', 2, false),
  ('Aguardando material', '#a855f7', 3, false),
  ('Aguardando usuário', '#eab308', 4, false),
  ('Concluído', '#22c55e', 5, true),
  ('Cancelado', '#ef4444', 6, true);
