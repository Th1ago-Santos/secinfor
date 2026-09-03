/**
 * Helpers monetários do módulo Material Carga.
 * Valor nulo NUNCA vira zero — é sempre exibido como "Não informado".
 */

export const NAO_INFORMADO = 'Não informado';

const BRL = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/** Converte valores vindos do banco (string numeric | number | null) em number|null. */
export function toNumberOrNull(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null;
  const n = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(n) ? n : null;
}

/** Formata em BRL; nulo/indefinido vira "Não informado". */
export function formatCurrency(value: unknown): string {
  const n = toNumberOrNull(value);
  return n === null ? NAO_INFORMADO : BRL.format(n);
}

/** Formata sempre como moeda, tratando nulo como 0 (uso em totalizadores). */
export function formatCurrencyStrict(value: number): string {
  return BRL.format(Number.isFinite(value) ? value : 0);
}

/** Valor total = valor_unitario * quantidade. Nulo permanece nulo. */
export function totalValue(valorUnitario: unknown, quantidade: unknown): number | null {
  const v = toNumberOrNull(valorUnitario);
  if (v === null) return null;
  const q = toNumberOrNull(quantidade);
  return v * (q === null || q <= 0 ? 1 : q);
}

/** Texto genérico com fallback "Não informado". */
export function orNaoInformado(value?: string | null): string {
  const v = (value ?? '').toString().trim();
  return v === '' ? NAO_INFORMADO : v;
}
