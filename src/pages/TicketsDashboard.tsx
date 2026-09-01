import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useUserRole } from '@/hooks/useUserRole';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  LayoutDashboard, Ticket as TicketIcon, PlayCircle, Package as PackageIcon, UserCheck,
  CheckCircle2, AlertTriangle, Clock, CalendarPlus, CalendarCheck, TrendingUp, TrendingDown,
  ArrowRight, ListChecks, Timer, UserX, Activity,
} from 'lucide-react';
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip as RTooltip, CartesianGrid,
  LineChart, Line, PieChart, Pie, Cell, Legend,
} from 'recharts';
import PageTransition from '@/components/PageTransition';
import PageHeader from '@/components/PageHeader';
import { StatusBadge, PriorityBadge } from '@/components/ui/status-badge';
import { resolveStatusColor, priorityColor } from '@/lib/statusColor';
import TicketsSubNav from '@/components/TicketsSubNav';
import SlaPanel from '@/components/tickets/SlaPanel';
import { useTicketQueues, useTicketStatuses } from '@/hooks/useTicketMeta';
import { formatTicketAge, PRIORITY_COLORS, type Ticket, type TicketHistory, type TicketPriority } from '@/types/ticket';

type Period = '7' | '30' | '90';


const STALE_DAYS = 7; // "muito tempo sem atualização"
const OVERDUE_DAYS = 14; // vencido/antigo

function startOfDay(d: Date) { const x = new Date(d); x.setHours(0,0,0,0); return x; }
function daysAgo(n: number) { const d = new Date(); d.setDate(d.getDate() - n); return startOfDay(d); }

