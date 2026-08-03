import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Gauge, AlertTriangle, Timer, CheckCircle2 } from 'lucide-react';
import { useTicketSla } from '@/hooks/useTicketMeta';
import { computeSla, type Ticket } from '@/types/ticket';

type Props = { tickets: Ticket[] };

type Row = {
  priority: string;
  total: number;
  overdue: number;
  atRisk: number;
  onTime: number;
  compliance: number;
  responseOverdue: number;
};

export default function SlaPanel({ tickets }: Props) {
  const { sla } = useTicketSla();

  const rows = useMemo<Row[]>(() => {
    const priorities = Object.keys(sla);
    return priorities.map((priority) => {
      const cfg = sla[priority];
      const list = tickets.filter((t) => t.priority === priority);
      let overdue = 0, atRisk = 0, onTime = 0, responseOverdue = 0;

      list.forEach((t) => {
        const state = computeSla(t.created_at, t.closed_at, cfg.resolution_minutes);
        if (state.overdue) overdue++;
        else if (state.percent >= 80) atRisk++;
        else onTime++;

        const limit = new Date(t.created_at).getTime() + cfg.response_minutes * 60000;
        const ref = t.first_response_at ? new Date(t.first_response_at).getTime() : Date.now();
        if (ref > limit) responseOverdue++;
      });

      return {
        priority,
        total: list.length,
        overdue,
        atRisk,
        onTime,
        responseOverdue,
        compliance: list.length ? Math.round(((list.length - overdue) / list.length) * 100) : 100,
      };
    }).sort((a, b) => b.total - a.total);
  }, [sla, tickets]);

  const totals = useMemo(() => rows.reduce((acc, r) => ({
    total: acc.total + r.total,
    overdue: acc.overdue + r.overdue,
    atRisk: acc.atRisk + r.atRisk,
    responseOverdue: acc.responseOverdue + r.responseOverdue,
  }), { total: 0, overdue: 0, atRisk: 0, responseOverdue: 0 }), [rows]);

  const globalCompliance = totals.total ? Math.round(((totals.total - totals.overdue) / totals.total) * 100) : 100;

  return (
    <Card className="shadow-card border-border/60 mb-5">
      <CardHeader className="pb-2 flex-row items-center justify-between space-y-0">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <Gauge className="h-4 w-4 text-primary" /> Cumprimento de SLA
        </CardTitle>
        <Badge variant="outline" className={globalCompliance >= 90 ? 'border-emerald-500/40 text-emerald-500' : globalCompliance >= 70 ? 'border-amber-500/40 text-amber-500' : 'border-destructive/40 text-destructive'}>
          {globalCompliance}% dentro do prazo
        </Badge>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-3 gap-3">
          <div className="rounded-lg border border-border/60 bg-muted/30 p-3">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold flex items-center gap-1"><AlertTriangle className="h-3 w-3" /> Solução em atraso</p>
            <p className="text-xl font-bold tabular-nums text-destructive">{totals.overdue}</p>
          </div>
          <div className="rounded-lg border border-border/60 bg-muted/30 p-3">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold flex items-center gap-1"><Timer className="h-3 w-3" /> Próximos do prazo</p>
            <p className="text-xl font-bold tabular-nums text-amber-500">{totals.atRisk}</p>
          </div>
          <div className="rounded-lg border border-border/60 bg-muted/30 p-3">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold flex items-center gap-1"><CheckCircle2 className="h-3 w-3" /> 1ª resposta fora do prazo</p>
            <p className="text-xl font-bold tabular-nums">{totals.responseOverdue}</p>
          </div>
        </div>

        {rows.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-4">Configure os prazos de SLA para acompanhar o cumprimento.</p>
        ) : (
          <div className="space-y-3">
            {rows.map((r) => (
              <div key={r.priority}>
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="font-medium">{r.priority}</span>
                  <span className="text-muted-foreground tabular-nums">
                    {r.total} chamados · {r.overdue} atrasados · {r.compliance}%
                  </span>
                </div>
                <Progress value={r.compliance} className="h-2" />
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
