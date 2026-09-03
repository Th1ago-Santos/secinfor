ALTER TABLE public.materials
  ADD COLUMN IF NOT EXISTS section_id uuid REFERENCES public.sections(id),
  ADD COLUMN IF NOT EXISTS section_name text,
  ADD COLUMN IF NOT EXISTS responsavel text,
  ADD COLUMN IF NOT EXISTS situacao text,
  ADD COLUMN IF NOT EXISTS quantidade integer NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS unidade text DEFAULT 'UN',
  ADD COLUMN IF NOT EXISTS valor_unitario numeric(14,2),
  ADD COLUMN IF NOT EXISTS data_aquisicao date,
  ADD COLUMN IF NOT EXISTS nota_fiscal text,
  ADD COLUMN IF NOT EXISTS estado_conservacao text,
  ADD COLUMN IF NOT EXISTS observacoes text;

UPDATE public.materials m
   SET section_id = s.id, section_name = s.name
  FROM public.sections s
 WHERE m.section_id IS NULL
   AND m.section_name IS NOT NULL
   AND lower(btrim(m.section_name)) = lower(btrim(s.name));

CREATE INDEX IF NOT EXISTS idx_materials_section_id ON public.materials(section_id);
CREATE INDEX IF NOT EXISTS idx_materials_situacao ON public.materials(situacao);
CREATE INDEX IF NOT EXISTS idx_materials_patrimonio ON public.materials(patrimonio);
CREATE INDEX IF NOT EXISTS idx_materials_numero_ficha ON public.materials(numero_ficha);
CREATE INDEX IF NOT EXISTS idx_materials_codigo_material ON public.materials(codigo_material);
CREATE INDEX IF NOT EXISTS idx_materials_responsavel ON public.materials(responsavel);

CREATE OR REPLACE FUNCTION public.can_access_material(_material_id uuid)
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
      SELECT 1 FROM public.materials m
      WHERE m.id = _material_id
        AND (
          (m.section_id IS NOT NULL AND m.section_id = public.get_user_section_id(auth.uid()))
          OR (m.section_name IS NOT NULL AND m.section_name = public.get_user_section(auth.uid()))
        )
    )
    ELSE true
  END
$$;

REVOKE EXECUTE ON FUNCTION public.can_access_material(uuid) FROM anon;

DROP POLICY IF EXISTS "Authenticated users can view materials" ON public.materials;
CREATE POLICY "Materials visible by section scope"
ON public.materials FOR SELECT TO authenticated
USING (public.can_access_material(id));