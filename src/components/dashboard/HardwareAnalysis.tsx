import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Cpu, MemoryStick, Gauge, Zap, Laptop, RefreshCw, Sparkles } from 'lucide-react';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from 'recharts';

type NotebookSpec = {
  modelo: string;
  processador: string;
  geracao_processador: number;
  velocidade_ghz: number;
  ram_gb: number;
  armazenamento: string;
  classificacao: string;
  quantidade: number;
};

type HardwareAverages = {
  ram_media: number;
  velocidade_media: number;
  geracao_media: number;
  total_notebooks: number;
  por_classificacao: Record<string, number>;
};

const PIE_COLORS = [
  'hsl(152, 60%, 45%)',
  'hsl(38, 92%, 50%)',
  'hsl(0, 72%, 51%)',
  'hsl(220, 85%, 60%)',
];

const TIER_COLORS: Record<string, string> = {
  'Básico': 'hsl(38, 92%, 50%)',
  'Intermediário': 'hsl(220, 85%, 60%)',
  'Avançado': 'hsl(152, 60%, 45%)',
};

export default function HardwareAnalysis() {
  const [specs, setSpecs] = useState<NotebookSpec[]>([]);
  const [averages, setAverages] = useState<HardwareAverages | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);

  const fetchAnalysis = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error } = await supabase.functions.invoke('analyze-notebooks');
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setSpecs(data.specs || []);
      setAverages(data.averages || null);
      setLoaded(true);
    } catch (e: any) {
      console.error('Hardware analysis error:', e);
      setError(e.message || 'Erro ao analisar hardware');
    } finally {
      setLoading(false);
    }
  };

  const tierPieData = averages
    ? Object.entries(averages.por_classificacao).filter(([_, v]) => v > 0).map(([name, value]) => ({ name, value }))
    : [];

  return (
    <Card className="mb-6 animate-in-card shadow-card border-border/50 overflow-hidden">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <div className="p-1.5 rounded-md gradient-primary">
              <Cpu className="h-3.5 w-3.5 text-primary-foreground" />
            </div>
            Análise de Hardware — IA
            <Badge variant="secondary" className="text-[9px] px-1.5 py-0 font-mono">
              <Sparkles className="h-2.5 w-2.5 mr-0.5" />AI
            </Badge>
          </CardTitle>
          <Button size="sm" variant="outline" onClick={fetchAnalysis} disabled={loading} className="text-xs h-7 gap-1.5">
            <RefreshCw className={`h-3 w-3 ${loading ? 'animate-spin' : ''}`} />
            {loaded ? 'Atualizar' : 'Analisar'}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {!loaded && !loading && !error && (
          <div className="text-center py-8">
            <Cpu className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">Clique em <strong>"Analisar"</strong> para estimar as especificações de hardware dos notebooks cadastrados usando IA.</p>
          </div>
        )}

        {loading && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)}
          </div>
        )}

        {error && (
          <div className="text-center py-6">
            <p className="text-sm text-destructive">{error}</p>
          </div>
        )}

        {loaded && averages && !loading && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              {[
                { icon: MemoryStick, label: 'RAM Média', value: `${averages.ram_media}`, unit: 'GB', color: 'primary' },
                { icon: Gauge, label: 'Clock Médio', value: `${averages.velocidade_media}`, unit: 'GHz', color: 'info' },
                { icon: Zap, label: 'Geração Média', value: `${averages.geracao_media}ª`, unit: 'gen', color: 'success' },
                { icon: Laptop, label: 'Modelos Únicos', value: `${specs.length}`, unit: '', color: 'warning' },
              ].map((kpi) => (
                <div key={kpi.label} className="rounded-xl border border-border/50 bg-muted/30 p-4 group hover:border-primary/30 transition-colors">
                  <div className="flex items-center gap-2 mb-2">
                    <div className={`p-1.5 rounded-md bg-${kpi.color}/10`}>
                      <kpi.icon className={`h-3.5 w-3.5 text-${kpi.color}`} />
                    </div>
                    <span className="text-[11px] text-muted-foreground font-medium">{kpi.label}</span>
                  </div>
                  <p className="text-2xl font-bold tracking-tight">{kpi.value} {kpi.unit && <span className="text-sm font-normal text-muted-foreground">{kpi.unit}</span>}</p>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <div className="rounded-xl border border-border/50 bg-muted/30 p-4">
                <p className="text-xs font-semibold mb-3 text-muted-foreground uppercase tracking-wider">Classificação</p>
                {tierPieData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={160}>
                    <PieChart>
                      <Pie data={tierPieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={60} innerRadius={35} label={({ name, value }) => `${name}: ${value}`} labelLine={false} strokeWidth={2} stroke="hsl(var(--card))">
                        {tierPieData.map((entry, i) => (
                          <Cell key={i} fill={TIER_COLORS[entry.name] || PIE_COLORS[i % PIE_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '10px', color: 'hsl(var(--foreground))', fontSize: '12px' }} />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-8">Sem dados</p>
                )}
              </div>

              <div className="lg:col-span-2 rounded-xl border border-border/50 bg-muted/30 p-4 overflow-auto max-h-[280px]">
                <p className="text-xs font-semibold mb-3 text-muted-foreground uppercase tracking-wider">Detalhamento por Modelo</p>
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-border/50">
                      <th className="text-left py-1.5 font-semibold text-muted-foreground">Modelo</th>
                      <th className="text-left py-1.5 font-semibold text-muted-foreground">Processador</th>
                      <th className="text-center py-1.5 font-semibold text-muted-foreground">RAM</th>
                      <th className="text-center py-1.5 font-semibold text-muted-foreground">Clock</th>
                      <th className="text-center py-1.5 font-semibold text-muted-foreground">Geração</th>
                      <th className="text-center py-1.5 font-semibold text-muted-foreground">Nível</th>
                      <th className="text-center py-1.5 font-semibold text-muted-foreground">Qtd</th>
                    </tr>
                  </thead>
                  <tbody>
                    {specs.map((spec, i) => (
                      <tr key={i} className="border-b border-border/30 last:border-0 hover:bg-muted/50 transition-colors">
                        <td className="py-2 font-medium">{spec.modelo}</td>
                        <td className="py-2 font-mono text-[10px] text-muted-foreground">{spec.processador}</td>
                        <td className="py-2 text-center">{spec.ram_gb}GB</td>
                        <td className="py-2 text-center">{spec.velocidade_ghz}GHz</td>
                        <td className="py-2 text-center">{spec.geracao_processador}ª</td>
                        <td className="py-2 text-center">
                          <Badge variant="secondary" className="text-[9px] px-1.5 py-0" style={{ backgroundColor: TIER_COLORS[spec.classificacao] + '20', color: TIER_COLORS[spec.classificacao] }}>
                            {spec.classificacao}
                          </Badge>
                        </td>
                        <td className="py-2 text-center font-semibold">{spec.quantidade}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
