import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useUserRole } from '@/hooks/useUserRole';
import { derivePmAlerts, unreadPmAlerts, type PmAlertState } from '@/lib/maintenanceAlerts';
import type { Maintenance } from '@/lib/preventiveMaintenance';

/**
 * Contador de alertas de Manutenção Preventiva não lidos do usuário.
 * O RLS de preventive_maintenances já limita o Chefe de Seção à própria
 * seção; Visualizador e visitante não recebem contagem.
 */
export function usePmAlertData() {
  const { user } = useAuth();
  const { role, sectionId } = useUserRole();
  const allowed = !!user && (role === 'admin' || role === 'operador' || (role === 'chefe_secao' && !!sectionId));

  const maintenances = useQuery({
    queryKey: ['pm-alerts-maintenances', user?.id, role, sectionId],
    enabled: allowed,
    refetchInterval: 15_000,
    staleTime: 15_000,
    queryFn: async () => {
      const { data, error } = await supabase.from('preventive_maintenances').select('*').order('scheduled_date');
      if (error) throw error;
      return (data || []) as Maintenance[];
    },
  });

  const states = useQuery({
    queryKey: ['pm-alert-states', user?.id, role, sectionId],
    enabled: allowed,
    refetchInterval: 15_000,
    staleTime: 10_000,
    queryFn: async () => {
      const { data, error } = await supabase.from('pm_alert_states').select('maintenance_id, alert_type, read_at, dismissed_at');
      if (error) throw error;
      return (data || []) as PmAlertState[];
    },
  });
  const alerts = useMemo(() => allowed ? derivePmAlerts(maintenances.data || []) : [], [allowed, maintenances.data]);
  const pmStates = useMemo(() => allowed ? states.data || [] : [], [allowed, states.data]);
  return { alerts, states: pmStates, loading: allowed && (maintenances.isLoading || states.isLoading),
    error: maintenances.error || states.error,
    refresh: () => Promise.all([maintenances.refetch(), states.refetch()]) };
}

export function usePmUnreadCount() {
  const { alerts, states } = usePmAlertData();
  return unreadPmAlerts(alerts, states).length;
}
