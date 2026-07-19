import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Laptop, Monitor, Info } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

type Overview = {
  total: number;
  disponiveis: number;
  emUso: number;
  emManutencao: number;
};

type Props = {
  notebooks: Overview;
};

function StatRow({ label, value, variant }: { label: string; value: number; variant: 'success' | 'info' | 'warning' }) {
  const dot = variant === 'success' ? 'bg-success' : variant === 'info' ? 'bg-info' : 'bg-warning';
  return (
    <div className="flex items-center justify-between py-1.5">
      <div className="flex items-center gap-2">
        <span className={`h-2 w-2 rounded-full ${dot}`} />
        <span className="text-xs text-muted-foreground">{label}</span>
      </div>
      <span className="text-sm font-bold tabular-nums">{value}</span>
    </div>
  );
}

function OverviewCard({
  title, icon: Icon, data, onClick,
}: {
  title: string; icon: any; data: Overview; onClick?: () => void;
}) {
  const disponibilidade = data.total > 0 ? Math.round((data.disponiveis / data.total) * 100) : 0;
  return (
    <Card className="border-border/60 shadow-card animate-in-card">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <div className="p-1.5 rounded-md bg-primary/10">
            <Icon className="h-3.5 w-3.5 text-primary" />
          </div>
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-end justify-between mb-4">
          <div>
            <p className="text-4xl font-bold tracking-tight leading-none">{data.total}</p>
            <p className="text-[11px] text-muted-foreground mt-1 font-medium">Total cadastrado</p>
          </div>
          <button
            onClick={onClick}
            className="text-right hover:opacity-80 transition-opacity"
          >
            <p className="text-2xl font-bold text-success tabular-nums leading-none">{disponibilidade}%</p>
            <p className="text-[11px] text-muted-foreground mt-1 font-medium">Disponibilidade</p>
          </button>
        </div>
        <Progress value={disponibilidade} className="h-1.5 mb-4" />
        <div className="divide-y divide-border/40">
          <StatRow label="Disponíveis" value={data.disponiveis} variant="success" />
          <StatRow label="Em uso" value={data.emUso} variant="info" />
          <StatRow label="Em manutenção" value={data.emManutencao} variant="warning" />
        </div>
      </CardContent>
    </Card>
  );
}

export default function EquipmentOverview({ notebooks }: Props) {
  const navigate = useNavigate();

  return (
    <section className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
      <OverviewCard
        title="Notebooks"
        icon={Laptop}
        data={notebooks}
        onClick={() => navigate('/notebooks')}
      />
      <Card className="border-dashed border-border/60 bg-muted/20 animate-in-card">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <div className="p-1.5 rounded-md bg-muted">
              <Monitor className="h-3.5 w-3.5 text-muted-foreground" />
            </div>
            Monitores
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-start gap-3 py-4">
            <Info className="h-4 w-4 text-muted-foreground/60 mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-medium">Cadastro de monitores ainda não configurado</p>
              <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                Este painel ficará ativo quando o módulo de monitores for habilitado.
                Enquanto isso, os equipamentos são gerenciados na aba Notebooks e Materiais.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </section>
  );
}
