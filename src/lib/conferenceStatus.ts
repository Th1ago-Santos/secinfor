/**
 * Status da Conferência de Carga (independente das cores de chamados).
 */

export const CONFERENCE_STATUSES = ['em_andamento', 'concluida', 'reaberta', 'cancelada'] as const;
export type ConferenceStatus = (typeof CONFERENCE_STATUSES)[number];

export const CONFERENCE_STATUS_LABELS: Record<string, string> = {
  em_andamento: 'Em andamento',
  concluida: 'Concluída',
  reaberta: 'Reaberta',
  cancelada: 'Cancelada',
};

const CONF_CLASSES: Record<string, string> = {
  em_andamento: 'bg-sky-500/12 text-sky-600 dark:text-sky-400 border-sky-500/25',
  concluida: 'bg-emerald-500/12 text-emerald-600 dark:text-emerald-400 border-emerald-500/25',
  reaberta: 'bg-amber-500/12 text-amber-600 dark:text-amber-400 border-amber-500/25',
  cancelada: 'bg-muted text-muted-foreground border-border',
};

export function conferenceBadgeClass(status?: string | null): string {
  return CONF_CLASSES[(status ?? '').trim()] ?? 'bg-muted text-muted-foreground border-border';
}

export const ITEM_STATUSES = [
  'pendente',
  'conferido',
  'faltando',
  'divergente',
  'fora_da_secao',
  'sem_responsavel',
  'cadastro_incompleto',
] as const;
export type ConferenceItemStatus = (typeof ITEM_STATUSES)[number];

export const ITEM_STATUS_LABELS: Record<string, string> = {
  pendente: 'Pendente',
  conferido: 'Conferido',
  faltando: 'Faltando',
  divergente: 'Divergente',
  fora_da_secao: 'Fora da seção',
  sem_responsavel: 'Sem responsável',
  cadastro_incompleto: 'Cadastro incompleto',
};

const ITEM_CLASSES: Record<string, string> = {
  pendente: 'bg-muted text-muted-foreground border-border',
  conferido: 'bg-emerald-500/12 text-emerald-600 dark:text-emerald-400 border-emerald-500/25',
  faltando: 'bg-destructive/12 text-destructive border-destructive/25',
  divergente: 'bg-orange-500/12 text-orange-600 dark:text-orange-400 border-orange-500/25',
  fora_da_secao: 'bg-purple-500/12 text-purple-600 dark:text-purple-400 border-purple-500/25',
  sem_responsavel: 'bg-amber-500/12 text-amber-600 dark:text-amber-400 border-amber-500/25',
  cadastro_incompleto: 'bg-yellow-500/12 text-yellow-600 dark:text-yellow-500 border-yellow-500/25',
};

export function itemBadgeClass(status?: string | null): string {
  return ITEM_CLASSES[(status ?? '').trim()] ?? 'bg-muted text-muted-foreground border-border';
}

/** Itens que exigem atenção visual destacada. */
export const CRITICAL_ITEM_STATUSES = ['faltando', 'divergente', 'fora_da_secao'];

/** Mapa RGB por rótulo, para colorColumnIndex/colorMap dos PDFs executivos. */
export const ITEM_STATUS_RGB: Record<string, [number, number, number]> = {
  [ITEM_STATUS_LABELS.pendente]: [107, 114, 128],
  [ITEM_STATUS_LABELS.conferido]: [16, 185, 129],
  [ITEM_STATUS_LABELS.faltando]: [239, 68, 68],
  [ITEM_STATUS_LABELS.divergente]: [249, 115, 22],
  [ITEM_STATUS_LABELS.fora_da_secao]: [147, 51, 234],
  [ITEM_STATUS_LABELS.sem_responsavel]: [245, 158, 11],
  [ITEM_STATUS_LABELS.cadastro_incompleto]: [234, 179, 8],
};

export type ConferenceRow = {
  id: string;
  section_id: string | null;
  section_name: string | null;
  title: string | null;
  status: string;
  responsible_user_id: string | null;
  responsible_name: string | null;
  started_at: string;
  completed_at: string | null;
  reopened_at: string | null;
  cancelled_at: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export type ConferenceItemRow = {
  id: string;
  conference_id: string;
  material_id: string | null;
  numero_ficha: string | null;
  patrimonio: string | null;
  codigo_material: string | null;
  nome_material: string | null;
  section_id: string | null;
  section_name: string | null;
  responsavel: string | null;
  situacao_material: string | null;
  quantidade: number | null;
  valor_unitario: number | string | null;
  status: string;
  observation: string | null;
  checked_by: string | null;
  checked_at: string | null;
};

/** Conferência editável apenas quando em andamento ou reaberta. */
export function isEditableStatus(status?: string | null): boolean {
  return status === 'em_andamento' || status === 'reaberta';
}
