import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollText, Search, ShieldAlert, Activity, Users, Ticket as TicketIcon, KeyRound, Paperclip, RotateCcw } from 'lucide-react';
import PageTransition from '@/components/PageTransition';
import PageHeader from '@/components/PageHeader';
import AccessDenied from '@/components/AccessDenied';
import { useUserRole } from '@/hooks/useUserRole';

type AuditRow = {
  id: string;
  user_id: string | null;
  user_name: string | null;
  action: string;
  entity_type: string;
  entity_id: string | null;
  entity_label: string | null;
  event_type: string | null;
  severity: string | null;
  section_name: string | null;
  old_value: string | null;
  new_value: string | null;
  details: Record<string, unknown> | null;
  created_at: string;
};

const EVENT_TYPES = ['chamado', 'mensagem', 'anexo', 'inventario', 'equipamento', 'material', 'usuario', 'seguranca', 'sistema'];
const EVENT_LABEL: Record<string, string> = {
  chamado: 'Chamado', mensagem: 'Mensagem', anexo: 'Anexo', inventario: 'Inventário',
  equipamento: 'Equipamento', material: 'Material', usuario: 'Usuário/Permissão',
  seguranca: 'Segurança', sistema: 'Sistema',
};
const SEVERITY_LABEL: Record<string, string> = { baixo: 'Baixo', medio: 'Médio', alto: 'Alto' };
const SEVERITY_CLASS: Record<string, string> = {
  baixo: 'border-slate-500/40 text-slate-500',
  medio: 'border-amber-500/40 text-amber-500',
  alto: 'border-destructive/40 text-destructive',
};

const PERIODS = [
  { value: '7', label: 'Últimos 7 dias' },
  { value: '30', label: 'Últimos 30 dias' },
  { value: '90', label: 'Últimos 90 dias' },
  { value: 'all', label: 'Todo o período' },
];

