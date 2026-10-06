CREATE TABLE public.preventive_maintenances (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  equipment_type text NOT NULL DEFAULT 'notebook',
  notebook_id uuid REFERENCES public.notebooks(id) ON DELETE SET NULL,
  material_id uuid REFERENCES public.materials(id) ON DELETE SET NULL,
  equipment_label text,
  section_id uuid REFERENCES public.sections(id) ON DELETE SET NULL,
  section_name text,
  title text NOT NULL,
  description text,
  maintenance_type text NOT NULL,
  status text NOT NULL DEFAULT 'planejada',
  priority text NOT NULL DEFAULT 'normal',
  scheduled_date date NOT NULL,
  started_at timestamptz,
  completed_at timestamptz,
  cancelled_at timestamptz,
  assigned_to uuid,
  assigned_name text,
  completed_by uuid,
  notes text,
  result text,
  next_due_date date,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT pm_status_chk CHECK (status IN ('planejada','em_andamento','concluida','atrasada','cancelada')),
  CONSTRAINT pm_type_chk CHECK (maintenance_type IN ('limpeza','verificacao_fisica','atualizacao_sistema','antivirus','backup','diagnostico','outro')),
  CONSTRAINT pm_priority_chk CHECK (priority IN ('baixa','normal','alta','urgente')),
  CONSTRAINT pm_equipment_chk CHECK (equipment_type IN ('notebook','material','outro')),
  CONSTRAINT pm_title_chk CHECK (length(btrim(title)) > 0)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.preventive_maintenances TO authenticated;
GRANT ALL ON public.preventive_maintenances TO service_role;

ALTER TABLE public.preventive_maintenances ENABLE ROW LEVEL SECURITY;

CREATE POLICY "pm_select" ON public.preventive_maintenances FOR SELECT TO authenticated
USING (
  public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'operador')
  OR (public.has_role(auth.uid(),'chefe_secao') AND section_id IS NOT NULL AND section_id = public.get_user_section_id(auth.uid()))
);
CREATE POLICY "pm_insert" ON public.preventive_maintenances FOR INSERT TO authenticated
WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'operador'));
CREATE POLICY "pm_update" ON public.preventive_maintenances FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'operador'))
WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'operador'));
CREATE POLICY "pm_delete" ON public.preventive_maintenances FOR DELETE TO authenticated
USING (public.has_role(auth.uid(),'admin'));

CREATE INDEX pm_section_idx ON public.preventive_maintenances(section_id);
CREATE INDEX pm_status_idx ON public.preventive_maintenances(status);
CREATE INDEX pm_scheduled_idx ON public.preventive_maintenances(scheduled_date);
CREATE INDEX pm_notebook_idx ON public.preventive_maintenances(notebook_id);

CREATE TRIGGER pm_updated_at BEFORE UPDATE ON public.preventive_maintenances
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();