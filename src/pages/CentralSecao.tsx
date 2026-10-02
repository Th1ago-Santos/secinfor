import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Building2, RefreshCw, Ticket, Clock, CheckCircle2, AlertTriangle, Package, Wallet,
  ClipboardList, AlertOctagon, Laptop, Wrench, ArrowRightLeft, UserX, ShieldAlert,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useUserRole, ROLE_LABELS } from '@/hooks/useUserRole';
import { useSections } from '@/hooks/useSections';
import { useTicketStatuses, useTicketSla } from '@/hooks/useTicketMeta';
import PageHeader from '@/components/PageHeader';
import PageTransition from '@/components/PageTransition';
import EmptyState from '@/components/EmptyState';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { StatusBadge, PriorityBadge } from '@/components/ui/status-badge';
import { formatCurrencyStrict, totalValue } from '@/lib/currency';
import { CONFERENCE_STATUS_LABELS, conferenceBadgeClass } from '@/lib/conferenceStatus';

const ALL = '__all__';
const fmtDate = (d?: string | null) => (d ? new Date(d).toLocaleDateString('pt-BR') : '—');

type Data = {
  tickets: any[]; materials: any[]; conferences: any[]; confItems: any[];
  notebooks: any[]; movements: any[];
};

export default function CentralSecao() {
  const navigate = useNavigate();
  const { role, isChefeSecao, sectionName, missingSection } = useUserRole();
  const { sections } = useSections();
  const { statuses } = useTicketStatuses();
  const { slaFor } = useTicketSla();
  const [selected, setSelected] = useState<string>(ALL);
  const [data, setData] = useState<Data | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null);

  // chefe_secao: seção fixa (RLS também restringe no banco)
  const section = isChefeSecao ? sectionName : selected === ALL ? null : selected;

  const load = useCallback(async () => {
    if (isChefeSecao && !sectionName) { setLoading(false); return; }
    setLoading(true); setError(null);
    try {
      const sb = supabase as any;
      let t = sb.from('tickets').select('id,ticket_number,subject,priority,status_id,assigned_user_id,assigned_user_name,queue_id,created_at,closed_at,client_section_name').is('deleted_at', null).order('created_at', { ascending: false }).limit(500);
      let m = sb.from('materials').select('id,nome,patrimonio,responsavel,valor_unitario,quantidade,situacao,codigo_material,numero_ficha,section_name,updated_at').order('updated_at', { ascending: false });
      let c = sb.from('material_conferences').select('id,title,status,section_name,started_at,completed_at').order('started_at', { ascending: false });
      let n = sb.from('notebooks').select('id,modelo,patrimonio,secao,status');
      if (section) {
        t = t.eq('client_section_name', section);
        m = m.eq('section_name', section);
        c = c.eq('section_name', section);
        n = n.eq('secao', section);
      }
      const [tr, mr, cr, nr] = await Promise.all([t, m, c, n]);
      const firstErr = tr.error || mr.error || cr.error || nr.error;
      if (firstErr) throw firstErr;
      const conferences = cr.data || [];
      const notebooks = nr.data || [];
      const confIds = conferences.map((x: any) => x.id);
      const nbIds = notebooks.map((x: any) => x.id);
      const [ir, mvr] = await Promise.all([
        confIds.length ? sb.from('material_conference_items').select('conference_id,status').in('conference_id', confIds.slice(0, 200)) : { data: [] },
        nbIds.length ? sb.from('movements').select('id,item_id,tipo_evento,secao_origem,secao_destino,data_hora').eq('item_tipo', 'notebook').in('item_id', nbIds.slice(0, 300)).order('data_hora', { ascending: false }).limit(6) : { data: [] },
      ]);
      setData({ tickets: tr.data || [], materials: mr.data || [], conferences, confItems: ir.data || [], notebooks, movements: mvr.data || [] });
      setUpdatedAt(new Date());
    } catch (e: any) {
      setError(e?.message || 'Erro ao carregar dados da seção.');
    } finally {
      setLoading(false);
    }
  }, [section, isChefeSecao, sectionName]);

  useEffect(() => { if (role) load(); }, [load, role]);

  const statusMap = useMemo(() => Object.fromEntries(statuses.map(s => [s.id, s])), [statuses]);

  const stats = useMemo(() => {
    if (!data) return null;
    const isClosed = (tk: any) => !!statusMap[tk.status_id]?.is_closed || !!tk.closed_at;
    const open = data.tickets.filter(tk => !isClosed(tk));
    const inProgress = open.filter(tk => tk.assigned_user_id);
    const monthStart = new Date(); monthStart.setDate(1); monthStart.setHours(0, 0, 0, 0);
    const closedMonth = data.tickets.filter(tk => isClosed(tk) && tk.closed_at && new Date(tk.closed_at) >= monthStart);
    const overdue = open.filter(tk => {
      const rule = slaFor(tk.priority, tk.queue_id);
      return rule && Date.now() - new Date(tk.created_at).getTime() > rule.resolution_minutes * 60000;
    });
    const critical = open.filter(tk => tk.priority === 'Urgente' || tk.priority === 'Alta');
    const mats = data.materials;
    const valor = mats.reduce((s, x) => s + (totalValue(x.valor_unitario, x.quantidade) || 0), 0);
    const semResp = mats.filter(x => !x.responsavel?.trim());
    const semValor = mats.filter(x => x.valor_unitario == null);
    const incompleto = mats.filter(x => !x.responsavel?.trim() || x.valor_unitario == null || !x.situacao);
    const confOpen = data.conferences.filter(x => x.status === 'em_andamento' || x.status === 'reaberta');
    const openIds = new Set(confOpen.map(x => x.id));
    const items = data.confItems;
    const pend = items.filter(i => openIds.has(i.conference_id) && i.status === 'pendente').length;
    const falt = items.filter(i => i.status === 'faltando').length;
    const div = items.filter(i => ['divergente', 'fora_da_secao'].includes(i.status)).length;
    const nbs = data.notebooks;
    return {
      open, inProgress, closedMonth, overdue, critical, valor, semResp, semValor, incompleto,
      confOpen, confDone: data.conferences.filter(x => x.status === 'concluida').length,
      confCanc: data.conferences.filter(x => x.status === 'cancelada').length,
      pend, falt, div,
      nbUso: nbs.filter(x => x.status === 'Em uso').length,
      nbManut: nbs.filter(x => /manuten/i.test(x.status || '')).length,
      nbSemSecao: nbs.filter(x => !x.secao?.trim()).length,
    };
  }, [data, statusMap, slaFor]);

  const nbLabel = (id: string) => data?.notebooks.find(n => n.id === id)?.patrimonio || '—';

  if (isChefeSecao && missingSection) {
    return (
      <PageTransition>
        <div className="p-4 md:p-6">
          <PageHeader icon={Building2} title="Central da Seção" />
          <Card><CardContent>
            <EmptyState icon={ShieldAlert} title="Sua conta ainda não está vinculada a uma seção." description="Solicite ao administrador o vínculo da sua conta a uma seção para visualizar os dados." />
          </CardContent></Card>
        </div>
      </PageTransition>
    );
  }

  const kpis = stats ? [
    { label: 'Chamados abertos', value: stats.open.length, icon: Ticket },
    { label: 'Em andamento', value: stats.inProgress.length, icon: Clock },
    { label: 'Concluídos no mês', value: stats.closedMonth.length, icon: CheckCircle2 },
    { label: 'SLA estourado', value: stats.overdue.length, icon: AlertTriangle, warn: stats.overdue.length > 0 },
    { label: 'Materiais', value: data!.materials.length, icon: Package },
    { label: 'Valor patrimonial', value: formatCurrencyStrict(stats.valor), icon: Wallet },
    { label: 'Conferências abertas', value: stats.confOpen.length, icon: ClipboardList },
    { label: 'Divergências de carga', value: stats.falt + stats.div, icon: AlertOctagon, warn: stats.falt + stats.div > 0 },
  ] : [];

  const Mini = ({ label, value, warn }: { label: string; value: number | string; warn?: boolean }) => (
    <div className="rounded-lg border border-border/60 px-3 py-2">
      <p className="text-[11px] text-muted-foreground">{label}</p>
      <p className={`text-lg font-bold ${warn ? 'text-destructive' : ''}`}>{value}</p>
    </div>
  );

  return (
    <PageTransition>
      <div className="p-4 md:p-6 space-y-6">
        <PageHeader
          icon={Building2}
          title="Central da Seção"
          description={`${section || 'Todas as seções'} • ${role ? ROLE_LABELS[role] : ''}${updatedAt ? ` • Atualizado ${updatedAt.toLocaleString('pt-BR')}` : ''}`}
          actions={<>
            {!isChefeSecao && (
              <Select value={selected} onValueChange={setSelected}>
                <SelectTrigger className="w-[220px] h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL}>Todas as seções</SelectItem>
                  {sections.map(s => <SelectItem key={s.id} value={s.name}>{s.name}</SelectItem>)}
                </SelectContent>
              </Select>
            )}
            {isChefeSecao && <Badge variant="outline" className="h-9 px-3">{sectionName}</Badge>}
            <Button variant="outline" size="sm" className="h-9" onClick={load} disabled={loading}>
              <RefreshCw className={`h-4 w-4 mr-1.5 ${loading ? 'animate-spin' : ''}`} />Atualizar
            </Button>
          </>}
        />

        {error && (
          <Card className="border-destructive/40"><CardContent className="py-4 text-sm text-destructive flex items-center gap-2">
            <AlertTriangle className="h-4 w-4" />{error}
          </CardContent></Card>
        )}

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {loading || !stats ? Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-[76px] rounded-xl" />) :
            kpis.map(k => (
              <Card key={k.label}><CardContent className="p-3.5 flex items-center gap-3">
                <div className={`p-2 rounded-lg ${k.warn ? 'bg-destructive/10 text-destructive' : 'bg-primary/10 text-primary'}`}><k.icon className="h-4 w-4" /></div>
                <div className="min-w-0">
                  <p className="text-[11px] text-muted-foreground truncate">{k.label}</p>
                  <p className="text-lg font-bold truncate">{k.value}</p>
                </div>
              </CardContent></Card>
            ))}
        </div>

        {!loading && stats && data && (
          <>
            {/* Chamados */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-3">
                <CardTitle className="text-sm flex items-center gap-2"><Ticket className="h-4 w-4" />Chamados e Pendências</CardTitle>
                <Button variant="ghost" size="sm" onClick={() => navigate('/chamados')}>Ver chamados</Button>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  <Mini label="Críticos (Alta/Urgente)" value={stats.critical.length} warn={stats.critical.length > 0} />
                  <Mini label="Atrasados (SLA)" value={stats.overdue.length} warn={stats.overdue.length > 0} />
                  <Mini label="Em andamento" value={stats.inProgress.length} />
                </div>
                {stats.open.length === 0 ? <EmptyState compact icon={Ticket} title="Nenhum chamado aberto nesta seção." /> : (
                  <div className="divide-y divide-border/60">
                    {stats.open.slice(0, 8).map(tk => {
                      const late = stats.overdue.includes(tk);
                      return (
                        <button key={tk.id} onClick={() => navigate(`/chamados/${tk.id}`)} className="w-full text-left py-2.5 flex flex-wrap items-center gap-2 hover:bg-muted/40 px-2 rounded-md">
                          <span className="font-mono text-xs text-muted-foreground">{tk.ticket_number}</span>
                          <span className="text-sm font-medium flex-1 min-w-[160px] truncate">{tk.subject}</span>
                          {late && <Badge variant="destructive" className="text-[10px]">Atrasado</Badge>}
                          <PriorityBadge priority={tk.priority} size="xs" />
                          <StatusBadge status={statusMap[tk.status_id]} size="xs" />
                          <span className="text-xs text-muted-foreground w-28 truncate">{tk.assigned_user_name || 'Sem responsável'}</span>
                          <span className="text-xs text-muted-foreground">{fmtDate(tk.created_at)}</span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>

            <div className="grid lg:grid-cols-2 gap-6">
              {/* Materiais */}
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-3">
                  <CardTitle className="text-sm flex items-center gap-2"><Package className="h-4 w-4" />Material e Patrimônio</CardTitle>
                  <Button variant="ghost" size="sm" onClick={() => navigate('/materiais')}>Abrir</Button>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-2 gap-2">
                    <Mini label="Total de materiais" value={data.materials.length} />
                    <Mini label="Valor total" value={formatCurrencyStrict(stats.valor)} />
                    <Mini label="Sem responsável" value={stats.semResp.length} warn={stats.semResp.length > 0} />
                    <Mini label="Sem valor informado" value={stats.semValor.length} warn={stats.semValor.length > 0} />
                    <Mini label="Cadastro incompleto" value={stats.incompleto.length} warn={stats.incompleto.length > 0} />
                  </div>
                  {data.materials.length === 0 ? <EmptyState compact icon={Wallet} title="Nenhum dado financeiro disponível." /> : (
                    <div>
                      <p className="text-[11px] font-semibold text-muted-foreground uppercase mb-1">Últimos atualizados</p>
                      {data.materials.slice(0, 5).map(x => (
                        <div key={x.id} className="flex items-center gap-2 py-1.5 text-sm border-b border-border/40 last:border-0">
                          <span className="font-mono text-xs text-muted-foreground w-20 truncate">{x.patrimonio}</span>
                          <span className="flex-1 truncate">{x.nome}</span>
                          <span className="text-xs text-muted-foreground">{fmtDate(x.updated_at)}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Conferências */}
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-3">
                  <CardTitle className="text-sm flex items-center gap-2"><ClipboardList className="h-4 w-4" />Conferência de Carga</CardTitle>
                  <Button variant="ghost" size="sm" onClick={() => navigate('/materiais/conferencias')}>Abrir</Button>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-3 gap-2">
                    <Mini label="Abertas" value={stats.confOpen.length} />
                    <Mini label="Concluídas" value={stats.confDone} />
                    <Mini label="Canceladas" value={stats.confCanc} />
                    <Mini label="Itens pendentes" value={stats.pend} />
                    <Mini label="Itens faltando" value={stats.falt} warn={stats.falt > 0} />
                    <Mini label="Divergentes" value={stats.div} warn={stats.div > 0} />
                  </div>
                  {stats.falt + stats.div === 0 && <p className="text-xs text-muted-foreground">Nenhum material com divergência.</p>}
                  {stats.confOpen.length === 0 && <EmptyState compact icon={ClipboardList} title="Nenhuma conferência pendente." />}
                  {data.conferences[0] && (
                    <button onClick={() => navigate(`/materiais/conferencias/${data.conferences[0].id}`)} className="w-full text-left rounded-lg border border-border/60 p-3 hover:bg-muted/40">
                      <p className="text-[11px] text-muted-foreground">Última conferência</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-sm font-medium flex-1 truncate">{data.conferences[0].title || data.conferences[0].section_name}</span>
                        <Badge variant="outline" className={conferenceBadgeClass(data.conferences[0].status)}>{CONFERENCE_STATUS_LABELS[data.conferences[0].status] || data.conferences[0].status}</Badge>
                        <span className="text-xs text-muted-foreground">{fmtDate(data.conferences[0].started_at)}</span>
                      </div>
                    </button>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Notebooks */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-3">
                <CardTitle className="text-sm flex items-center gap-2"><Laptop className="h-4 w-4" />Notebooks e Movimentações</CardTitle>
                <Button variant="ghost" size="sm" onClick={() => navigate('/notebooks')}>Abrir</Button>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <Mini label="Notebooks" value={data.notebooks.length} />
                  <Mini label="Em uso" value={stats.nbUso} />
                  <Mini label="Em manutenção" value={stats.nbManut} warn={stats.nbManut > 0} />
                  <Mini label="Sem seção" value={stats.nbSemSecao} />
                </div>
                {data.movements.length === 0 ? <EmptyState compact icon={ArrowRightLeft} title="Nenhuma movimentação recente." /> : (
                  <div className="divide-y divide-border/60">
                    {data.movements.map(mv => (
                      <div key={mv.id} className="flex flex-wrap items-center gap-2 py-2 text-sm">
                        <span className="font-mono text-xs text-muted-foreground w-24 truncate">{nbLabel(mv.item_id)}</span>
                        <Badge variant="secondary" className="text-[10px]">{mv.tipo_evento}</Badge>
                        <span className="flex-1 text-xs text-muted-foreground truncate">{mv.secao_origem || '—'} → {mv.secao_destino || '—'}</span>
                        <span className="text-xs text-muted-foreground">{fmtDate(mv.data_hora)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </PageTransition>
  );
}
