
CREATE OR REPLACE FUNCTION public.lookup_patrimonio(p_patrimonio text)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result jsonb;
BEGIN
  -- Try notebooks first
  SELECT jsonb_build_object(
    'id', id,
    'patrimonio', patrimonio,
    'tipo', 'notebook',
    'modelo', modelo,
    'secao', secao,
    'militar', militar,
    'status', status,
    'foto_url', foto_url,
    'created_at', created_at,
    'updated_at', updated_at
  ) INTO result
  FROM public.notebooks
  WHERE patrimonio = p_patrimonio
  LIMIT 1;

  IF result IS NOT NULL THEN
    RETURN result;
  END IF;

  -- Try materials
  SELECT jsonb_build_object(
    'id', id,
    'patrimonio', patrimonio,
    'tipo', 'material',
    'nome', nome,
    'codigo_material', codigo_material,
    'numero_ficha', numero_ficha,
    'created_at', created_at,
    'updated_at', updated_at
  ) INTO result
  FROM public.materials
  WHERE patrimonio = p_patrimonio
  LIMIT 1;

  RETURN result;
END;
$$;