type KpiCardProps = {
  icon: any; label: string; value: number; description?: string;
  color: string; onClick?: () => void; delta?: number | null; loading?: boolean;
};
function KpiCard({ icon: Icon, label, value, description, color, onClick, delta, loading }: KpiCardProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="text-left group bg-card border border-border/60 rounded-xl p-4 shadow-card hover:shadow-card-hover hover:-translate-y-0.5 transition-all"
      style={{ borderTopWidth: 3, borderTopColor: color }}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="p-2 rounded-lg" style={{ background: `${color}1a`, color }}>
          <Icon className="h-4 w-4" />
        </div>
        {delta != null && !loading && (
          <span className={`inline-flex items-center gap-0.5 text-[10px] font-semibold ${delta >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
            {delta >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
            {delta > 0 ? '+' : ''}{delta}
          </span>
        )}
      </div>
      <p className="mt-3 text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">{label}</p>
      {loading ? (
        <Skeleton className="h-8 w-16 mt-1" />
      ) : (
        <p className="text-3xl font-bold tracking-tight tabular-nums">{value}</p>
      )}
      {description && <p className="text-[10px] text-muted-foreground mt-1">{description}</p>}
      <div className="mt-2 flex items-center gap-1 text-[10px] text-primary opacity-0 group-hover:opacity-100 transition">
        Ver lista <ArrowRight className="h-3 w-3" />
      </div>
    </button>
  );
}

export default function TicketsDashboard() {
  const navigate = useNavigate();
  const { queues } = useTicketQueues();
  const { statuses } = useTicketStatuses();
  const { sectionScope } = useUserRole();

  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [history, setHistory] = useState<TicketHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<Period>('30');

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      const [tRes, hRes] = await Promise.all([
        (sectionScope
          ? (supabase as any).from('tickets').select('*').is('deleted_at', null).eq('client_section_name', sectionScope).order('created_at', { ascending: false })
          : (supabase as any).from('tickets').select('*').is('deleted_at', null).order('created_at', { ascending: false })),
        (supabase as any).from('ticket_history').select('*').order('created_at', { ascending: false }).limit(20),
      ]);
      if (!alive) return;
      setTickets((tRes.data as Ticket[]) || []);
      setHistory((hRes.data as TicketHistory[]) || []);
      setLoading(false);
    })();
    return () => { alive = false; };
  }, [sectionScope]);

  const statusByName = useMemo(() => {
    const m: Record<string, string> = {};
    statuses.forEach(s => { m[s.name] = s.id; });
    return m;
  }, [statuses]);

  const statusNameById = useMemo(() => {
    const m: Record<string, string> = {};
    statuses.forEach(s => { m[s.id] = s.name; });
    return m;
  }, [statuses]);

  const queueNameById = useMemo(() => {
    const m: Record<string, string> = {};
    queues.forEach(q => { m[q.id] = q.name; });
    return m;
  }, [queues]);

  const now = Date.now();
  const startToday = startOfDay(new Date()).getTime();

  const stats = useMemo(() => {
    const total = tickets.length;
    const openTickets = tickets.filter(t => {
      const sname = statusNameById[t.status_id || ''];
      return !statuses.find(s => s.id === t.status_id)?.is_closed;
    });
    const byName = (name: string) => tickets.filter(t => statusNameById[t.status_id || ''] === name).length;
    const openedToday = tickets.filter(t => new Date(t.created_at).getTime() >= startToday).length;
    const closedToday = tickets.filter(t => t.closed_at && new Date(t.closed_at).getTime() >= startToday).length;
    const overdue = openTickets.filter(t => (now - new Date(t.created_at).getTime()) / 86400000 > OVERDUE_DAYS).length;
    const urgent = openTickets.filter(t => t.priority === 'Urgente').length;
    const unassigned = openTickets.filter(t => !t.assigned_user_id).length;
    const stale = openTickets.filter(t => (now - new Date(t.updated_at).getTime()) / 86400000 > STALE_DAYS).length;

    // Prev period delta (opened count vs previous period of same length)
    const days = parseInt(period, 10);
    const cutoffCur = daysAgo(days).getTime();
    const cutoffPrev = daysAgo(days * 2).getTime();
    const curOpened = tickets.filter(t => new Date(t.created_at).getTime() >= cutoffCur).length;
    const prevOpened = tickets.filter(t => {
      const ts = new Date(t.created_at).getTime();
      return ts >= cutoffPrev && ts < cutoffCur;
    }).length;
    const deltaOpened = curOpened - prevOpened;

    return {
      total, open: byName('Aberto'), inProgress: byName('Em atendimento'),
      waitingMaterial: byName('Aguardando material'), waitingUser: byName('Aguardando usuário'),
      done: byName('Concluído'), cancelled: byName('Cancelado'),
      urgent, overdue, openedToday, closedToday, unassigned, stale,
      openTickets, deltaOpened,
    };
  }, [tickets, statuses, statusNameById, now, startToday, period]);

  // Chart data
  const statusData = useMemo(() =>
    statuses.map(s => ({
      name: s.name,
      value: tickets.filter(t => t.status_id === s.id).length,
      color: resolveStatusColor(s),
    })).filter(x => x.value > 0),
  [statuses, tickets]);

  const queueData = useMemo(() =>
    queues.map(q => ({
      name: q.name,
      value: tickets.filter(t => t.queue_id === q.id).length,
      id: q.id,
    })).filter(x => x.value > 0),
  [queues, tickets]);

  const priorityData = useMemo(() => {
    const prios: TicketPriority[] = ['Baixa', 'Normal', 'Alta', 'Urgente'];
    return prios.map(p => ({
      name: p,
      value: tickets.filter(t => t.priority === p).length,
      color: priorityColor(p),
    })).filter(x => x.value > 0);
  }, [tickets]);

  const sectionData = useMemo(() => {
    const map = new Map<string, number>();
    tickets.forEach(t => { map.set(t.client_section_name, (map.get(t.client_section_name) || 0) + 1); });
    return Array.from(map.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 8);
  }, [tickets]);

  const timelineData = useMemo(() => {
    const days = parseInt(period, 10);
    const buckets: { date: string; abertos: number; concluidos: number }[] = [];
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(); d.setDate(d.getDate() - i); d.setHours(0,0,0,0);
      buckets.push({
        date: d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
        abertos: 0, concluidos: 0,
      });
    }
    const start = daysAgo(days - 1).getTime();
    tickets.forEach(t => {
      const ct = new Date(t.created_at).getTime();
      if (ct >= start) {
        const idx = Math.floor((ct - start) / 86400000);
        if (buckets[idx]) buckets[idx].abertos++;
      }
      if (t.closed_at) {
        const ctc = new Date(t.closed_at).getTime();
        if (ctc >= start) {
          const idx = Math.floor((ctc - start) / 86400000);
          if (buckets[idx]) buckets[idx].concluidos++;
        }
      }
    });
    return buckets;
  }, [tickets, period]);

  const technicianData = useMemo(() => {
    const map = new Map<string, { name: string; atribuidos: number; concluidos: number; abertos: number; totalMs: number; resolvedCount: number }>();
    tickets.forEach(t => {
      if (!t.assigned_user_name) return;
      const key = t.assigned_user_name;
      const row = map.get(key) || { name: key, atribuidos: 0, concluidos: 0, abertos: 0, totalMs: 0, resolvedCount: 0 };
      row.atribuidos++;
      const isClosed = statuses.find(s => s.id === t.status_id)?.is_closed;
      if (isClosed) {
        row.concluidos++;
        if (t.closed_at) {
          row.totalMs += new Date(t.closed_at).getTime() - new Date(t.created_at).getTime();
          row.resolvedCount++;
        }
      } else {
        row.abertos++;
      }
      map.set(key, row);
    });
    return Array.from(map.values())
      .map(r => ({ ...r, avgHours: r.resolvedCount ? Math.round((r.totalMs / r.resolvedCount) / 3600000) : 0 }))
      .sort((a, b) => b.atribuidos - a.atribuidos)
      .slice(0, 6);
  }, [tickets, statuses]);

  // KPIs de desempenho
  const kpis = useMemo(() => {
    const closedTickets = tickets.filter(t => t.closed_at);
    const totalResolveMs = closedTickets.reduce((acc, t) =>
      acc + (new Date(t.closed_at!).getTime() - new Date(t.created_at).getTime()), 0);
    const avgResolveHours = closedTickets.length ? Math.round((totalResolveMs / closedTickets.length) / 3600000) : 0;

    const oldest = stats.openTickets.slice().sort((a, b) =>
      new Date(a.created_at).getTime() - new Date(b.created_at).getTime())[0];

    const days = parseInt(period, 10);
    const cutoff = daysAgo(days).getTime();
    const recebidos = tickets.filter(t => new Date(t.created_at).getTime() >= cutoff).length;
    const concluidosNoPeriodo = tickets.filter(t => t.closed_at && new Date(t.closed_at!).getTime() >= cutoff).length;
    const taxa = recebidos ? Math.round((concluidosNoPeriodo / recebidos) * 100) : 0;

    return {
      avgResolveHours, oldest, recebidos, concluidosNoPeriodo, taxa,
      semResponsavel: stats.unassigned, parados: stats.stale,
    };
  }, [tickets, stats, period]);

  const goToList = (params: Record<string, string>) => {
    const qs = new URLSearchParams(params).toString();
    navigate(`/chamados${qs ? `?${qs}` : ''}`);
  };

  const attention = useMemo(() => {
    const list: (Ticket & { reason: string })[] = [];
    const seen = new Set<string>();
    const add = (t: Ticket, reason: string) => {
      if (seen.has(t.id)) return;
      seen.add(t.id);
      list.push({ ...t, reason });
    };
    stats.openTickets.forEach(t => {
      const ageDays = (now - new Date(t.created_at).getTime()) / 86400000;
      const staleDays = (now - new Date(t.updated_at).getTime()) / 86400000;
      if (t.priority === 'Urgente') add(t, 'Urgente');
      else if (ageDays > OVERDUE_DAYS) add(t, `Vencido (${Math.floor(ageDays)}d)`);
      else if (!t.assigned_user_id) add(t, 'Sem responsável');
      else if (staleDays > STALE_DAYS) add(t, `Parado ${Math.floor(staleDays)}d`);
    });
    return list.slice(0, 8);
  }, [stats.openTickets, now]);

  const openId = statusByName['Aberto'];
  const inProgId = statusByName['Em atendimento'];
  const waitMatId = statusByName['Aguardando material'];
  const waitUsrId = statusByName['Aguardando usuário'];
  const doneId = statusByName['Concluído'];

  return (
    <PageTransition>
      <div className="container mx-auto py-6 px-4 max-w-[1400px]">
        <PageHeader
          icon={LayoutDashboard}
          title="Dashboard de Chamados"
          description="Visão em tempo real das operações de suporte"
          actions={
            <Select value={period} onValueChange={(v) => setPeriod(v as Period)}>
              <SelectTrigger className="h-9 w-[180px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="7">Últimos 7 dias</SelectItem>
                <SelectItem value="30">Últimos 30 dias</SelectItem>
                <SelectItem value="90">Últimos 90 dias</SelectItem>
              </SelectContent>
            </Select>
          }
        />

        <TicketsSubNav />

        {/* KPI CARDS */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-5">
          <KpiCard loading={loading} icon={TicketIcon} label="Total" value={stats.total}
            color="#3b82f6" onClick={() => goToList({})} description="Todos os chamados" />
          <KpiCard loading={loading} icon={TicketIcon} label="Abertos" value={stats.open}
            color="#3b82f6" onClick={() => openId && goToList({ status: openId })} />
          <KpiCard loading={loading} icon={PlayCircle} label="Em atendimento" value={stats.inProgress}
            color="#7c3aed" onClick={() => inProgId && goToList({ status: inProgId })} />
          <KpiCard loading={loading} icon={PackageIcon} label="Aguard. material" value={stats.waitingMaterial}
            color="#f97316" onClick={() => waitMatId && goToList({ status: waitMatId })} />
          <KpiCard loading={loading} icon={UserCheck} label="Aguard. usuário" value={stats.waitingUser}
            color="#eab308" onClick={() => waitUsrId && goToList({ status: waitUsrId })} />
          <KpiCard loading={loading} icon={CheckCircle2} label="Concluídos" value={stats.done}
            color="#22c55e" onClick={() => doneId && goToList({ status: doneId })} />
          <KpiCard loading={loading} icon={AlertTriangle} label="Urgentes" value={stats.urgent}
            color="#ef4444" onClick={() => goToList({ priority: 'Urgente' })} />
          <KpiCard loading={loading} icon={Clock} label="Vencidos" value={stats.overdue}
            color="#dc2626" onClick={() => goToList({ overdue: '1' })} description={`> ${OVERDUE_DAYS} dias em aberto`} />
          <KpiCard loading={loading} icon={CalendarPlus} label="Abertos hoje" value={stats.openedToday}
            color="#3b82f6" onClick={() => goToList({ today: 'open' })} delta={stats.deltaOpened} />
          <KpiCard loading={loading} icon={CalendarCheck} label="Concluídos hoje" value={stats.closedToday}
            color="#22c55e" onClick={() => goToList({ today: 'closed' })} />
        </div>

        {/* PERFORMANCE INDICATORS */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-5">
          {[
            { icon: Timer, label: 'Tempo médio de resolução', value: `${kpis.avgResolveHours}h` },
            { icon: ListChecks, label: 'Taxa de conclusão', value: `${kpis.taxa}%`, sub: `${period}d` },
            { icon: UserX, label: 'Sem responsável', value: kpis.semResponsavel },
            { icon: Clock, label: 'Parados >7d', value: kpis.parados },
            { icon: CalendarPlus, label: `Recebidos (${period}d)`, value: kpis.recebidos },
            { icon: CheckCircle2, label: `Concluídos (${period}d)`, value: kpis.concluidosNoPeriodo },
          ].map((k, i) => (
            <div key={i} className="bg-card border border-border/60 rounded-xl p-3 shadow-card">
              <div className="flex items-center gap-2 mb-1.5">
                <k.icon className="h-3.5 w-3.5 text-muted-foreground" />
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold truncate">{k.label}</p>
              </div>
              <p className="text-xl font-bold tabular-nums">{k.value}</p>
              {k.sub && <p className="text-[10px] text-muted-foreground mt-0.5">{k.sub}</p>}
            </div>
          ))}
        </div>

        <SlaPanel tickets={tickets.filter(t => !t.closed_at)} />

        {kpis.oldest && (
          <Card className="mb-5 shadow-card border-border/60 border-l-4 border-l-orange-500">
            <CardContent className="pt-4 pb-4 flex items-center justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-orange-500/10 text-orange-500">
                  <Clock className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Chamado mais antigo em aberto</p>
                  <p className="text-sm font-semibold mt-0.5">
                    <span className="font-mono">{kpis.oldest.ticket_number}</span> · {kpis.oldest.subject}
                  </p>
                  <p className="text-xs text-muted-foreground">{kpis.oldest.client_section_name} · {formatTicketAge(kpis.oldest.created_at)}</p>
                </div>
              </div>
              <Button size="sm" variant="outline" onClick={() => navigate(`/chamados/${kpis.oldest!.id}`)}>Abrir</Button>
            </CardContent>
          </Card>
        )}

        {/* CHARTS */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-5">
          <Card className="shadow-card border-border/60">
            <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold">Abertos vs concluídos ({period}d)</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={240}>
                <LineChart data={timelineData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                  <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" allowDecimals={false} />
                  <RTooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8, fontSize: 12 }} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Line type="monotone" dataKey="abertos" name="Abertos" stroke="#3b82f6" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="concluidos" name="Concluídos" stroke="#22c55e" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card className="shadow-card border-border/60">
            <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold">Chamados por status</CardTitle></CardHeader>
            <CardContent>
              {statusData.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-12">Sem dados</p>
              ) : (
                <ResponsiveContainer width="100%" height={240}>
                  <PieChart>
                    <Pie data={statusData} dataKey="value" nameKey="name" innerRadius={50} outerRadius={90} paddingAngle={2}
                      onClick={(d: any) => { const id = statusByName[d.name]; if (id) goToList({ status: id }); }}
                      style={{ cursor: 'pointer' }}>
                      {statusData.map((e, i) => <Cell key={i} fill={e.color} />)}
                    </Pie>
                    <RTooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8, fontSize: 12 }} />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          <Card className="shadow-card border-border/60">
            <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold">Chamados por fila</CardTitle></CardHeader>
            <CardContent>
              {queueData.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-12">Sem dados</p>
              ) : (
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart data={queueData} layout="vertical" margin={{ left: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis type="number" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" allowDecimals={false} />
                    <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" width={120} />
                    <RTooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8, fontSize: 12 }} />
                    <Bar dataKey="value" fill="#3b82f6" radius={[0, 6, 6, 0]}
                      onClick={(d: any) => goToList({ queue: d.id })} style={{ cursor: 'pointer' }} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          <Card className="shadow-card border-border/60">
            <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold">Prioridade</CardTitle></CardHeader>
            <CardContent>
              {priorityData.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-12">Sem dados</p>
              ) : (
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart data={priorityData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="name" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                    <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" allowDecimals={false} />
                    <RTooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8, fontSize: 12 }} />
                    <Bar dataKey="value" radius={[6, 6, 0, 0]}
                      onClick={(d: any) => goToList({ priority: d.name })} style={{ cursor: 'pointer' }}>
                      {priorityData.map((e, i) => <Cell key={i} fill={e.color} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          <Card className="shadow-card border-border/60 lg:col-span-2">
            <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold">Top seções com mais chamados</CardTitle></CardHeader>
            <CardContent>
              {sectionData.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-12">Sem dados</p>
              ) : (
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart data={sectionData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="name" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" angle={-15} textAnchor="end" height={60} />
                    <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" allowDecimals={false} />
                    <RTooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8, fontSize: 12 }} />
                    <Bar dataKey="value" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          {technicianData.length > 0 && (
            <Card className="shadow-card border-border/60 lg:col-span-2">
              <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold">Desempenho por técnico</CardTitle></CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border/60 bg-muted/30">
                        <th className="text-left px-4 py-2 text-[10px] uppercase tracking-widest font-semibold">Técnico</th>
                        <th className="text-right px-4 py-2 text-[10px] uppercase tracking-widest font-semibold">Atribuídos</th>
                        <th className="text-right px-4 py-2 text-[10px] uppercase tracking-widest font-semibold">Concluídos</th>
                        <th className="text-right px-4 py-2 text-[10px] uppercase tracking-widest font-semibold">Abertos</th>
                        <th className="text-right px-4 py-2 text-[10px] uppercase tracking-widest font-semibold">Tempo médio</th>
                      </tr>
                    </thead>
                    <tbody>
                      {technicianData.map((row) => (
                        <tr key={row.name} className="border-b border-border/40 hover:bg-muted/20">
                          <td className="px-4 py-2 font-medium">{row.name}</td>
                          <td className="px-4 py-2 text-right tabular-nums">{row.atribuidos}</td>
                          <td className="px-4 py-2 text-right tabular-nums text-emerald-500">{row.concluidos}</td>
                          <td className="px-4 py-2 text-right tabular-nums text-blue-500">{row.abertos}</td>
                          <td className="px-4 py-2 text-right tabular-nums text-muted-foreground">{row.avgHours}h</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* ATTENTION LIST */}
        <Card className="shadow-card border-border/60 mb-5">
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-orange-500" />
              Precisam de atenção
            </CardTitle>
            <Badge variant="outline" className="text-[10px]">{attention.length}</Badge>
          </CardHeader>
          <CardContent className="p-0">
            {attention.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-10">Nenhum chamado crítico no momento 🎉</p>
            ) : (
              <div className="divide-y divide-border/40">
                {attention.map(t => {
                  const sMeta = statuses.find(s => s.id === t.status_id);
                  return (
                    <div key={t.id} className="px-4 py-3 flex items-center gap-3 hover:bg-muted/30 group">
                      <Badge variant="outline" className="text-[10px] shrink-0 border-orange-500/40 text-orange-500 bg-orange-500/5">
                        {t.reason}
                      </Badge>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold truncate">
                          <span className="font-mono text-xs mr-2">{t.ticket_number}</span>
                          {t.subject}
                        </p>
                        <p className="text-[11px] text-muted-foreground truncate">
                          {t.client_section_name} · {queueNameById[t.queue_id || ''] || '—'} · {formatTicketAge(t.created_at)}
                          {t.assigned_user_name ? ` · ${t.assigned_user_name}` : ' · sem responsável'}
                        </p>
                      </div>
                      {sMeta && (
                        <StatusBadge status={sMeta} size="xs" className="hidden md:inline-flex" />
                      )}
                      <PriorityBadge priority={t.priority} size="xs" className="hidden sm:inline-flex" />
                      <Button size="sm" variant="ghost" onClick={() => navigate(`/chamados/${t.id}`)}>
                        Abrir <ArrowRight className="h-3 w-3 ml-1" />
                      </Button>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* RECENT ACTIVITY TIMELINE */}
        <Card className="shadow-card border-border/60">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Activity className="h-4 w-4 text-primary" />
              Atividades recentes
            </CardTitle>
          </CardHeader>
          <CardContent>
            {history.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-8">Nenhuma atividade registrada</p>
            ) : (
              <ol className="relative border-l border-border/60 ml-2 space-y-4">
                {history.map(h => {
                  const t = tickets.find(x => x.id === h.ticket_id);
                  return (
                    <li key={h.id} className="ml-4">
                      <div className="absolute -left-1.5 mt-1.5 h-3 w-3 rounded-full bg-primary/20 border-2 border-primary" />
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <p className="text-sm">
                          <span className="font-semibold">{h.user_name || 'Sistema'}</span>{' '}
                          <span className="text-muted-foreground">{h.description || h.action}</span>{' '}
                          {t && (
                            <button
                              onClick={() => navigate(`/chamados/${h.ticket_id}`)}
                              className="font-mono text-xs text-primary hover:underline"
                            >
                              {t.ticket_number}
                            </button>
                          )}
                        </p>
                        <span className="text-[10px] text-muted-foreground tabular-nums">
                          {new Date(h.created_at).toLocaleString('pt-BR')}
                        </span>
                      </div>
                    </li>
                  );
                })}
              </ol>
            )}
          </CardContent>
        </Card>
      </div>
    </PageTransition>
  );
}