export default function AuditLog() {
  const { isAdmin, loading: roleLoading } = useUserRole();
  const [rows, setRows] = useState<AuditRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [eventType, setEventType] = useState('all');
  const [severity, setSeverity] = useState('all');
  const [userFilter, setUserFilter] = useState('all');
  const [sectionFilter, setSectionFilter] = useState('all');
  const [period, setPeriod] = useState('30');
  const [detail, setDetail] = useState<AuditRow | null>(null);

  useEffect(() => {
    if (roleLoading || !isAdmin) return;
    setLoading(true);
    (supabase as any)
      .from('audit_log')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(1000)
      .then(({ data }: { data: AuditRow[] | null }) => {
        setRows(data || []);
        setLoading(false);
      });
  }, [isAdmin, roleLoading]);

  const users = useMemo(() => Array.from(new Set(rows.map(r => r.user_name).filter(Boolean))) as string[], [rows]);
  const sections = useMemo(() => Array.from(new Set(rows.map(r => r.section_name).filter(Boolean))) as string[], [rows]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const since = period === 'all' ? 0 : Date.now() - Number(period) * 86400000;
    return rows.filter(r => {
      if (new Date(r.created_at).getTime() < since) return false;
      if (eventType !== 'all' && (r.event_type || 'sistema') !== eventType) return false;
      if (severity !== 'all' && (r.severity || 'baixo') !== severity) return false;
      if (userFilter !== 'all' && r.user_name !== userFilter) return false;
      if (sectionFilter !== 'all' && r.section_name !== sectionFilter) return false;
      if (!q) return true;
      return [r.action, r.entity_type, r.entity_label, r.user_name, r.old_value, r.new_value]
        .some(v => (v || '').toLowerCase().includes(q));
    });
  }, [rows, search, eventType, severity, userFilter, sectionFilter, period]);

  const stats = useMemo(() => {
    const byUser: Record<string, number> = {};
    filtered.forEach(r => { const k = r.user_name || 'Sistema'; byUser[k] = (byUser[k] || 0) + 1; });
    const topUser = Object.entries(byUser).sort((a, b) => b[1] - a[1])[0];
    return {
      total: filtered.length,
      critical: filtered.filter(r => r.severity === 'alto').length,
      tickets: filtered.filter(r => r.event_type === 'chamado' || r.event_type === 'mensagem').length,
      permissions: filtered.filter(r => r.event_type === 'usuario').length,
      attachments: filtered.filter(r => r.event_type === 'anexo').length,
      topUser: topUser ? `${topUser[0]} (${topUser[1]})` : '—',
      lastCritical: filtered.find(r => r.severity === 'alto') || null,
    };
  }, [filtered]);

  const resetFilters = () => {
    setSearch(''); setEventType('all'); setSeverity('all');
    setUserFilter('all'); setSectionFilter('all'); setPeriod('30');
  };

  if (!roleLoading && !isAdmin) {
    return <PageTransition><AccessDenied message="A auditoria central é restrita a administradores." /></PageTransition>;
  }

  return (
    <PageTransition>
      <div className="container mx-auto py-6 px-4 max-w-[1300px]">
        <PageHeader
          icon={ScrollText}
          title="Auditoria Central"
          description="Histórico oficial das ações registradas pelo sistema"
        />

        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3 mb-5">
          <StatCard icon={Activity} label="Eventos no período" value={String(stats.total)} />
          <StatCard icon={ShieldAlert} label="Eventos críticos" value={String(stats.critical)} tone="destructive" />
          <StatCard icon={TicketIcon} label="Chamados/mensagens" value={String(stats.tickets)} />
          <StatCard icon={KeyRound} label="Permissões/usuários" value={String(stats.permissions)} />
          <StatCard icon={Paperclip} label="Anexos" value={String(stats.attachments)} />
          <StatCard icon={Users} label="Usuário mais ativo" value={stats.topUser} small />
        </div>

        {stats.lastCritical && (
          <Card className="border-destructive/30 bg-destructive/5 mb-5">
            <CardContent className="py-3 flex flex-wrap items-center gap-2 text-sm">
              <ShieldAlert className="h-4 w-4 text-destructive" />
              <span className="font-medium">Última ação sensível:</span>
              <span>{stats.lastCritical.action}</span>
              {stats.lastCritical.entity_label && <span className="text-muted-foreground">· {stats.lastCritical.entity_label}</span>}
              <span className="text-xs text-muted-foreground ml-auto">
                {stats.lastCritical.user_name || 'Sistema'} · {new Date(stats.lastCritical.created_at).toLocaleString('pt-BR')}
              </span>
            </CardContent>
          </Card>
        )}

        <Card className="border-border/60 mb-4">
          <CardContent className="py-4 grid gap-3 md:grid-cols-3 xl:grid-cols-6">
            <div className="relative md:col-span-3 xl:col-span-2">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                className="pl-9 h-9 bg-muted/30 border-border/60"
                placeholder="Buscar por ação, entidade ou usuário"
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
            <Select value={eventType} onValueChange={setEventType}>
              <SelectTrigger className="h-9"><SelectValue placeholder="Tipo de evento" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os tipos</SelectItem>
                {EVENT_TYPES.map(t => <SelectItem key={t} value={t}>{EVENT_LABEL[t]}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={severity} onValueChange={setSeverity}>
              <SelectTrigger className="h-9"><SelectValue placeholder="Criticidade" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toda criticidade</SelectItem>
                <SelectItem value="baixo">Baixo</SelectItem>
                <SelectItem value="medio">Médio</SelectItem>
                <SelectItem value="alto">Alto</SelectItem>
              </SelectContent>
            </Select>
            <Select value={userFilter} onValueChange={setUserFilter}>
              <SelectTrigger className="h-9"><SelectValue placeholder="Usuário" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os usuários</SelectItem>
                {users.map(u => <SelectItem key={u} value={u}>{u}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={sectionFilter} onValueChange={setSectionFilter}>
              <SelectTrigger className="h-9"><SelectValue placeholder="Seção" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as seções</SelectItem>
                {sections.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
            <div className="flex gap-2">
              <Select value={period} onValueChange={setPeriod}>
                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                <SelectContent>{PERIODS.map(p => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}</SelectContent>
              </Select>
              <Button variant="outline" size="icon" className="h-9 w-9 shrink-0" onClick={resetFilters} title="Limpar filtros">
                <RotateCcw className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>

        {loading ? (
          <div className="space-y-2">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-14 w-full" />)}</div>
        ) : filtered.length === 0 ? (
          <Card className="border-border/60"><CardContent className="py-12 text-center text-sm text-muted-foreground">Nenhum registro de auditoria para os filtros selecionados.</CardContent></Card>
        ) : (
          <div className="space-y-2">
            {filtered.map(r => (
              <Card
                key={r.id}
                className="border-border/60 shadow-card cursor-pointer hover:border-primary/40 transition-colors"
                onClick={() => setDetail(r)}
              >
                <CardContent className="py-3 flex flex-wrap items-center gap-2">
                  <Badge variant="outline" className={`text-[10px] ${SEVERITY_CLASS[r.severity || 'baixo']}`}>
                    {SEVERITY_LABEL[r.severity || 'baixo']}
                  </Badge>
                  <Badge variant="secondary" className="text-[10px]">{EVENT_LABEL[r.event_type || 'sistema']}</Badge>
                  <span className="text-sm font-medium">{r.action}</span>
                  {r.entity_label && <span className="text-sm text-muted-foreground">· {r.entity_label}</span>}
                  {(r.old_value || r.new_value) && (
                    <span className="text-xs text-muted-foreground font-mono">
                      {r.old_value || '—'} → {r.new_value || '—'}
                    </span>
                  )}
                  <span className="text-xs text-muted-foreground ml-auto text-right">
                    {r.user_name || 'Sistema'}
                    {r.section_name ? ` · ${r.section_name}` : ''} · {new Date(r.created_at).toLocaleString('pt-BR')}
                  </span>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        <Dialog open={!!detail} onOpenChange={(o) => !o && setDetail(null)}>
          <DialogContent className="max-w-lg">
            <DialogHeader><DialogTitle>Detalhes do evento</DialogTitle></DialogHeader>
            {detail && (
              <div className="space-y-2 text-sm">
                <Field label="Ação" value={detail.action} />
                <Field label="Tipo de evento" value={EVENT_LABEL[detail.event_type || 'sistema']} />
                <Field label="Criticidade" value={SEVERITY_LABEL[detail.severity || 'baixo']} />
                <Field label="Entidade" value={`${detail.entity_type}${detail.entity_label ? ` · ${detail.entity_label}` : ''}`} />
                <Field label="ID da entidade" value={detail.entity_id || '—'} mono />
                <Field label="Usuário" value={detail.user_name || 'Sistema'} />
                <Field label="Seção" value={detail.section_name || '—'} />
                <Field label="Valor anterior" value={detail.old_value || '—'} />
                <Field label="Valor novo" value={detail.new_value || '—'} />
                <Field label="Data/hora" value={new Date(detail.created_at).toLocaleString('pt-BR')} />
                {detail.details && Object.keys(detail.details).length > 0 && (
                  <div>
                    <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1">Metadados</p>
                    <pre className="rounded-lg bg-muted/40 p-3 text-[11px] overflow-auto font-mono">
                      {JSON.stringify(detail.details, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </PageTransition>
  );
}

function Field({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex gap-3 border-b border-border/40 pb-1.5">
      <span className="text-[10px] uppercase tracking-widest text-muted-foreground w-36 shrink-0 pt-1">{label}</span>
      <span className={`text-sm break-all ${mono ? 'font-mono text-xs' : ''}`}>{value}</span>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, tone, small }: {
  icon: React.ElementType; label: string; value: string; tone?: 'destructive'; small?: boolean;
}) {
  return (
    <Card className="border-border/60 shadow-card">
      <CardContent className="py-3">
        <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold flex items-center gap-1.5">
          <Icon className="h-3 w-3" /> {label}
        </p>
        <p className={`font-bold tabular-nums ${small ? 'text-sm truncate' : 'text-2xl'} ${tone === 'destructive' ? 'text-destructive' : ''}`}>
          {value}
        </p>
      </CardContent>
    </Card>
  );
}
