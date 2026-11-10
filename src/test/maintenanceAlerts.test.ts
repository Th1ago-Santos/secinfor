import { describe, it, expect } from 'vitest';
import { derivePmAlerts, activePmAlerts, unreadPmAlerts, type PmAlertState } from '@/lib/maintenanceAlerts';
import type { Maintenance } from '@/lib/preventiveMaintenance';

const date = '2026-11-10';
const item = (changes: Partial<Maintenance> = {}): Maintenance => ({
  id: 'test', equipment_type: 'outro', notebook_id: null, material_id: null,
  equipment_label: 'Equipamento de teste', section_id: 'own', section_name: 'Informatica',
  title: 'Teste', description: null, maintenance_type: 'limpeza', status: 'planejada', priority: 'normal',
  scheduled_date: date, started_at: null, completed_at: null, cancelled_at: null,
  assigned_to: null, assigned_name: null, completed_by: null, notes: null, result: null,
  next_due_date: null, created_at: `${date}T12:00:00Z`, ...changes,
});
const state = (changes: Partial<PmAlertState> = {}): PmAlertState => ({
  maintenance_id: 'test', alert_type: 'vence_hoje', read_at: null, dismissed_at: null, ...changes,
});

describe('Alertas internos de manutenção', () => {
  it.each(['planejada', 'em_andamento'])('identifica atraso em %s', status => {
    expect(derivePmAlerts([item({ status, scheduled_date: '2026-11-09' })], date).map(a => a.type)).toEqual(['atrasada']);
  });
  it('identifica vencimento hoje', () => {
    expect(derivePmAlerts([item()], date).map(a => a.type)).toEqual(['vence_hoje']);
  });
  it('inclui os próximos sete dias, sem hoje e sem o oitavo dia', () => {
    const rows = [item({ id: '1', scheduled_date: '2026-11-11' }), item({ id: '7', scheduled_date: '2026-11-17' }), item({ id: '8', scheduled_date: '2026-11-18' })];
    expect(derivePmAlerts(rows, date).map(a => a.maintenanceId)).toEqual(['1', '7']);
  });
  it.each(['concluida', 'cancelada'])('não deriva alertas de prazo para %s', status => {
    expect(derivePmAlerts([item({ status, scheduled_date: '2026-11-09' })], date)).toEqual([]);
  });
  it('gera uma chave estável por recorrência em atualizações repetidas', () => {
    const rows = [item({ scheduled_date: '2026-12-10', generated_from_id: 'parent' })];
    expect(derivePmAlerts(rows, date).map(a => a.key)).toEqual(['test:recorrencia_gerada']);
    expect(derivePmAlerts(rows, date)).toEqual(derivePmAlerts(rows, date));
  });
  it('altera o tipo ao mover a data entre faixas', () => {
    expect(['2026-11-09', date, '2026-11-17', '2026-11-18'].map(scheduled_date => derivePmAlerts([item({ scheduled_date })], date)[0]?.type)).toEqual(['atrasada', 'vence_hoje', 'proximos_7_dias', undefined]);
  });
  it('reabrir faz o alerta de prazo reaparecer', () => {
    expect(derivePmAlerts([item({ status: 'cancelada' })], date)).toHaveLength(0);
    expect(derivePmAlerts([item({ status: 'planejada' })], date)).toHaveLength(1);
  });
  it('leitura reduz o contador sem remover da Central ativa', () => {
    const alerts = derivePmAlerts([item()], date), states = [state({ read_at: date })];
    expect(unreadPmAlerts(alerts, states)).toHaveLength(0);
    expect(activePmAlerts(alerts, states)).toHaveLength(1);
  });
  it('dispensa remove tanto do contador quanto da lista ativa', () => {
    const alerts = derivePmAlerts([item()], date), states = [state({ dismissed_at: date })];
    expect(unreadPmAlerts(alerts, states)).toHaveLength(0);
    expect(activePmAlerts(alerts, states)).toHaveLength(0);
  });
  it('o escopo da Central respeita a seção escolhida', () => {
    const alerts = derivePmAlerts([item(), item({ id: 'other', section_name: 'S1', section_id: 'other' })], date);
    expect(activePmAlerts(alerts, [], 'Informatica').map(a => a.maintenanceId)).toEqual(['test']);
    expect(activePmAlerts(alerts, [], null)).toHaveLength(2);
  });
  it('o estado de uma faixa não suprime outra faixa', () => {
    expect(unreadPmAlerts(derivePmAlerts([item({ scheduled_date: '2026-11-09' })], date), [state({ read_at: date })])).toHaveLength(1);
  });
});