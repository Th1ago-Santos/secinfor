import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Ticket, ArrowUpRight } from 'lucide-react';
import { Link } from 'react-router-dom';

type Props = {
  abertos: number;
  emAtendimento: number;
  aguardandoMaterial: number;
  concluidos: number;
};

export default function TicketsSummary({ abertos, emAtendimento, aguardandoMaterial, concluidos }: Props) {
  const rows: Array<{ label: string; value: number; color: string; to: string }> = [
    { label: 'Abertos', value: abertos, color: 'text-info', to: '/chamados?status=aberto' },
    { label: 'Em atendimento', value: emAtendimento, color: 'text-warning', to: '/chamados?status=em_atendimento' },
    { label: 'Aguardando material', value: aguardandoMaterial, color: 'text-primary', to: '/chamados?status=aguardando' },
    { label: 'Concluídos', value: concluidos, color: 'text-success', to: '/chamados?status=concluido' },
  ];

  return (
    <Card className="border-border/60 shadow-card animate-in-card h-full">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <div className="p-1.5 rounded-md bg-primary/10">
            <Ticket className="h-3.5 w-3.5 text-primary" />
          </div>
          Resumo de Chamados
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-2 mb-4">
          {rows.map((r) => (
            <Link
              key={r.label}
              to={r.to}
              className="rounded-lg border border-border/40 bg-muted/20 p-3 hover:bg-muted/40 hover:border-border/70 transition-colors"
            >
              <p className={`text-2xl font-bold tabular-nums leading-none ${r.color}`}>{r.value}</p>
              <p className="text-[11px] text-muted-foreground mt-1.5 font-medium">{r.label}</p>
            </Link>
          ))}
        </div>
        <Link
          to="/chamados/dashboard"
          className="text-xs font-medium text-primary inline-flex items-center gap-1 hover:underline"
        >
          Ver dashboard completo de Chamados <ArrowUpRight className="h-3 w-3" />
        </Link>
      </CardContent>
    </Card>
  );
}
