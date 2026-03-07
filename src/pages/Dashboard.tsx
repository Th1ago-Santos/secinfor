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
import AppHeader from '@/components/AppHeader';

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
  'hsl(142, 71%, 45%)',
  'hsl(38, 92%, 50%)',
  'hsl(0, 72%, 51%)',
  'hsl(215, 50%, 50%)',
];

export default function Dashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState<Stats | null>(null);
  const [nbBySection, setNbBySection] = useState<{ name: string; count: number }[]>([]);
  const [movsByMonth, setMovsByMonth] = useState<{ month: string; count: number }[]>([]);
  const [recentMovs, setRecentMovs] = useState<Movement[]>([]);
  const [recentItems, setRecentItems] = useState<RecentItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAll();
  }, []);

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
      { data: alertsData, count: alertCount },
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

    // Movements this month
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);
    const { count: movsMes } = await supabase.from('movements').select('*', { count: 'exact', head: true })
      .gte('data_hora', startOfMonth.toISOString());

    // Inventory sessions this month
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

    // Notebooks by section
    const { data: allNbs } = await supabase.from('notebooks').select('secao');
    if (allNbs) {
      const map: Record<string, number> = {};
      (allNbs as any[]).forEach(n => { map[n.secao] = (map[n.secao] || 0) + 1; });
      setNbBySection(Object.entries(map).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count));
    }

    // Movements by month (last 6 months)
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

    // Recent movements
    const { data: recentM } = await supabase.from('movements').select('*').order('data_hora', { ascending: false }).limit(5);
    setRecentMovs((recentM as Movement[]) || []);

    // Recent items
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
    { label: 'Total Notebooks', value: stats.totalNotebooks, icon: Laptop, color: 'text-primary' },
    { label: 'Total Materiais', value: stats.totalMaterials, icon: Package, color: 'text-accent' },
    { label: 'Patrimônios', value: stats.totalNotebooks + stats.totalMaterials, icon: Layers, color: 'text-muted-foreground' },
    { label: 'Em Uso', value: stats.emUso, icon: CheckCircle, color: 'text-success' },
    { label: 'Em Manutenção', value: stats.emManutencao, icon: Wrench, color: 'text-warning' },
    { label: 'Baixados', value: stats.baixados, icon: Archive, color: 'text-destructive' },
    { label: 'Seções', value: stats.totalSections, icon: BarChart3, color: 'text-primary' },
    { label: 'Movimentações (mês)', value: stats.movimentacoesMes, icon: ArrowRightLeft, color: 'text-accent' },
    { label: 'Inventários (mês)', value: stats.inventariosMes, icon: ClipboardCheck, color: 'text-success' },
    { label: 'Alertas Ativos', value: stats.alertasAtivos, icon: Bell, color: 'text-destructive', onClick: () => navigate('/alertas') },
  ] : [];

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <main className="container mx-auto py-6 px-4 animate-in-page">
        <h2 className="text-xl font-bold mb-5 flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-primary" />
          Painel de Controle
        </h2>

        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            {[...Array(10)].map((_, i) => <Skeleton key={i} className="h-24 rounded-lg" />)}
          </div>
        ) : (
          <>
            {/* KPI Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-6">
              {indicators.map((ind) => (
                <Card
                  key={ind.label}
                  className={`animate-in-card ${ind.onClick ? 'cursor-pointer hover:border-primary/40' : ''}`}
                  onClick={ind.onClick}
                >
                  <CardContent className="pt-4 pb-3 px-4">
                    <div className="flex items-center justify-between mb-2">
                      <ind.icon className={`h-5 w-5 ${ind.color}`} />
                      {ind.label === 'Alertas Ativos' && ind.value > 0 && (
                        <Badge variant="destructive" className="text-[10px] px-1.5 py-0">{ind.value}</Badge>
                      )}
                    </div>
                    <p className="text-2xl font-bold">{ind.value}</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">{ind.label}</p>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Charts row */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
              {/* Notebooks by section */}
              <Card className="lg:col-span-2 animate-in-card">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-semibold flex items-center gap-2">
                    <BarChart3 className="h-4 w-4 text-primary" />
                    Notebooks por Seção
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {nbBySection.length > 0 ? (
                    <ResponsiveContainer width="100%" height={220}>
                      <BarChart data={nbBySection}>
                        <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                        <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                        <Tooltip />
                        <Bar dataKey="count" name="Notebooks" fill="hsl(215, 50%, 40%)" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <p className="text-sm text-muted-foreground text-center py-12">Sem dados</p>
                  )}
                </CardContent>
              </Card>

              {/* Status pie */}
              <Card className="animate-in-card">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-semibold">Status dos Notebooks</CardTitle>
                </CardHeader>
                <CardContent>
                  {statusPieData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={220}>
                      <PieChart>
                        <Pie data={statusPieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={75} label={({ name, value }) => `${name}: ${value}`} labelLine={false}>
                          {statusPieData.map((_, i) => (
                            <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <p className="text-sm text-muted-foreground text-center py-12">Sem dados</p>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Movements chart + recent panels */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              {/* Movements by month */}
              <Card className="animate-in-card">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-semibold flex items-center gap-2">
                    <ArrowRightLeft className="h-4 w-4 text-primary" />
                    Movimentações por Mês
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={180}>
                    <LineChart data={movsByMonth}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(215, 15%, 25%)" />
                      <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                      <Tooltip />
                      <Line type="monotone" dataKey="count" name="Movimentações" stroke="hsl(45, 85%, 50%)" strokeWidth={2} dot={{ r: 3 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Recent movements */}
              <Card className="animate-in-card">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-semibold flex items-center gap-2">
                    <Clock className="h-4 w-4 text-primary" />
                    Últimas Movimentações
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {recentMovs.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-6">Nenhuma movimentação</p>
                  ) : recentMovs.map(m => (
                    <div key={m.id} className="flex items-start gap-2 text-sm border-b border-border/50 pb-2 last:border-0">
                      <ArrowRightLeft className="h-3.5 w-3.5 mt-0.5 text-muted-foreground shrink-0" />
                      <div className="min-w-0">
                        <p className="font-medium text-xs truncate">{m.tipo_evento}</p>
                        <p className="text-[11px] text-muted-foreground">
                          {m.item_tipo} • {new Date(m.data_hora).toLocaleDateString('pt-BR')}
                        </p>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>

              {/* Recent items */}
              <Card className="animate-in-card">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-semibold flex items-center gap-2">
                    <Layers className="h-4 w-4 text-primary" />
                    Últimos Cadastros
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {recentItems.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-6">Nenhum item</p>
                  ) : recentItems.map(item => (
                    <div key={item.id} className="flex items-start gap-2 text-sm border-b border-border/50 pb-2 last:border-0">
                      {item.tipo === 'Notebook' ? <Laptop className="h-3.5 w-3.5 mt-0.5 text-muted-foreground shrink-0" /> : <Package className="h-3.5 w-3.5 mt-0.5 text-muted-foreground shrink-0" />}
                      <div className="min-w-0">
                        <p className="font-medium text-xs truncate">{item.nome}</p>
                        <p className="text-[11px] text-muted-foreground">
                          <span className="font-mono">{item.patrimonio}</span> • {item.tipo} • {new Date(item.created_at).toLocaleDateString('pt-BR')}
                        </p>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
