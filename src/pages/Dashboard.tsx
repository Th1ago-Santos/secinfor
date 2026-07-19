import { useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent } from '@/components/ui/card';
import {
  Laptop, CheckCircle, Wrench, Archive, Ticket, AlertTriangle, Clock, Package,
  UserX, Camera, MapPin, BarChart3,
} from 'lucide-react';
import PageTransition from '@/components/PageTransition';
import DashboardHeader, { type Period } from '@/components/dashboard/DashboardHeader';
import KpiGroup, { type Kpi } from '@/components/dashboard/KpiGroup';
import EquipmentOverview from '@/components/dashboard/EquipmentOverview';
import TicketsSummary from '@/components/dashboard/TicketsSummary';
import DashboardCharts from '@/components/dashboard/DashboardCharts';
import RecentActivity from '@/components/dashboard/RecentActivity';
import HardwareAnalysis from '@/components/dashboard/HardwareAnalysis';
import OperationalInsights from '@/components/dashboard/OperationalInsights';
import SmartRecommendations from '@/components/dashboard/SmartRecommendations';

function periodStart(p: Period): Date {
  const d = new Date();
  if (p === '7d') d.setDate(d.getDate() - 7);
  else if (p === '30d') d.setDate(d.getDate() - 30);
  else if (p === '6m') { d.setMonth(d.getMonth() - 5); d.setDate(1); }
  else { d.setMonth(d.getMonth() - 11); d.setDate(1); }
  d.setHours(0, 0, 0, 0);
  return d;
}

