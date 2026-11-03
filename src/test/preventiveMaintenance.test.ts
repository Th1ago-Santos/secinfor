import { describe, expect, it } from 'vitest';
import { effectiveStatus, filterMaintenances, maintenanceSummary, type Maintenance, type MaintenanceFilters } from '../lib/preventiveMaintenance';

const date = '2026-11-03';
const row: Maintenance = {
  id: 'one', equipment_type: 'outro', notebook_id: null, material_id: null, equipment_label: 'Computador',
  section_id: 'sec-a', section_name: 'Informática', title: 'Limpeza', description: null, maintenance_type: 'limpeza',
  status: 'planejada', priority: 'alta', scheduled_date: '2026-11-02', started_at: null, completed_at: null,
  cancelled_at: null, assigned_to: null, assigned_name: 'Técnico', completed_by: null, notes: null, result: null,
  next_due_date: null, created_at: date,
};
const filters: MaintenanceFilters = { section: 'all', status: 'all', type: 'all', priority: 'all', responsible: 'all', from: '', to: '', query: '' };

describe('Manutenção preventiva: regras compartilhadas', () => {
  it('Planejada vencida é Atrasada', () => expect(effectiveStatus(row, date)).toBe('atrasada'));
  it('Em andamento vencida é Atrasada', () => expect(effectiveStatus({ ...row, status: 'em_andamento' }, date)).toBe('atrasada'));
  it('Concluída não é Atrasada', () => expect(effectiveStatus({ ...row, status: 'concluida' }, date)).toBe('concluida'));
  it('Cancelada não é Atrasada', () => expect(effectiveStatus({ ...row, status: 'cancelada' }, date)).toBe('cancelada'));
  it('Data de hoje ainda não está vencida', () => expect(effectiveStatus({ ...row, scheduled_date: date }, date)).toBe('planejada'));
  it.each([
    ['section', 'sec-b'], ['status', 'concluida'], ['type', 'backup'], ['priority', 'baixa'],
    ['responsible', 'Outro'], ['from', '2026-11-03'], ['to', '2026-11-01'], ['query', 'inexistente'],
  ])('O filtro %s exclui registros incompatíveis', (key, value) => {
    expect(filterMaintenances([row], { ...filters, [key]: value }, null, date)).toHaveLength(0);
  });
  it('Combina os filtros sem perder o atraso derivado', () => {
    expect(filterMaintenances([row], { section: 'sec-a', status: 'atrasada', type: 'limpeza', priority: 'alta', responsible: 'Técnico', from: '2026-11-01', to: '2026-11-03', query: 'computador' }, null, date)).toEqual([row]);
  });
  it('Manipular a seção não amplia o escopo do Chefe', () => {
    expect(filterMaintenances([row], filters, 'sec-b', date)).toHaveLength(0);
  });
  it('Resumo e filtro usam o mesmo atraso para Em andamento', () => {
    const rows = filterMaintenances([{ ...row, status: 'em_andamento' }], { ...filters, status: 'atrasada' }, null, date);
    const summary = maintenanceSummary(rows, [], date);
    expect(summary.atrasadas).toBe(1);
    expect(summary.andamento).toBe(0);
  });
});