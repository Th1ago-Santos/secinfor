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
  const [sectionId, setSectionId] = useState<string | null>(null);
  const [sectionName, setSectionName] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    if (!user) {
      setRole(null); setSectionId(null); setSectionName(null); setLoading(false);
      return;
    }
    setLoading(true);
    (async () => {
      const [roleRes, profileRes] = await Promise.all([
        supabase.from('user_roles').select('role').eq('user_id', user.id).maybeSingle(),
        supabase.from('profiles').select('section_id, section_name').eq('user_id', user.id).maybeSingle(),
      ]);
      if (!alive) return;
      setRole((roleRes.data?.role as AppRole) || 'visualizador');
      setSectionId((profileRes.data as any)?.section_id ?? null);
      setSectionName((profileRes.data as any)?.section_name ?? null);
      setLoading(false);
    })();
    return () => { alive = false; };
  }, [user]);

  const isAdmin = role === 'admin';
  const isOperador = role === 'operador';
  const isChefeSecao = role === 'chefe_secao';
  const isVisualizador = role === 'visualizador';
  const canEdit = role === 'admin' || role === 'operador';
  // Chefe de seção acompanha chamados da tropa: leitura ampliada, sem escrita técnica
  const canViewInternal = role === 'admin' || role === 'operador' || role === 'chefe_secao';

  // Escopo de seção: quando definido, todas as listagens devem ser filtradas por ele
  const sectionScope = isChefeSecao ? sectionName : null;
  const isSectionScoped = isChefeSecao;
  const missingSection = isChefeSecao && !sectionName;

  // Permissões administrativas globais
  const canManageUsers = isAdmin;
  const canViewAudit = isAdmin;
  const canManageSettings = isAdmin;

  return {
    role, loading, isAdmin, isOperador, isChefeSecao, isVisualizador,
    canEdit, canViewInternal,
    sectionId, sectionName, sectionScope, isSectionScoped, missingSection,
    canManageUsers, canViewAudit, canManageSettings,
  };
}
