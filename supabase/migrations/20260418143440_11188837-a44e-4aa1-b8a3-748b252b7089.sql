
-- ============================================================
-- 1. Tighten RLS policies on core tables (role-aware writes)
-- ============================================================

-- NOTEBOOKS
DROP POLICY IF EXISTS "Authenticated users can insert notebooks" ON public.notebooks;
DROP POLICY IF EXISTS "Authenticated users can update notebooks" ON public.notebooks;
DROP POLICY IF EXISTS "Authenticated users can delete notebooks" ON public.notebooks;

CREATE POLICY "Admins and operators can insert notebooks"
  ON public.notebooks FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'operador'));

CREATE POLICY "Admins and operators can update notebooks"
  ON public.notebooks FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'operador'))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'operador'));

CREATE POLICY "Only admins can delete notebooks"
  ON public.notebooks FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- MATERIALS
DROP POLICY IF EXISTS "Authenticated users can insert materials" ON public.materials;
DROP POLICY IF EXISTS "Authenticated users can update materials" ON public.materials;
DROP POLICY IF EXISTS "Authenticated users can delete materials" ON public.materials;

CREATE POLICY "Admins and operators can insert materials"
  ON public.materials FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'operador'));

CREATE POLICY "Admins and operators can update materials"
  ON public.materials FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'operador'))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'operador'));

CREATE POLICY "Only admins can delete materials"
  ON public.materials FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- SECTIONS
DROP POLICY IF EXISTS "Authenticated users can insert sections" ON public.sections;
DROP POLICY IF EXISTS "Authenticated users can update sections" ON public.sections;
DROP POLICY IF EXISTS "Authenticated users can delete sections" ON public.sections;

CREATE POLICY "Only admins can insert sections"
  ON public.sections FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Only admins can update sections"
  ON public.sections FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Only admins can delete sections"
  ON public.sections FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- ALERTS
DROP POLICY IF EXISTS "Authenticated users can insert alerts" ON public.alerts;
DROP POLICY IF EXISTS "Authenticated users can update alerts" ON public.alerts;
DROP POLICY IF EXISTS "Authenticated users can delete alerts" ON public.alerts;

CREATE POLICY "Admins and operators can insert alerts"
  ON public.alerts FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'operador'));

CREATE POLICY "Admins and operators can update alerts"
  ON public.alerts FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'operador'))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'operador'));

CREATE POLICY "Only admins can delete alerts"
  ON public.alerts FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- COMPUTER_PRIORITIES
DROP POLICY IF EXISTS "Authenticated users can insert priorities" ON public.computer_priorities;
DROP POLICY IF EXISTS "Authenticated users can update priorities" ON public.computer_priorities;
DROP POLICY IF EXISTS "Authenticated users can delete priorities" ON public.computer_priorities;

CREATE POLICY "Admins and operators can insert priorities"
  ON public.computer_priorities FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'operador'));

CREATE POLICY "Admins and operators can update priorities"
  ON public.computer_priorities FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'operador'))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'operador'));

CREATE POLICY "Only admins can delete priorities"
  ON public.computer_priorities FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- INVENTORY_SESSIONS
DROP POLICY IF EXISTS "Authenticated users can insert sessions" ON public.inventory_sessions;
DROP POLICY IF EXISTS "Authenticated users can update sessions" ON public.inventory_sessions;

CREATE POLICY "Admins and operators can insert inventory sessions"
  ON public.inventory_sessions FOR INSERT TO authenticated
  WITH CHECK (
    (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'operador'))
    AND usuario_id = auth.uid()
  );

CREATE POLICY "Admins and operators can update inventory sessions"
  ON public.inventory_sessions FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'operador'))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'operador'));

-- INVENTORY_ITEMS
DROP POLICY IF EXISTS "Authenticated users can insert inventory items" ON public.inventory_items;

CREATE POLICY "Admins and operators can insert inventory items"
  ON public.inventory_items FOR INSERT TO authenticated
  WITH CHECK (
    (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'operador'))
    AND usuario_id = auth.uid()
  );

-- ============================================================
-- 2. Lock down notebook-photos storage bucket
-- ============================================================
UPDATE storage.buckets SET public = false WHERE id = 'notebook-photos';

DROP POLICY IF EXISTS "Anyone can view photos" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload photos" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update photos" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete photos" ON storage.objects;

CREATE POLICY "Authenticated users can view notebook photos"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'notebook-photos');

CREATE POLICY "Admins and operators can upload notebook photos"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'notebook-photos'
    AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'operador'))
  );

CREATE POLICY "Admins and operators can update notebook photos"
  ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'notebook-photos'
    AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'operador'))
  );

CREATE POLICY "Admins can delete notebook photos"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'notebook-photos'
    AND public.has_role(auth.uid(), 'admin')
  );
