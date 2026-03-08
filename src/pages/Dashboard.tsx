import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import {
  Laptop, Package, Layers, CheckCircle, Wrench, Archive, ArrowRightLeft,
  ClipboardCheck, Bell, TrendingUp, BarChart3, Clock
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, CartesianGrid } from 'recharts';


type Stats = {
  totalNotebooks: number;
  totalMaterials: number;
  emUso: number;
  emManutencao: number;
  baixados: number;
  emEstoque: number;
  totalSections: number;
  movimentacoesMes: number;
  inventariosMes: number;
  alertasAtivos: number;
};

type Movement = {
  id: string;
  tipo_evento: string;
  item_tipo: string;
  secao_destino: string | null;
  responsavel_novo: string | null;
  data_hora: string;
  observacao: string | null;
};

type RecentItem = {
  id: string;
  patrimonio: string;
  tipo: string;
  nome: string;
  created_at: string;
};

const PIE_COLORS = [
  'hsl(152, 60%, 45%)',
  'hsl(38, 92%, 50%)',
  'hsl(0, 72%, 51%)',
  'hsl(220, 85%, 60%)',
];

export default function Dashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState<Stats | null>(null);
  const [nbBySection, setNbBySection] = useState<{ name: string; count: number }[]>([]);
  const [movsByMonth, setMovsByMonth] = useState<{ month: string; count: number }[]>([]);
  const [recentMovs, setRecentMovs] = useState<Movement[]>([]);
  const [recentItems, setRecentItems] = useState<RecentItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchAll(); }, []);

  const fetchAll = async () => {
    setLoading(true);
    const [
      { count: totalNb },
      { count: totalMat },
      { count: emUso },
      { count: emManutencao },
      { count: baixados },
      { count: emEstoque },
      { data: sections },
      { count: alertCount },
    ] = await Promise.all([
      supabase.from('notebooks').select('*', { count: 'exact', head: true }),
      supabase.from('materials').select('*', { count: 'exact', head: true }),
      supabase.from('notebooks').select('*', { count: 'exact', head: true }).eq('status', 'Em uso'),
      supabase.from('notebooks').select('*', { count: 'exact', head: true }).eq('status', 'Em manutenção'),
      supabase.from('notebooks').select('*', { count: 'exact', head: true }).eq('status', 'Baixado'),
      supabase.from('notebooks').select('*', { count: 'exact', head: true }).eq('status', 'Em estoque'),
      supabase.from('sections').select('name'),
      supabase.from('alerts').select('*', { count: 'exact', head: true }).eq('status', 'ativo'),
    ]);

    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);
    const { count: movsMes } = await supabase.from('movements').select('*', { count: 'exact', head: true })
      .gte('data_hora', startOfMonth.toISOString());
    const { count: invMes } = await supabase.from('inventory_sessions').select('*', { count: 'exact', head: true })
      .gte('data_inicio', startOfMonth.toISOString());

    setStats({
      totalNotebooks: totalNb || 0,
      totalMaterials: totalMat || 0,
      emUso: emUso || 0,
      emManutencao: emManutencao || 0,
      baixados: baixados || 0,
      emEstoque: emEstoque || 0,
      totalSections: sections?.length || 0,
      movimentacoesMes: movsMes || 0,
      inventariosMes: invMes || 0,
      alertasAtivos: alertCount || 0,
    });

    const { data: allNbs } = await supabase.from('notebooks').select('secao');
    if (allNbs) {
      const map: Record<string, number> = {};
      (allNbs as any[]).forEach(n => { map[n.secao] = (map[n.secao] || 0) + 1; });
      setNbBySection(Object.entries(map).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count));
    }

    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);
    sixMonthsAgo.setDate(1);
    sixMonthsAgo.setHours(0, 0, 0, 0);
    const { data: movsAll } = await supabase.from('movements').select('data_hora')
      .gte('data_hora', sixMonthsAgo.toISOString()).order('data_hora');
    if (movsAll) {
      const monthMap: Record<string, number> = {};
      (movsAll as any[]).forEach(m => {
        const d = new Date(m.data_hora);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        monthMap[key] = (monthMap[key] || 0) + 1;
      });
      const months: string[] = [];
      for (let i = 5; i >= 0; i--) {
        const d = new Date();
        d.setMonth(d.getMonth() - i);
        months.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
      }
      setMovsByMonth(months.map(m => ({
        month: m.split('-')[1] + '/' + m.split('-')[0].slice(2),
        count: monthMap[m] || 0,
      })));
    }

    const { data: recentM } = await supabase.from('movements').select('*').order('data_hora', { ascending: false }).limit(5);
    setRecentMovs((recentM as Movement[]) || []);

    const { data: recentNb } = await supabase.from('notebooks').select('id, patrimonio, modelo, created_at').order('created_at', { ascending: false }).limit(3);
    const { data: recentMat } = await supabase.from('materials').select('id, patrimonio, nome, created_at').order('created_at', { ascending: false }).limit(3);
    const combined = [
      ...((recentNb as any[]) || []).map(n => ({ id: n.id, patrimonio: n.patrimonio, tipo: 'Notebook', nome: n.modelo, created_at: n.created_at })),
      ...((recentMat as any[]) || []).map(m => ({ id: m.id, patrimonio: m.patrimonio, tipo: 'Material', nome: m.nome, created_at: m.created_at })),
    ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).slice(0, 5);
    setRecentItems(combined);

    setLoading(false);
  };

  const statusPieData = stats ? [
    { name: 'Em uso', value: stats.emUso },
    { name: 'Em manutenção', value: stats.emManutencao },
    { name: 'Baixado', value: stats.baixados },
    { name: 'Em estoque', value: stats.emEstoque },
  ].filter(d => d.value > 0) : [];

  const indicators = stats ? [
    { label: 'Notebooks', value: stats.totalNotebooks, icon: Laptop, variant: 'primary' as const },
    { label: 'Materiais', value: stats.totalMaterials, icon: Package, variant: 'info' as const },
    { label: 'Patrimônios', value: stats.totalNotebooks + stats.totalMaterials, icon: Layers, variant: 'default' as const },
    { label: 'Em Uso', value: stats.emUso, icon: CheckCircle, variant: 'success' as const },
    { label: 'Em Manutenção', value: stats.emManutencao, icon: Wrench, variant: 'warning' as const },
    { label: 'Baixados', value: stats.baixados, icon: Archive, variant: 'destructive' as const },
    { label: 'Seções', value: stats.totalSections, icon: BarChart3, variant: 'primary' as const },
    { label: 'Movimentações', value: stats.movimentacoesMes, icon: ArrowRightLeft, variant: 'info' as const },
    { label: 'Inventários', value: stats.inventariosMes, icon: ClipboardCheck, variant: 'success' as const },
    { label: 'Alertas', value: stats.alertasAtivos, icon: Bell, variant: 'destructive' as const, onClick: () => navigate('/alertas') },
  ] : [];

  const variantColors: Record<string, { icon: string; border: string }> = {
    primary: { icon: 'text-primary bg-primary/10', border: 'hover:border-primary/30' },
    info: { icon: 'text-info bg-info/10', border: 'hover:border-info/30' },
    success: { icon: 'text-success bg-success/10', border: 'hover:border-success/30' },
    warning: { icon: 'text-warning bg-warning/10', border: 'hover:border-warning/30' },
    destructive: { icon: 'text-destructive bg-destructive/10', border: 'hover:border-destructive/30' },
    default: { icon: 'text-muted-foreground bg-muted', border: 'hover:border-border' },
  };

  return (
    <div className="container mx-auto py-6 px-4 animate-in-page">
        <div className="flex items-center gap-3 mb-7">
          <div className="p-2.5 rounded-xl gradient-primary shadow-glow">
            <TrendingUp className="h-5 w-5 text-primary-foreground" />
          </div>
          <div>
            <h2 className="text-xl font-bold tracking-tight">Painel de Controle</h2>
            <p className="text-xs text-muted-foreground mt-0.5">Visão geral do patrimônio</p>
          </div>
        </div>

        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            {[...Array(10)].map((_, i) => <Skeleton key={i} className="h-[110px] rounded-xl" />)}
          </div>
        ) : (
          <>
            {/* KPI Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-6">
              {indicators.map((ind, idx) => (
                <Card
                  key={ind.label}
                  className={`kpi-card group border-border/50 ${variantColors[ind.variant].border} ${ind.onClick ? 'cursor-pointer' : ''}`}
                  onClick={ind.onClick}
                  style={{ animationDelay: `${idx * 40}ms` }}
                >
                  <CardContent className="pt-4 pb-3 px-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className={`p-2 rounded-lg ${variantColors[ind.variant].icon} transition-transform duration-300 group-hover:scale-110`}>
                        <ind.icon className="h-4 w-4" />
                      </div>
                      {ind.label === 'Alertas' && ind.value > 0 && (
                        <Badge variant="destructive" className="text-[10px] px-1.5 py-0 animate-scale-in">{ind.value}</Badge>
                      )}
                    </div>
                    <p className="text-2xl font-bold tracking-tight animate-count-up">{ind.value}</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5 font-medium">{ind.label}</p>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Charts row */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
              <Card className="lg:col-span-2 animate-in-card shadow-card border-border/50">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-semibold flex items-center gap-2">
                    <div className="p-1.5 rounded-md bg-primary/10">
                      <BarChart3 className="h-3.5 w-3.5 text-primary" />
                    </div>
                    Notebooks por Seção
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {nbBySection.length > 0 ? (
                    <ResponsiveContainer width="100%" height={240}>
                      <BarChart data={nbBySection}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                        <XAxis dataKey="name" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} />
                        <YAxis tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} allowDecimals={false} />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: 'hsl(var(--card))',
                            border: '1px solid hsl(var(--border))',
                            borderRadius: '10px',
                            color: 'hsl(var(--foreground))',
                            fontSize: '12px',
                            boxShadow: '0 4px 12px hsl(var(--foreground) / 0.05)',
                          }}
                        />
                        <Bar dataKey="count" name="Notebooks" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <p className="text-sm text-muted-foreground text-center py-16">Sem dados disponíveis</p>
                  )}
                </CardContent>
              </Card>

              <Card className="animate-in-card shadow-card border-border/50">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-semibold">Status dos Notebooks</CardTitle>
                </CardHeader>
                <CardContent>
                  {statusPieData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={240}>
                      <PieChart>
                        <Pie data={statusPieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} innerRadius={45} label={({ name, value }) => `${name}: ${value}`} labelLine={false} strokeWidth={2} stroke="hsl(var(--card))">
                          {statusPieData.map((_, i) => (
                            <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip
                          contentStyle={{
                            backgroundColor: 'hsl(var(--card))',
                            border: '1px solid hsl(var(--border))',
                            borderRadius: '10px',
                            color: 'hsl(var(--foreground))',
                            fontSize: '12px',
                          }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <p className="text-sm text-muted-foreground text-center py-16">Sem dados disponíveis</p>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Bottom row */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <Card className="animate-in-card shadow-card border-border/50">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-semibold flex items-center gap-2">
                    <div className="p-1.5 rounded-md bg-primary/10">
                      <ArrowRightLeft className="h-3.5 w-3.5 text-primary" />
                    </div>
                    Movimentações por Mês
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={200}>
                    <LineChart data={movsByMonth}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="month" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} />
                      <YAxis tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} allowDecimals={false} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: 'hsl(var(--card))',
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '10px',
                          color: 'hsl(var(--foreground))',
                          fontSize: '12px',
                        }}
                      />
                      <Line type="monotone" dataKey="count" name="Movimentações" stroke="hsl(var(--primary))" strokeWidth={2.5} dot={{ r: 4, fill: 'hsl(var(--primary))', strokeWidth: 2, stroke: 'hsl(var(--card))' }} activeDot={{ r: 6, strokeWidth: 2 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card className="animate-in-card shadow-card border-border/50">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-semibold flex items-center gap-2">
                    <div className="p-1.5 rounded-md bg-primary/10">
                      <Clock className="h-3.5 w-3.5 text-primary" />
                    </div>
                    Últimas Movimentações
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-1">
                  {recentMovs.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-8">Nenhuma movimentação</p>
                  ) : recentMovs.map(m => (
                    <div key={m.id} className="flex items-start gap-2.5 text-sm py-2.5 border-b border-border/40 last:border-0 group hover:bg-muted/40 -mx-3 px-3 rounded-lg transition-colors duration-200">
                      <div className="p-1.5 rounded-md bg-primary/10 mt-0.5 group-hover:bg-primary/15 transition-colors">
                        <ArrowRightLeft className="h-3 w-3 text-primary" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-xs">{m.tipo_evento}</p>
                        <p className="text-[11px] text-muted-foreground mt-0.5">
                          {m.item_tipo} • {new Date(m.data_hora).toLocaleDateString('pt-BR')}
                        </p>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>

              <Card className="animate-in-card shadow-card border-border/50">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-semibold flex items-center gap-2">
                    <div className="p-1.5 rounded-md bg-primary/10">
                      <Layers className="h-3.5 w-3.5 text-primary" />
                    </div>
                    Últimos Cadastros
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-1">
                  {recentItems.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-8">Nenhum item</p>
                  ) : recentItems.map(item => (
                    <div key={item.id} className="flex items-start gap-2.5 text-sm py-2.5 border-b border-border/40 last:border-0 group hover:bg-muted/40 -mx-3 px-3 rounded-lg transition-colors duration-200">
                      <div className="p-1.5 rounded-md bg-primary/10 mt-0.5 group-hover:bg-primary/15 transition-colors">
                        {item.tipo === 'Notebook' ? <Laptop className="h-3 w-3 text-primary" /> : <Package className="h-3 w-3 text-primary" />}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-xs truncate">{item.nome}</p>
                        <p className="text-[11px] text-muted-foreground mt-0.5">
                          <span className="font-mono text-[10px]">{item.patrimonio}</span> • {item.tipo} • {new Date(item.created_at).toLocaleDateString('pt-BR')}
                        </p>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>
          </>
        )}
    </div>
  );
}