async function fetchDashboardData(period: Period) {
  const start = periodStart(period);

  // Fetch counts in parallel
  const [
    { count: totalNb },
    { count: totalMat },
    { count: emUso },
    { count: emManutencao },
    { count: baixados },
    { count: emEstoque },
    { count: alertCount },
    { data: allNb },
    { data: recentM },
    { data: recentNb },
    { data: recentMat },
    { data: movsPeriod },
    { count: chAbertos },
    { count: chEmAtend },
    { count: chAguard },
    { count: chConcluidos },
    { count: chUrgentes },
  ] = await Promise.all([
    supabase.from('notebooks').select('*', { count: 'exact', head: true }),
    supabase.from('materials').select('*', { count: 'exact', head: true }),
    supabase.from('notebooks').select('*', { count: 'exact', head: true }).eq('status', 'Em uso'),
    supabase.from('notebooks').select('*', { count: 'exact', head: true }).eq('status', 'Em manutenção'),
    supabase.from('notebooks').select('*', { count: 'exact', head: true }).eq('status', 'Baixado'),
    supabase.from('notebooks').select('*', { count: 'exact', head: true }).eq('status', 'Em estoque'),
    supabase.from('alerts').select('*', { count: 'exact', head: true }).eq('status', 'ativo'),
    supabase.from('notebooks').select('secao, foto_url, militar, patrimonio, status'),
    supabase.from('movements').select('id, tipo_evento, item_tipo, data_hora').order('data_hora', { ascending: false }).limit(6),
    supabase.from('notebooks').select('id, patrimonio, modelo, created_at').order('created_at', { ascending: false }).limit(3),
    supabase.from('materials').select('id, patrimonio, nome, created_at').order('created_at', { ascending: false }).limit(3),
    supabase.from('movements').select('data_hora').gte('data_hora', start.toISOString()).order('data_hora'),
    (supabase as any).from('tickets').select('*', { count: 'exact', head: true }).is('deleted_at', null).ilike('status_name', '%abert%'),
    (supabase as any).from('tickets').select('*', { count: 'exact', head: true }).is('deleted_at', null).ilike('status_name', '%atend%'),
    (supabase as any).from('tickets').select('*', { count: 'exact', head: true }).is('deleted_at', null).ilike('status_name', '%aguard%'),
    (supabase as any).from('tickets').select('*', { count: 'exact', head: true }).is('deleted_at', null).ilike('status_name', '%conclu%'),
    (supabase as any).from('tickets').select('*', { count: 'exact', head: true }).is('deleted_at', null).eq('priority', 'Urgente'),
  ]);

  const nbs = (allNb as any[]) || [];

  // Pendências
  const semFoto = nbs.filter(n => !n.foto_url).length;
  const semSecao = nbs.filter(n => !n.secao?.trim()).length;
  const semResp = nbs.filter(n => !n.militar?.trim()).length;
  const foraCarga = nbs.filter(n => n.status === 'Fora de Carga' || n.patrimonio?.startsWith('FC-')).length;

  // Notebooks por seção
  const sectionMap: Record<string, number> = {};
  nbs.forEach(n => { if (n.secao) sectionMap[n.secao] = (sectionMap[n.secao] || 0) + 1; });
  const nbBySection = Object.entries(sectionMap).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count);

  // Movs by bucket (weeks/months) depending on period
  const bucketFmt = (d: Date) => {
    if (period === '7d' || period === '30d') return `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}`;
    return `${String(d.getMonth()+1).padStart(2,'0')}/${String(d.getFullYear()).slice(2)}`;
  };
  const buckets: Record<string, number> = {};
  (movsPeriod || []).forEach((m: any) => {
    const d = new Date(m.data_hora);
    buckets[bucketFmt(d)] = (buckets[bucketFmt(d)] || 0) + 1;
  });
  // Ordered bucket list
  const list: { month: string; count: number }[] = [];
  const cursor = new Date(start);
  const now = new Date();
  if (period === '7d' || period === '30d') {
    while (cursor <= now) {
      const k = bucketFmt(cursor);
      list.push({ month: k, count: buckets[k] || 0 });
      cursor.setDate(cursor.getDate() + 1);
    }
  } else {
    while (cursor <= now) {
      const k = bucketFmt(cursor);
      list.push({ month: k, count: buckets[k] || 0 });
      cursor.setMonth(cursor.getMonth() + 1);
    }
  }

  const recentItems = [
    ...((recentNb as any[]) || []).map(n => ({ id: n.id, patrimonio: n.patrimonio, tipo: 'Notebook', nome: n.modelo, created_at: n.created_at })),
    ...((recentMat as any[]) || []).map(m => ({ id: m.id, patrimonio: m.patrimonio, tipo: 'Material', nome: m.nome, created_at: m.created_at })),
  ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).slice(0, 6);

  const statusPieData = [
    { name: 'Em uso', value: emUso || 0 },
    { name: 'Em manutenção', value: emManutencao || 0 },
    { name: 'Em estoque', value: emEstoque || 0 },
    { name: 'Baixado', value: baixados || 0 },
  ].filter(d => d.value > 0);

  return {
    totals: {
      totalNotebooks: totalNb || 0,
      totalMaterials: totalMat || 0,
      emUso: emUso || 0,
      emManutencao: emManutencao || 0,
      baixados: baixados || 0,
      emEstoque: emEstoque || 0,
      alertasAtivos: alertCount || 0,
      foraCarga,
    },
    pendencias: { semFoto, semSecao, semResp, foraCarga },
    chamados: {
      abertos: chAbertos || 0,
      emAtendimento: chEmAtend || 0,
      aguardandoMaterial: chAguard || 0,
      concluidos: chConcluidos || 0,
      urgentes: chUrgentes || 0,
    },
    nbBySection,
    statusPieData,
    movsByMonth: list,
    recentMovs: (recentM as any[]) || [],
    recentItems,
    lastUpdated: new Date(),
  };
}

