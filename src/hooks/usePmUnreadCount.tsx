import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useUserRole } from '@/hooks/useUserRole';
import { derivePmAlerts } from '@/lib/maintenanceAlerts';
import type { Maintenance } from '@/lib/preventiveMaintenance';

/**
 * Contador de alertas de Manutenção Preventiva não lidos do usuário.
 * O RLS de preventive_maintenances já limita o Chefe de Seção à própria
 * seção; Visualizador e visitante não recebem contagem.
 */
export function usePmUnreadCount() {
  const { user } = useAuth();
  const { role, isVisualizador } = useUserRole();
  const allowed = !!user && !!role && !isVisualizador;

  const { data: count = 0 } = useQuery({
    queryKey: ['pm-unread-count', user?.id, role],
    enabled: allowed,
    refetchInterval: 60_000,
    staleTime: 15_000,
    queryFn: async () => {
      const [{ data: maintenances }, { data: states }] = await Promise.all([
        supabase.from('preventive_maintenances').select('*'),
        supabase.from('pm_alert_states').select('maintenance_id, alert_type, read_at, dismissed_at'),
      ]);
      const done = new Set(
        (states || []).filter((s: any) => s.read_at || s.dismissed_at).map((s: any) => `${s.maintenance_id}:${s.alert_type}`)
      );
      return derivePmAlerts(((maintenances as Maintenance[]) || [])).filter(a => !done.has(a.key)).length;
    },
  });

  return allowed ? count : 0;
}
