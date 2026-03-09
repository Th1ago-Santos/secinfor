import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { Skeleton } from '@/components/ui/skeleton';
import { TrendingUp } from 'lucide-react';
import PageTransition from '@/components/PageTransition';
import StatsCards, { type Stats } from '@/components/dashboard/StatsCards';
import DashboardCharts from '@/components/dashboard/DashboardCharts';
import HardwareAnalysis from '@/components/dashboard/HardwareAnalysis';
import RecentActivity from '@/components/dashboard/RecentActivity';
import PriorityMetrics from '@/components/dashboard/PriorityMetrics';

async function fetchDashboardData() {
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

  const [{ count: movsMes }, { count: invMes }] = await Promise.all([
    supabase.from('movements').select('*', { count: 'exact', head: true }).gte('data_hora', startOfMonth.toISOString()),
    supabase.from('inventory_sessions').select('*', { count: 'exact', head: true }).gte('data_inicio', startOfMonth.toISOString()),
  ]);

  const stats: Stats = {
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
  };

  // Notebooks by section
  const { data: allNbs } = await supabase.from('notebooks').select('secao');
  const sectionMap: Record<string, number> = {};
  (allNbs || []).forEach((n: any) => { sectionMap[n.secao] = (sectionMap[n.secao] || 0) + 1; });
  const nbBySection = Object.entries(sectionMap).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count);

  // Movements by month (last 6 months)
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);
  sixMonthsAgo.setDate(1);
  sixMonthsAgo.setHours(0, 0, 0, 0);
  const { data: movsAll } = await supabase.from('movements').select('data_hora').gte('data_hora', sixMonthsAgo.toISOString()).order('data_hora');
  const monthMap: Record<string, number> = {};
  (movsAll || []).forEach((m: any) => {
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
  const movsByMonth = months.map(m => ({
    month: m.split('-')[1] + '/' + m.split('-')[0].slice(2),
    count: monthMap[m] || 0,
  }));

  // Recent movements
  const { data: recentM } = await supabase.from('movements').select('id, tipo_evento, item_tipo, data_hora').order('data_hora', { ascending: false }).limit(5);

  // Recent items
  const { data: recentNb } = await supabase.from('notebooks').select('id, patrimonio, modelo, created_at').order('created_at', { ascending: false }).limit(3);
  const { data: recentMat } = await supabase.from('materials').select('id, patrimonio, nome, created_at').order('created_at', { ascending: false }).limit(3);
  const recentItems = [
    ...((recentNb as any[]) || []).map(n => ({ id: n.id, patrimonio: n.patrimonio, tipo: 'Notebook', nome: n.modelo, created_at: n.created_at })),
    ...((recentMat as any[]) || []).map(m => ({ id: m.id, patrimonio: m.patrimonio, tipo: 'Material', nome: m.nome, created_at: m.created_at })),
  ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).slice(0, 5);

  const statusPieData = [
    { name: 'Em uso', value: stats.emUso },
    { name: 'Em manutenção', value: stats.emManutencao },
    { name: 'Baixado', value: stats.baixados },
    { name: 'Em estoque', value: stats.emEstoque },
  ].filter(d => d.value > 0);

  return { stats, nbBySection, movsByMonth, recentMovs: recentM || [], recentItems, statusPieData };
}

export default function Dashboard() {
  const { data, isLoading } = useQuery({
    queryKey: ['dashboard'],
    queryFn: fetchDashboardData,
    staleTime: 30_000,
    refetchOnWindowFocus: true,
  });

  return (
    <PageTransition>
      <div className="container mx-auto py-6 px-4">
        <div className="flex items-center gap-3 mb-7">
          <div className="p-2.5 rounded-xl gradient-primary shadow-glow">
            <TrendingUp className="h-5 w-5 text-primary-foreground" />
          </div>
          <div>
            <h2 className="text-xl font-bold tracking-tight">Painel de Controle</h2>
            <p className="text-xs text-muted-foreground mt-0.5">Visão geral do patrimônio</p>
          </div>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            {[...Array(10)].map((_, i) => <Skeleton key={i} className="h-[110px] rounded-xl" />)}
          </div>
        ) : data ? (
          <>
            <StatsCards stats={data.stats} />
            <HardwareAnalysis />
            <PriorityMetrics />
            <DashboardCharts
              nbBySection={data.nbBySection}
              statusPieData={data.statusPieData}
              movsByMonth={data.movsByMonth}
            />
            <RecentActivity
              recentMovs={data.recentMovs}
              recentItems={data.recentItems}
            />
          </>
        ) : null}
      </div>
    </PageTransition>
  );
}
