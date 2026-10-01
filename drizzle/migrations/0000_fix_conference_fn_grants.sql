REVOKE EXECUTE ON FUNCTION public.can_access_material_conference(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.can_access_material_conference(uuid) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.can_access_material(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.can_access_material(uuid) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.get_user_section(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_user_section(uuid) TO authenticated;