export default function Dashboard() {
  const [period, setPeriod] = useState<Period>('6m');
  const queryClient = useQueryClient();

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ['dashboard', period],
    queryFn: () => fetchDashboardData(period),
    staleTime: 60_000,
    refetchOnWindowFocus: true,
  });

  const equipamentosKpis: Kpi[] = useMemo(() => data ? [
    { label: 'Total de notebooks', value: data.totals.totalNotebooks, icon: Laptop, variant: 'primary', hint: 'Cadastrados no sistema', to: '/notebooks' },
    { label: 'Em uso', value: data.totals.emUso, icon: CheckCircle, variant: 'info', hint: 'Cautelados a militares', to: '/notebooks?status=Em uso' },
    { label: 'Em manutenção', value: data.totals.emManutencao, icon: Wrench, variant: 'warning', hint: 'Atendimento técnico', to: '/notebooks?status=Em manutenção' },
    { label: 'Baixados / Fora de carga', value: data.totals.baixados + data.totals.foraCarga, icon: Archive, variant: 'destructive', hint: 'Requerem revisão', to: '/notebooks?status=Baixado' },
  ] : [], [data]);

  const chamadosKpis: Kpi[] = useMemo(() => data ? [
    { label: 'Chamados abertos', value: data.chamados.abertos, icon: Ticket, variant: 'info', to: '/chamados?status=aberto' },
    { label: 'Em atendimento', value: data.chamados.emAtendimento, icon: Clock, variant: 'warning', to: '/chamados?status=em_atendimento' },
    { label: 'Aguardando material', value: data.chamados.aguardandoMaterial, icon: Package, variant: 'primary', to: '/chamados?status=aguardando' },
    { label: 'Urgentes', value: data.chamados.urgentes, icon: AlertTriangle, variant: 'destructive', to: '/chamados?priority=Urgente' },
  ] : [], [data]);

  const pendenciasKpis: Kpi[] = useMemo(() => data ? [
    { label: 'Sem foto', value: data.pendencias.semFoto, icon: Camera, variant: 'muted', hint: 'Equipamentos sem imagem', to: '/notebooks' },
    { label: 'Sem seção', value: data.pendencias.semSecao, icon: MapPin, variant: 'warning', hint: 'Localização não definida', to: '/notebooks' },
    { label: 'Sem responsável', value: data.pendencias.semResp, icon: UserX, variant: 'warning', hint: 'Militar não cautelado', to: '/notebooks' },
    { label: 'Fora de carga', value: data.pendencias.foraCarga, icon: Archive, variant: 'destructive', hint: 'Pendente de baixa', to: '/notebooks?status=Fora de Carga' },
  ] : [], [data]);

  const overviewNotebooks = data ? {
    total: data.totals.totalNotebooks,
    disponiveis: data.totals.emEstoque,
    emUso: data.totals.emUso,
    emManutencao: data.totals.emManutencao,
  } : { total: 0, disponiveis: 0, emUso: 0, emManutencao: 0 };

  return (
    <PageTransition>
      <div className="mx-auto py-6 px-4 max-w-[1600px]">
        <DashboardHeader
          period={period}
          onPeriodChange={setPeriod}
          lastUpdated={data?.lastUpdated ?? null}
          onRefresh={() => queryClient.invalidateQueries({ queryKey: ['dashboard'] })}
          refreshing={isFetching}
        />

        {isLoading || !data ? (
          <div className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-[110px] rounded-xl" />)}
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-[110px] rounded-xl" />)}
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <Skeleton className="h-[260px] rounded-xl" />
              <Skeleton className="h-[260px] rounded-xl" />
            </div>
          </div>
        ) : (
          <>
            <KpiGroup title="Equipamentos" description="Notebooks cadastrados e sua situação atual" kpis={equipamentosKpis} />

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-6 gap-y-0">
              <KpiGroup title="Chamados" description="Situação da fila de atendimento" kpis={chamadosKpis} />
              <KpiGroup title="Pendências" description="Cadastros incompletos que precisam de atenção" kpis={pendenciasKpis} />
            </div>

            <OperationalInsights />
            <SmartRecommendations />

            <EquipmentOverview notebooks={overviewNotebooks} />

            <DashboardCharts
              nbBySection={data.nbBySection}
              statusPieData={data.statusPieData}
              movsByMonth={data.movsByMonth}
              totalNotebooks={data.totals.totalNotebooks}
            />

            <div className="mb-6">
              <HardwareAnalysis />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <div className="lg:col-span-2 grid grid-cols-1 lg:grid-cols-2 gap-4">
                <RecentActivity recentMovs={data.recentMovs} recentItems={data.recentItems} />
              </div>
              <TicketsSummary
                abertos={data.chamados.abertos}
                emAtendimento={data.chamados.emAtendimento}
                aguardandoMaterial={data.chamados.aguardandoMaterial}
                concluidos={data.chamados.concluidos}
              />
            </div>

            {data.totals.alertasAtivos === 0 && (
              <Card className="mt-6 border-success/30 bg-success/5">
                <CardContent className="py-4 flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-success/10">
                    <CheckCircle className="h-4 w-4 text-success" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold">Nenhuma pendência crítica encontrada</p>
                    <p className="text-[11px] text-muted-foreground">Todos os equipamentos e alertas estão regularizados.</p>
                  </div>
                </CardContent>
              </Card>
            )}
          </>
        )}
      </div>
    </PageTransition>
  );
}
