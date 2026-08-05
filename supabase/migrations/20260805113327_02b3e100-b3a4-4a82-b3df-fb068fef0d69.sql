
-- Helper: sessão de inventário acessível pelo usuário atual
CREATE OR REPLACE FUNCTION public.can_access_inventory_session(_session_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT CASE
    WHEN auth.uid() IS NULL THEN false
    WHEN public.has_role(auth.uid(), 'admin'::app_role)
      OR public.has_role(auth.uid(), 'operador'::app_role) THEN true
    WHEN public.has_role(auth.uid(), 'chefe_secao'::app_role) THEN EXISTS (
      SELECT 1 FROM public.inventory_sessions s
      WHERE s.id = _session_id
        AND s.secao_alvo IS NOT NULL
        AND s.secao_alvo = public.get_user_section(auth.uid())
    )
    ELSE EXISTS (
      SELECT 1 FROM public.inventory_sessions s
      WHERE s.id = _session_id AND s.usuario_id = auth.uid()
    )
  END
$$;

REVOKE ALL ON FUNCTION public.can_access_inventory_session(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.can_access_inventory_session(uuid) TO authenticated;

-- inventory_sessions
DROP POLICY IF EXISTS "Auth users can view inventory sessions" ON public.inventory_sessions;
DROP POLICY IF EXISTS "Owners or admins can view inventory sessions" ON public.inventory_sessions;
CREATE POLICY "Scoped view of inventory sessions" ON public.inventory_sessions
FOR SELECT TO authenticated
USING (
  usuario_id = auth.uid()
  OR public.has_role(auth.uid(), 'admin'::app_role)
  OR public.has_role(auth.uid(), 'operador'::app_role)
  OR (
    public.has_role(auth.uid(), 'chefe_secao'::app_role)
    AND secao_alvo IS NOT NULL
    AND secao_alvo = public.get_user_section(auth.uid())
  )
);

-- inventory_items
DROP POLICY IF EXISTS "Auth users can view inventory items" ON public.inventory_items;
DROP POLICY IF EXISTS "Owners or admins can view inventory items" ON public.inventory_items;
CREATE POLICY "Scoped view of inventory items" ON public.inventory_items
FOR SELECT TO authenticated
USING (
  usuario_id = auth.uid()
  OR public.can_access_inventory_session(session_id)
);

-- notebooks: chefe de seção limitado à própria seção
DROP POLICY IF EXISTS "Authenticated users can view notebooks" ON public.notebooks;
CREATE POLICY "Authenticated users can view notebooks" ON public.notebooks
FOR SELECT TO authenticated
USING (
  NOT public.has_role(auth.uid(), 'chefe_secao'::app_role)
  OR secao = public.get_user_section(auth.uid())
);

-- materials (Material Carga): sem vínculo de seção -> chefe de seção não acessa
DROP POLICY IF EXISTS "Authenticated users can view materials" ON public.materials;
CREATE POLICY "Authenticated users can view materials" ON public.materials
FOR SELECT TO authenticated
USING (NOT public.has_role(auth.uid(), 'chefe_secao'::app_role));

-- movements: chefe de seção só vê movimentações de equipamentos da própria seção
DROP POLICY IF EXISTS "Authenticated users can view movements" ON public.movements;
CREATE POLICY "Authenticated users can view movements" ON public.movements
FOR SELECT TO authenticated
USING (
  NOT public.has_role(auth.uid(), 'chefe_secao'::app_role)
  OR EXISTS (
    SELECT 1 FROM public.notebooks n
    WHERE n.id = movements.item_id
      AND n.secao = public.get_user_section(auth.uid())
  )
);
