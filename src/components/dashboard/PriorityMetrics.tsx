import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Timer, TrendingUp, Award, BarChart3 } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';

const tooltipStyle = {
  backgroundColor: 'hsl(var(--card))',
  border: '1px solid hsl(var(--border))',
  borderRadius: '10px',
  color: 'hsl(var(--foreground))',
  fontSize: '12px',
  boxShadow: '0 4px 12px hsl(var(--foreground) / 0.05)',
};

async function fetchPriorityMetrics() {
  const { data: priorities } = await supabase
    .from('computer_priorities')
    .select('*');

  if (!priorities || priorities.length === 0) return null;

  const abertas = priorities.filter(p => p.status === 'aberta');
  const concluidas = priorities.filter(p => p.status === 'concluida');

  // Tempo médio de atendimento (dias)
  let avgDays = 0;
  const completedWithDates = concluidas.filter(p => p.data_solicitacao && p.data_encerramento);
  if (completedWithDates.length > 0) {
    const totalDays = completedWithDates.reduce((sum, p) => {
      const start = new Date(p.data_solicitacao + 'T00:00:00').getTime();
      const end = new Date(p.data_encerramento!).getTime();
      return sum + (end - start) / (1000 * 60 * 60 * 24);
    }, 0);
    avgDays = Math.round(totalDays / completedWithDates.length);
  }

  // Taxa de resolução
  const taxaResolucao = priorities.length > 0 ? Math.round((concluidas.length / priorities.length) * 100) : 0;

  // Seções com mais demanda
  const secaoCount: Record<string, number> = {};
  priorities.forEach(p => {
    secaoCount[p.secao] = (secaoCount[p.secao] || 0) + 1;
  });
  const demandaPorSecao = Object.entries(secaoCount)
    .map(([secao, total]) => ({ secao, total }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 8);

  return {
    totalAbertas: abertas.length,
    totalConcluidas: concluidas.length,
    avgDays,
    taxaResolucao,
    demandaPorSecao,
  };
}

export default function PriorityMetrics() {
  const { data, isLoading } = useQuery({
    queryKey: ['priority-metrics'],
    queryFn: fetchPriorityMetrics,
    staleTime: 30_000,
  });

  if (isLoading) {
    return <Skeleton className="h-[300px] rounded-xl" />;
  }

  if (!data) return null;

  return (
    <Card className="animate-in-card shadow-card border-border/50 mb-6">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <div className="p-1.5 rounded-md bg-primary/10">
            <Award className="h-3.5 w-3.5 text-primary" />
          </div>
          Métricas de Prioridades
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
          <div className="rounded-lg border border-border/50 p-3 text-center">
            <div className="flex items-center justify-center gap-1.5 mb-1">
              <BarChart3 className="h-3.5 w-3.5 text-primary" />
              <span className="text-[10px] text-muted-foreground">Abertas</span>
            </div>
            <p className="text-lg font-bold">{data.totalAbertas}</p>
          </div>
          <div className="rounded-lg border border-border/50 p-3 text-center">
            <div className="flex items-center justify-center gap-1.5 mb-1">
              <Award className="h-3.5 w-3.5 text-emerald-500" />
              <span className="text-[10px] text-muted-foreground">Concluídas</span>
            </div>
            <p className="text-lg font-bold">{data.totalConcluidas}</p>
          </div>
          <div className="rounded-lg border border-border/50 p-3 text-center">
            <div className="flex items-center justify-center gap-1.5 mb-1">
              <Timer className="h-3.5 w-3.5 text-amber-500" />
              <span className="text-[10px] text-muted-foreground">Tempo Médio</span>
            </div>
            <p className="text-lg font-bold">{data.avgDays}<span className="text-xs font-normal text-muted-foreground"> dias</span></p>
          </div>
          <div className="rounded-lg border border-border/50 p-3 text-center">
            <div className="flex items-center justify-center gap-1.5 mb-1">
              <TrendingUp className="h-3.5 w-3.5 text-primary" />
              <span className="text-[10px] text-muted-foreground">Resolução</span>
            </div>
            <p className="text-lg font-bold">
              {data.taxaResolucao}%
              <Badge variant={data.taxaResolucao >= 70 ? 'default' : 'secondary'} className="ml-1.5 text-[9px] px-1.5">
                {data.taxaResolucao >= 70 ? 'Bom' : 'Atenção'}
              </Badge>
            </p>
          </div>
        </div>

        {data.demandaPorSecao.length > 0 && (
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-2">Demanda por Seção</p>
            <ResponsiveContainer width="100%" height={160}>
              <BarChart data={data.demandaPorSecao} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis type="number" tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} allowDecimals={false} />
                <YAxis type="category" dataKey="secao" tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} width={80} />
                <Tooltip contentStyle={tooltipStyle} />
                <Bar dataKey="total" name="Solicitações" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
