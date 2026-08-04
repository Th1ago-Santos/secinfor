ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS section_id uuid REFERENCES public.sections(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS section_name text;

CREATE INDEX IF NOT EXISTS idx_profiles_section_id ON public.profiles(section_id);

CREATE OR REPLACE FUNCTION public.get_user_section(_user_id uuid)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT section_name FROM public.profiles WHERE user_id = _user_id LIMIT 1
$$;

REVOKE EXECUTE ON FUNCTION public.get_user_section(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.get_user_section(uuid) TO authenticated;

-- Somente administradores podem alterar o vínculo de seção de um perfil
DROP POLICY IF EXISTS "Admins can update any profile" ON public.profiles;
CREATE POLICY "Admins can update any profile"
ON public.profiles FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));