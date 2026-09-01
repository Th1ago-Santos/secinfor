/**
 * Utilitário central de cores de status de chamados.
 * A cor SEMPRE vem da configuração cadastrada no banco (ticket_statuses.color).
 * Fallback: cinza neutro (nunca azul universal).
 */

export const NEUTRAL_STATUS_COLOR = '#94a3b8'; // slate-400

type StatusLike = { name?: string | null; color?: string | null } | null | undefined;

/** Normaliza uma cor hex vinda do banco; devolve fallback neutro se ausente/inválida. */
export function resolveStatusColor(status: StatusLike | string | null | undefined): string {
  const raw = typeof status === 'string' ? status : status?.color;
  if (!raw) return NEUTRAL_STATUS_COLOR;
  const v = raw.trim();
  if (/^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(v)) return v;
  if (/^(rgb|hsl)a?\(/i.test(v)) return v;
  return NEUTRAL_STATUS_COLOR;
}

function hexToRgb(hex: string): [number, number, number] | null {
  const m = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return null;
  let h = m[1];
  if (h.length === 3) h = h.split('').map(c => c + c).join('');
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}

/** Versão rgba translúcida da cor — usada em fundos de badge. */
export function statusColorAlpha(color: string, alpha = 0.14): string {
  const rgb = hexToRgb(color);
  if (!rgb) return 'transparent';
  return `rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, ${alpha})`;
}

/** Cor de texto legível (preto/branco) sobre a cor informada. */
export function contrastText(color: string): string {
  const rgb = hexToRgb(color);
  if (!rgb) return '#111827';
  const [r, g, b] = rgb.map(v => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  });
  const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  return lum > 0.5 ? '#111827' : '#ffffff';
}

/** Estilo inline padrão para badges de status (fundo suave + borda + texto na cor). */
export function statusBadgeStyle(status: StatusLike | string): React.CSSProperties {
  const color = resolveStatusColor(status);
  return {
    color,
    borderColor: statusColorAlpha(color, 0.45),
    backgroundColor: statusColorAlpha(color, 0.12),
  };
}

/** Estilo sólido (cabeçalhos, faixas, etiquetas impressas). */
export function statusSolidStyle(status: StatusLike | string): React.CSSProperties {
  const color = resolveStatusColor(status);
  return { backgroundColor: color, color: contrastText(color), borderColor: color };
}

/** Cor RGB [0-255] para uso em PDFs (jsPDF/autotable). */
export function statusColorRgb(status: StatusLike | string): [number, number, number] {
  return hexToRgb(resolveStatusColor(status)) || [148, 163, 184];
}

/** Identidade visual de prioridade — separada da identidade de status. */
export const PRIORITY_HEX: Record<string, string> = {
  Baixa: '#64748b',
  Normal: '#0ea5e9',
  Alta: '#f97316',
  Urgente: '#ef4444',
};

export function priorityColor(priority: string): string {
  return PRIORITY_HEX[priority] || NEUTRAL_STATUS_COLOR;
}
