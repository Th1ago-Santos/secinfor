
-- 1. Fix profiles default role and add safe INSERT/DELETE policies
ALTER TABLE public.profiles ALTER COLUMN role SET DEFAULT 'visualizador';

DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
CREATE POLICY "Users can insert own profile"
  ON public.profiles FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id AND role = 'visualizador');

DROP POLICY IF EXISTS "Only admins can delete profiles" ON public.profiles;
CREATE POLICY "Only admins can delete profiles"
  ON public.profiles FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Prevent users from changing their own role via UPDATE (keep existing "Users can update own profile")
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id AND role = (SELECT role FROM public.profiles WHERE user_id = auth.uid()));

-- 2. Lock down SECURITY DEFINER functions - revoke from anon/authenticated where not needed
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.handle_new_user_role() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.update_updated_at_column() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.batch_update_priority_order(uuid[], integer[]) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.has_role(uuid, app_role) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.lookup_patrimonio(text) FROM PUBLIC;
-- Keep lookup_patrimonio callable by anon (public QR lookup) and authenticated
GRANT EXECUTE ON FUNCTION public.lookup_patrimonio(text) TO anon, authenticated;
-- has_role still needed by authenticated for RLS evaluation via SECURITY DEFINER, but not directly callable is fine because RLS uses it as owner
GRANT EXECUTE ON FUNCTION public.has_role(uuid, app_role) TO authenticated;

-- 3. Realtime authorization: deny broadcast/presence unless explicitly allowed
-- postgres_changes on alerts/computer_priorities remain governed by source table RLS
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'realtime' AND tablename = 'messages') THEN
    EXECUTE 'ALTER TABLE realtime.messages ENABLE ROW LEVEL SECURITY';
    EXECUTE 'DROP POLICY IF EXISTS "Deny broadcast and presence by default" ON realtime.messages';
    EXECUTE $p$CREATE POLICY "Deny broadcast and presence by default"
      ON realtime.messages FOR SELECT TO authenticated
      USING (false)$p$;
  END IF;
END $$;
