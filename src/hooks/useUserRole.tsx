import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export type AppRole = 'admin' | 'operador' | 'visualizador';

export function useUserRole() {
  const { user } = useAuth();
  const [role, setRole] = useState<AppRole | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) { setRole(null); setLoading(false); return; }

    supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .maybeSingle()
      .then(({ data }) => {
        setRole((data?.role as AppRole) || 'visualizador');
        setLoading(false);
      });
  }, [user]);

  const isAdmin = role === 'admin';
  const isOperador = role === 'operador';
  const isVisualizador = role === 'visualizador';
  const canEdit = role === 'admin' || role === 'operador';

  return { role, loading, isAdmin, isOperador, isVisualizador, canEdit };
}
