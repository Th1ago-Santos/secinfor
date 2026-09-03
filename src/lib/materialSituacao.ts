/**
 * Cores da SITUAÇÃO PATRIMONIAL de Material Carga.
 * Independente das cores dinâmicas de chamados (ticket_statuses.color).
 */

export const MATERIAL_SITUACOES = [
  'Em carga',
  'Cautelado',
  'Baixado',
  'Fora de carga',
  'Sem responsável',
  'Cadastro incompleto',
] as const;

export type MaterialSituacao = (typeof MATERIAL_SITUACOES)[number];

const CLASSES: Record<string, string> = {
  'Em carga': 'bg-emerald-500/12 text-emerald-600 dark:text-emerald-400 border-emerald-500/25',
  'Cautelado': 'bg-amber-500/12 text-amber-600 dark:text-amber-400 border-amber-500/25',
  'Baixado': 'bg-muted text-muted-foreground border-border',
  'Fora de carga': 'bg-destructive/12 text-destructive border-destructive/25',
  'Sem responsável': 'bg-orange-500/12 text-orange-600 dark:text-orange-400 border-orange-500/25',
  'Cadastro incompleto': 'bg-yellow-500/12 text-yellow-600 dark:text-yellow-500 border-yellow-500/25',
};

const RGB: Record<string, [number, number, number]> = {
  'Em carga': [16, 185, 129],
  'Cautelado': [245, 158, 11],
  'Baixado': [107, 114, 128],
  'Fora de carga': [239, 68, 68],
  'Sem responsável': [249, 115, 22],
  'Cadastro incompleto': [234, 179, 8],
};

export function situacaoBadgeClass(situacao?: string | null): string {
  return CLASSES[(situacao ?? '').trim()] ?? 'bg-muted text-muted-foreground border-border';
}

/** Mapa para colorColumnIndex/colorMap dos PDFs executivos. */
export const MATERIAL_SITUACAO_RGB: Record<string, [number, number, number]> = RGB;
