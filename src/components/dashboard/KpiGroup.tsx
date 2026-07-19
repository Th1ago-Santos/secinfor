import { Card, CardContent } from '@/components/ui/card';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import type { LucideIcon } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export type KpiVariant = 'primary' | 'info' | 'success' | 'warning' | 'destructive' | 'muted';

export type Kpi = {
  label: string;
  value: number | string;
  hint?: string;
  tooltip?: string;
  icon: LucideIcon;
  variant?: KpiVariant;
  to?: string;
};

const VARIANT: Record<KpiVariant, { icon: string; ring: string; glow: string }> = {
  primary:     { icon: 'text-primary bg-primary/10',       ring: 'hover:border-primary/40',     glow: '' },
  info:        { icon: 'text-info bg-info/10',             ring: 'hover:border-info/40',        glow: '' },
  success:     { icon: 'text-success bg-success/10',       ring: 'hover:border-success/40',     glow: '' },
  warning:     { icon: 'text-warning bg-warning/10',       ring: 'hover:border-warning/40',     glow: '' },
  destructive: { icon: 'text-destructive bg-destructive/10', ring: 'hover:border-destructive/40', glow: '' },
  muted:       { icon: 'text-muted-foreground bg-muted',   ring: 'hover:border-border',         glow: '' },
};

export function KpiCard({ kpi }: { kpi: Kpi }) {
  const navigate = useNavigate();
  const v = VARIANT[kpi.variant || 'primary'];
  const clickable = !!kpi.to;

  const body = (
    <Card
      onClick={clickable ? () => navigate(kpi.to!) : undefined}
      className={`kpi-card group border-border/60 transition-all duration-200 ${v.ring} ${clickable ? 'cursor-pointer hover:shadow-card-hover hover:-translate-y-0.5' : ''}`}
    >
      <CardContent className="px-4 pt-4 pb-3.5">
        <div className="flex items-center justify-between mb-3">
          <div className={`p-2 rounded-lg ${v.icon} transition-transform duration-300 group-hover:scale-110`}>
            <kpi.icon className="h-4 w-4" />
          </div>
        </div>
        <p className="text-2xl md:text-[1.75rem] font-bold tracking-tight leading-none">{kpi.value}</p>
        <p className="text-xs font-semibold text-foreground/80 mt-1.5">{kpi.label}</p>
        {kpi.hint && (
          <p className="text-[11px] text-muted-foreground mt-0.5 leading-tight">{kpi.hint}</p>
        )}
      </CardContent>
    </Card>
  );

  if (!kpi.tooltip) return body;
  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>{body}</TooltipTrigger>
        <TooltipContent><p className="text-xs">{kpi.tooltip}</p></TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

type GroupProps = {
  title: string;
  description?: string;
  kpis: Kpi[];
  cols?: 'auto' | 4;
};

export default function KpiGroup({ title, description, kpis }: GroupProps) {
  return (
    <section className="mb-5">
      <div className="flex items-baseline justify-between mb-3">
        <div>
          <h2 className="text-sm font-bold tracking-tight uppercase text-muted-foreground/90">{title}</h2>
          {description && <p className="text-[11px] text-muted-foreground/70 mt-0.5">{description}</p>}
        </div>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {kpis.map((k) => <KpiCard key={k.label} kpi={k} />)}
      </div>
    </section>
  );
}
