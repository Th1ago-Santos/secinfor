import { describe, expect, it } from 'vitest';
import { effectiveStatus, filterMaintenances, maintenanceSummary, nextRecurrenceDate, validRecurrence, type Maintenance, type MaintenanceFilters } from '../lib/preventiveMaintenance';

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
  it('Recorrência em dias soma a quantidade', () => expect(nextRecurrenceDate('2026-11-04', 3, 'dias')).toBe('2026-11-07'));
  it('Recorrência semanal soma sete dias por semana', () => expect(nextRecurrenceDate('2026-11-04', 2, 'semanas')).toBe('2026-11-18'));
  it('Mensal preserva calendário e limita ao último dia', () => expect(nextRecurrenceDate('2026-01-31', 1, 'meses')).toBe('2026-02-28'));
  it('Anual limita dia bissexto ao último dia de fevereiro', () => expect(nextRecurrenceDate('2024-02-29', 1, 'anos')).toBe('2025-02-28'));
  it('Próxima data explícita prevalece', () => expect(nextRecurrenceDate('2026-11-04', 1, 'dias', '2026-12-20')).toBe('2026-12-20'));
  it.each([0, -1, 1.5])('Intervalo %s não é inteiro positivo válido', quantity => expect(validRecurrence(quantity, 'dias')).toBe(false));
  it('Unidade desconhecida é rejeitada', () => expect(validRecurrence(1, 'horas')).toBe(false));
  it('Filha planejada entra no resumo e filtros', () => {
    const child = { ...row, status: 'planejada', scheduled_date: '2026-11-05', generated_from_id: 'parent', recurrence_enabled: true };
    const rows = filterMaintenances([child], { ...filters, status: 'planejada' }, null, date);
    expect(maintenanceSummary(rows, [], date).planejadas).toBe(1);
  });
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