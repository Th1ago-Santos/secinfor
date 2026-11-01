import { format } from 'date-fns';

export type Maintenance = {
  id: string; equipment_type: string; notebook_id: string | null; material_id: string | null;
  equipment_label: string | null; section_id: string | null; section_name: string | null;
  title: string; description: string | null; maintenance_type: string; status: string; priority: string;
  scheduled_date: string; started_at: string | null; completed_at: string | null; cancelled_at: string | null;
  assigned_to: string | null; assigned_name: string | null; completed_by: string | null;
  notes: string | null; result: string | null; next_due_date: string | null; created_at: string;
};
export const PM_STATUS: Record<string, { label: string; color: string }> = {
  planejada: { label: 'Planejada', color: '#3b82f6' },
  em_andamento: { label: 'Em andamento', color: '#d97706' },
  concluida: { label: 'Concluída', color: '#16a34a' },
  atrasada: { label: 'Atrasada', color: '#dc2626' },
  cancelada: { label: 'Cancelada', color: '#64748b' },
};
export const PM_TYPES: Record<string, string> = {
  limpeza: 'Limpeza', verificacao_fisica: 'Verificação física', atualizacao_sistema: 'Atualização de sistema',
  antivirus: 'Antivírus', backup: 'Backup', diagnostico: 'Diagnóstico', outro: 'Outro',
};
export const PM_PRIORITY: Record<string, { label: string; color: string }> = {
  baixa: { label: 'Baixa', color: '#64748b' }, normal: { label: 'Normal', color: '#0ea5e9' },
  alta: { label: 'Alta', color: '#f97316' }, urgente: { label: 'Urgente', color: '#ef4444' },
};
export const today = () => format(new Date(), 'yyyy-MM-dd');
export const fmtDate = (date: string | null) => date ? date.slice(0, 10).split('-').reverse().join('/') : 'Não informado';
export function effectiveStatus(m: Pick<Maintenance, 'status' | 'scheduled_date'>, date = today()) {
  return ['planejada', 'em_andamento'].includes(m.status) && m.scheduled_date < date ? 'atrasada' : m.status;
}
export type MaintenanceFilters = {
  section: string; status: string; type: string; priority: string; responsible: string;
  from: string; to: string; query: string;
};
export function filterMaintenances(items: Maintenance[], filters: MaintenanceFilters, scope: string | null = null, date = today()) {
  return items.filter(m => {
    if (scope && m.section_id !== scope) return false;
    if (filters.section !== 'all' && m.section_id !== filters.section) return false;
    if (filters.status !== 'all' && effectiveStatus(m, date) !== filters.status) return false;
    if (filters.type !== 'all' && m.maintenance_type !== filters.type) return false;
    if (filters.priority !== 'all' && m.priority !== filters.priority) return false;
    if (filters.responsible !== 'all' && (m.assigned_name || '') !== filters.responsible) return false;
    if (filters.from && m.scheduled_date < filters.from) return false;
    if (filters.to && m.scheduled_date > filters.to) return false;
    const q = filters.query.trim().toLowerCase();
    return !q || [m.title, m.equipment_label, m.section_name, m.assigned_name, m.description].some(v => v?.toLowerCase().includes(q));
  });
}
export function maintenanceSummary(items: Maintenance[], notebooks: { id: string }[], date = today()) {
  const next = new Date(`${date}T12:00:00`); next.setDate(next.getDate() + 7);
  const in7 = format(next, 'yyyy-MM-dd');
  const withNext = new Set(items.filter(m => m.notebook_id && m.status !== 'cancelada' &&
    ((m.next_due_date && m.next_due_date >= date) || (['planejada', 'em_andamento'].includes(m.status) && m.scheduled_date >= date))).map(m => m.notebook_id));
  return {
    planejadas: items.filter(m => effectiveStatus(m, date) === 'planejada').length,
    andamento: items.filter(m => effectiveStatus(m, date) === 'em_andamento').length,
    atrasadas: items.filter(m => effectiveStatus(m, date) === 'atrasada').length,
    concluidasMes: items.filter(m => m.status === 'concluida' && m.completed_at?.slice(0, 7) === date.slice(0, 7)).length,
    proximas: items.filter(m => ['planejada', 'em_andamento'].includes(m.status) && m.scheduled_date >= date && m.scheduled_date <= in7).length,
    semProxima: notebooks.filter(n => !withNext.has(n.id)).length,
  };
}