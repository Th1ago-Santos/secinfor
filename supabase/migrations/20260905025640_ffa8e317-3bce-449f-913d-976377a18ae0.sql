CREATE TABLE public.material_conferences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  section_id uuid REFERENCES public.sections(id),
  section_name text,
  title text,
  status text NOT NULL DEFAULT 'em_andamento',
  responsible_user_id uuid,
  responsible_name text,
  started_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  reopened_at timestamptz,
  cancelled_at timestamptz,
  notes text,
  final_report_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT material_conferences_status_chk CHECK (status IN ('em_andamento','concluida','reaberta','cancelada'))
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.material_conferences TO authenticated;
GRANT ALL ON public.material_conferences TO service_role;

ALTER TABLE public.material_conferences ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.material_conference_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conference_id uuid NOT NULL REFERENCES public.material_conferences(id) ON DELETE CASCADE,
  material_id uuid REFERENCES public.materials(id),
  numero_ficha text,
  patrimonio text,
  codigo_material text,
  nome_material text,
  section_id uuid,
  section_name text,
  responsavel text,
  situacao_material text,
  quantidade integer NOT NULL DEFAULT 1,
  valor_unitario numeric(14,2),
  status text NOT NULL DEFAULT 'pendente',
  observation text,
  checked_by uuid,
  checked_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT material_conference_items_status_chk CHECK (status IN ('pendente','conferido','faltando','divergente','fora_da_secao','sem_responsavel','cadastro_incompleto'))
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.material_conference_items TO authenticated;
GRANT ALL ON public.material_conference_items TO service_role;

ALTER TABLE public.material_conference_items ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_mconf_section ON public.material_conferences(section_id);
CREATE INDEX idx_mconf_status ON public.material_conferences(status);
CREATE INDEX idx_mconf_started ON public.material_conferences(started_at DESC);
CREATE INDEX idx_mconf_items_conf ON public.material_conference_items(conference_id);
CREATE INDEX idx_mconf_items_status ON public.material_conference_items(status);
CREATE INDEX idx_mconf_items_patrimonio ON public.material_conference_items(patrimonio);
CREATE INDEX idx_mconf_items_codigo ON public.material_conference_items(codigo_material);

CREATE OR REPLACE FUNCTION public.can_access_material_conference(_conference_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT CASE
    WHEN auth.uid() IS NULL THEN false
    WHEN public.has_role(auth.uid(), 'admin'::app_role)
      OR public.has_role(auth.uid(), 'operador'::app_role) THEN true
    WHEN public.has_role(auth.uid(), 'chefe_secao'::app_role) THEN EXISTS (
      SELECT 1 FROM public.material_conferences c
      WHERE c.id = _conference_id
        AND (
          (c.section_id IS NOT NULL AND c.section_id = public.get_user_section_id(auth.uid()))
          OR (c.section_name IS NOT NULL AND c.section_name = public.get_user_section(auth.uid()))
        )
    )
    ELSE false
  END
$$;

CREATE POLICY "Conferences visible by section scope"
ON public.material_conferences FOR SELECT TO authenticated
USING (public.can_access_material_conference(id));

CREATE POLICY "Conferences insert by staff"
ON public.material_conferences FOR INSERT TO authenticated
WITH CHECK (public.has_role(auth.uid(),'admin'::app_role) OR public.has_role(auth.uid(),'operador'::app_role));

CREATE POLICY "Conferences update by staff"
ON public.material_conferences FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(),'admin'::app_role) OR public.has_role(auth.uid(),'operador'::app_role))
WITH CHECK (public.has_role(auth.uid(),'admin'::app_role) OR public.has_role(auth.uid(),'operador'::app_role));

CREATE POLICY "Conferences delete by admin"
ON public.material_conferences FOR DELETE TO authenticated
USING (public.has_role(auth.uid(),'admin'::app_role));

CREATE POLICY "Conference items visible by conference scope"
ON public.material_conference_items FOR SELECT TO authenticated
USING (public.can_access_material_conference(conference_id));

CREATE POLICY "Conference items insert by staff"
ON public.material_conference_items FOR INSERT TO authenticated
WITH CHECK (public.has_role(auth.uid(),'admin'::app_role) OR public.has_role(auth.uid(),'operador'::app_role));

CREATE POLICY "Conference items update by staff"
ON public.material_conference_items FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(),'admin'::app_role) OR public.has_role(auth.uid(),'operador'::app_role))
WITH CHECK (public.has_role(auth.uid(),'admin'::app_role) OR public.has_role(auth.uid(),'operador'::app_role));

CREATE POLICY "Conference items delete by admin"
ON public.material_conference_items FOR DELETE TO authenticated
USING (public.has_role(auth.uid(),'admin'::app_role));

CREATE TRIGGER update_material_conferences_updated_at
BEFORE UPDATE ON public.material_conferences
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_material_conference_items_updated_at
BEFORE UPDATE ON public.material_conference_items
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();