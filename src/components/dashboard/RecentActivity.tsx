import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowRightLeft, Clock, Layers, Laptop, Package, ArrowUpRight } from 'lucide-react';
import { Link } from 'react-router-dom';

type Movement = {
  id: string;
  tipo_evento: string;
  item_tipo: string;
  data_hora: string;
};

type RecentItem = {
  id: string;
  patrimonio: string;
  tipo: string;
  nome: string;
  created_at: string;
};

type Props = {
  recentMovs: Movement[];
  recentItems: RecentItem[];
};

function fmtDateTime(d: string) {
  const date = new Date(d);
  return `${date.toLocaleDateString('pt-BR')} • ${date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;
}

export default function RecentActivity({ recentMovs, recentItems }: Props) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <Card className="animate-in-card shadow-card border-border/60">
        <CardHeader className="pb-2 flex-row items-center justify-between space-y-0">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <div className="p-1.5 rounded-md bg-primary/10">
              <Clock className="h-3.5 w-3.5 text-primary" />
            </div>
            Últimas Movimentações
          </CardTitle>
          <Button asChild variant="ghost" size="sm" className="h-7 text-[11px]">
            <Link to="/movimentacoes">Ver todas <ArrowUpRight className="h-3 w-3 ml-1" /></Link>
          </Button>
        </CardHeader>
        <CardContent className="space-y-1">
          {recentMovs.length === 0 ? (
            <div className="text-center py-6">
              <p className="text-sm font-medium">Nenhuma movimentação recente</p>
              <p className="text-[11px] text-muted-foreground mt-0.5">Registros aparecerão aqui automaticamente.</p>
            </div>
          ) : recentMovs.map(m => (
            <div key={m.id} className="flex items-start gap-2.5 text-sm py-2.5 border-b border-border/40 last:border-0 group hover:bg-muted/40 -mx-3 px-3 rounded-lg transition-colors">
              <div className="p-1.5 rounded-md bg-primary/10 mt-0.5 group-hover:bg-primary/15 transition-colors">
                <ArrowRightLeft className="h-3 w-3 text-primary" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-medium text-xs">{m.tipo_evento}</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  <span className="capitalize">{m.item_tipo}</span> • {fmtDateTime(m.data_hora)}
                </p>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card className="animate-in-card shadow-card border-border/60">
        <CardHeader className="pb-2 flex-row items-center justify-between space-y-0">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <div className="p-1.5 rounded-md bg-primary/10">
              <Layers className="h-3.5 w-3.5 text-primary" />
            </div>
            Últimos Cadastros
          </CardTitle>
          <Button asChild variant="ghost" size="sm" className="h-7 text-[11px]">
            <Link to="/notebooks">Ver todos <ArrowUpRight className="h-3 w-3 ml-1" /></Link>
          </Button>
        </CardHeader>
        <CardContent className="space-y-1">
          {recentItems.length === 0 ? (
            <div className="text-center py-6">
              <p className="text-sm font-medium">Nenhum cadastro recente</p>
              <p className="text-[11px] text-muted-foreground mt-0.5">Novos equipamentos aparecerão aqui.</p>
            </div>
          ) : recentItems.map(item => (
            <div key={item.id} className="flex items-start gap-2.5 text-sm py-2.5 border-b border-border/40 last:border-0 group hover:bg-muted/40 -mx-3 px-3 rounded-lg transition-colors">
              <div className="p-1.5 rounded-md bg-primary/10 mt-0.5 group-hover:bg-primary/15 transition-colors">
                {item.tipo === 'Notebook' ? <Laptop className="h-3 w-3 text-primary" /> : <Package className="h-3 w-3 text-primary" />}
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-medium text-xs truncate">{item.nome}</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  <span className="font-mono text-[10px]">{item.patrimonio}</span> • {item.tipo} • {fmtDateTime(item.created_at)}
                </p>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
