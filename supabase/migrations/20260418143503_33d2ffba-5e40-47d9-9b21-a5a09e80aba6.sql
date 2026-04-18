
-- Drop legacy duplicate permissive policies
DROP POLICY IF EXISTS "Auth users can delete alerts" ON public.alerts;
DROP POLICY IF EXISTS "Auth users can insert alerts" ON public.alerts;
DROP POLICY IF EXISTS "Auth users can update alerts" ON public.alerts;

DROP POLICY IF EXISTS "Auth users can insert priorities" ON public.computer_priorities;
DROP POLICY IF EXISTS "Auth users can delete priorities" ON public.computer_priorities;
DROP POLICY IF EXISTS "Auth users can update priorities" ON public.computer_priorities;

DROP POLICY IF EXISTS "Auth users can insert inventory items" ON public.inventory_items;
DROP POLICY IF EXISTS "Auth users can update inventory sessions" ON public.inventory_sessions;
DROP POLICY IF EXISTS "Auth users can insert inventory sessions" ON public.inventory_sessions;

-- Movements: restrict writes to admins/operators
DROP POLICY IF EXISTS "Authenticated users can insert movements" ON public.movements;

CREATE POLICY "Admins and operators can insert movements"
  ON public.movements FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'operador'));
