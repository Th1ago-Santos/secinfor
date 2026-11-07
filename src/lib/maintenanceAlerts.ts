import { addDays, differenceInCalendarDays, format } from 'date-fns';
import type { Maintenance } from './preventiveMaintenance';
import { effectiveStatus, today } from './preventiveMaintenance';

export type PmAlertType = 'atrasada' | 'vence_hoje' | 'proximos_7_dias' | 'recorrencia_gerada';

export type PmAlert = {
  key: string; // maintenance_id + tipo — estável, sem duplicidade
  maintenanceId: string;
  type: PmAlertType;
  nivel: 'critico' | 'alto' | 'medio' | 'informativo';
  equipment: string;
  sectionId: string | null;
  sectionName: string | null;
  title: string;
  scheduledDate: string | null;
  responsible: string | null;
  days: number | null; // negativo = em atraso
  createdAt: string; // criação da manutenção (recorrência gerada)
  message: string;
};

export const PM_ALERT_TYPE_LABELS: Record<PmAlertType, string> = {
  atrasada: 'Manutenção atrasada',
  vence_hoje: 'Vence hoje',
  proximos_7_dias: 'Próxima do vencimento',
  recorrencia_gerada: 'Recorrência gerada',
};

export const PM_ALERT_NIVEL: Record<PmAlertType, PmAlert['nivel']> = {
  atrasada: 'critico',
  vence_hoje: 'alto',
  proximos_7_dias: 'medio',
  recorrencia_gerada: 'informativo',
};

/**
 * Deriva os alertas de manutenção diretamente dos dados atuais —
 * nenhuma cópia é gravada, então atualizar a página nunca duplica alertas.
 * Concluídas e canceladas nunca aparecem como vencidas.
 */
export function derivePmAlerts(items: Maintenance[], date = today()): PmAlert[] {
  const in7 = format(addDays(new Date(`${date}T12:00:00`), 7), 'yyyy-MM-dd');
  const alerts: PmAlert[] = [];

  for (const m of items) {
    const base = {
      maintenanceId: m.id,
      equipment: m.equipment_label || 'Não informado',
      sectionId: m.section_id,
      sectionName: m.section_name,
      title: m.title,
      scheduledDate: m.scheduled_date,
      responsible: m.assigned_name,
      createdAt: m.created_at,
    };
    const eff = effectiveStatus(m, date);

    if (eff === 'atrasada') {
      const days = differenceInCalendarDays(new Date(`${m.scheduled_date}T12:00:00`), new Date(`${date}T12:00:00`));
      alerts.push({
        ...base, key: `${m.id}:atrasada`, type: 'atrasada', nivel: 'critico', days,
        message: `${base.equipment}: manutenção "${m.title}" atrasada há ${Math.abs(days)} dia(s)`,
      });
    } else if (['planejada', 'em_andamento'].includes(m.status) && m.scheduled_date === date) {
      alerts.push({
        ...base, key: `${m.id}:vence_hoje`, type: 'vence_hoje', nivel: 'alto', days: 0,
        message: `${base.equipment}: manutenção "${m.title}" vence hoje`,
      });
    } else if (['planejada', 'em_andamento'].includes(m.status) && m.scheduled_date > date && m.scheduled_date <= in7) {
      const days = differenceInCalendarDays(new Date(`${m.scheduled_date}T12:00:00`), new Date(`${date}T12:00:00`));
      alerts.push({
        ...base, key: `${m.id}:proximos_7_dias`, type: 'proximos_7_dias', nivel: 'medio', days,
        message: `${base.equipment}: manutenção "${m.title}" vence em ${days} dia(s)`,
      });
    }

    if (m.generated_from_id) {
      alerts.push({
        ...base, key: `${m.id}:recorrencia_gerada`, type: 'recorrencia_gerada', nivel: 'informativo', days: null,
        message: `${base.equipment}: próxima manutenção "${m.title}" gerada automaticamente pela recorrência`,
      });
    }
  }

  const order: Record<PmAlert['nivel'], number> = { critico: 0, alto: 1, medio: 2, informativo: 3 };
  return alerts.sort((a, b) => order[a.nivel] - order[b.nivel] || (a.scheduledDate || '').localeCompare(b.scheduledDate || ''));
}
