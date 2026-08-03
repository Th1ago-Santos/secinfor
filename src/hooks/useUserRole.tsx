import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export type AppRole = 'admin' | 'operador' | 'chefe_secao' | 'visualizador';

export const ROLE_LABELS: Record<AppRole, string> = {
  admin: 'Administrador',
  operador: 'Operador',
  chefe_secao: 'Chefe de Seção',
  visualizador: 'Visualizador',
};

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
  const isChefeSecao = role === 'chefe_secao';
  const isVisualizador = role === 'visualizador';
  const canEdit = role === 'admin' || role === 'operador';
  // Chefe de seção acompanha chamados da tropa: leitura ampliada, sem escrita técnica
  const canViewInternal = role === 'admin' || role === 'operador' || role === 'chefe_secao';

  return { role, loading, isAdmin, isOperador, isChefeSecao, isVisualizador, canEdit, canViewInternal };
}
