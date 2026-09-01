import { cn } from '@/lib/utils';
import { priorityColor, resolveStatusColor, statusBadgeStyle, statusColorAlpha } from '@/lib/statusColor';

type StatusLike = { name?: string | null; color?: string | null } | null | undefined;

/**
 * Badge de STATUS — a cor vem sempre do cadastro do status (ticket_statuses.color).
 * Identidade: ponto colorido + fundo suave.
 */
export function StatusBadge({
  status,
  name,
  className,
  size = 'sm',
}: {
  status?: StatusLike;
  name?: string | null;
  className?: string;
  size?: 'xs' | 'sm';
}) {
  const label = name ?? status?.name;
  if (!label) return <span className="text-muted-foreground text-xs">—</span>;
  const color = resolveStatusColor(status);
  return (
    <span
      className={cn(
        'inline-flex items-center justify-center gap-1.5 rounded-full border font-semibold leading-none whitespace-nowrap align-middle',
        size === 'xs' ? 'h-5 px-2 text-[10px]' : 'h-6 px-2.5 text-[11px]',
        className,
      )}
      style={statusBadgeStyle(status)}
    >
      <span className="h-1.5 w-1.5 rounded-full shrink-0" style={{ backgroundColor: color }} />
      {label}
    </span>
  );
}

/**
 * Badge de PRIORIDADE — identidade visual distinta do status:
 * borda sólida na cor + texto em caixa alta, sem ponto.
 */
export function PriorityBadge({
  priority,
  className,
  size = 'sm',
}: {
  priority: string;
  className?: string;
  size?: 'xs' | 'sm';
}) {
  const color = priorityColor(priority);
  return (
    <span
      className={cn(
        'inline-flex items-center justify-center rounded-md border font-bold uppercase tracking-wider leading-none whitespace-nowrap align-middle',
        size === 'xs' ? 'h-5 px-1.5 text-[9px]' : 'h-6 px-2 text-[10px]',
        className,
      )}
      style={{ color, borderColor: color, backgroundColor: statusColorAlpha(color, 0.1) }}
    >
      {priority}
    </span>
  );
}

/** Badge neutro de seção — sempre com o mesmo tratamento em todo o sistema. */
export function SectionBadge({ section, className }: { section?: string | null; className?: string }) {
  if (!section) return <span className="text-muted-foreground text-xs">—</span>;
  return (
    <span
      className={cn(
        'inline-flex h-6 items-center justify-center rounded-md border border-border/70 bg-muted/50 px-2 text-[11px] font-medium leading-none text-foreground/80 whitespace-nowrap align-middle',
        className,
      )}
    >
      {section}
    </span>
  );
}

export default StatusBadge;
