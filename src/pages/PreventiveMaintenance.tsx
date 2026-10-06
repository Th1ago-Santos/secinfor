import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useUserRole } from '@/hooks/useUserRole';
import { useSections } from '@/hooks/useSections';
import { logAudit } from '@/lib/audit';
import { toast } from 'sonner';
import PageHeader from '@/components/PageHeader';
import EmptyState from '@/components/EmptyState';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { statusColorAlpha } from '@/lib/statusColor';
import { Wrench, Plus, Play, CheckCircle2, XCircle, RotateCcw, Pencil, AlertTriangle, CalendarClock, Clock, ListChecks, CalendarX } from 'lucide-react';

type PM = {
  id: string; equipment_type: string; notebook_id: string | null; material_id: string | null;
  equipment_label: string | null; section_id: string | null; section_name: string | null;
  title: string; description: string | null; maintenance_type: string; status: string; priority: string;
  scheduled_date: string; started_at: string | null; completed_at: string | null; cancelled_at: string | null;
  assigned_to: string | null; assigned_name: string | null; completed_by: string | null;
  notes: string | null; result: string | null; next_due_date: string | null; created_at: string;
};

export const PM_STATUS: Record<string, { label: string; color: string }> = {
  planejada: { label: 'Planejada', color: '#3b82f6' },
  em_andamento: { label: 'Em andamento', color: '#d97706' },
  concluida: { label: 'Concluída', color: '#16a34a' },
  atrasada: { label: 'Atrasada', color: '#dc2626' },
  cancelada: { label: 'Cancelada', color: '#64748b' },
};
export const PM_TYPES: Record<string, string> = {
  limpeza: 'Limpeza', verificacao_fisica: 'Verificação física', atualizacao_sistema: 'Atualização de sistema',
  antivirus: 'Antivírus', backup: 'Backup', diagnostico: 'Diagnóstico', outro: 'Outro',
};
const PM_PRIORITY: Record<string, { label: string; color: string }> = {
  baixa: { label: 'Baixa', color: '#64748b' }, normal: { label: 'Normal', color: '#0ea5e9' },
  alta: { label: 'Alta', color: '#f97316' }, urgente: { label: 'Urgente', color: '#ef4444' },
};

const today = () => new Date().toISOString().slice(0, 10);
const fmtDate = (d: string | null) => (d ? d.slice(0, 10).split('-').reverse().join('/') : '—');

/** Status exibido: planejada/em andamento com data vencida aparece como atrasada. */
function effectiveStatus(m: PM): string {
  if ((m.status === 'planejada' || m.status === 'em_andamento') && m.scheduled_date < today()) return 'atrasada';
  return m.status;
}

function Pill({ label, color }: { label: string; color: string }) {
  return (
    <span className="inline-flex h-6 items-center gap-1.5 rounded-full border px-2.5 text-[11px] font-semibold whitespace-nowrap"
      style={{ color, borderColor: statusColorAlpha(color, 0.45), backgroundColor: statusColorAlpha(color, 0.12) }}>
      <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: color }} />{label}
    </span>
  );
}

type FormState = {
  notebook_id: string; equipment_label: string; section_id: string; title: string; maintenance_type: string;
  description: string; priority: string; scheduled_date: string; assigned_to: string; notes: string; next_due_date: string;
};
const emptyForm: FormState = {
  notebook_id: '', equipment_label: '', section_id: '', title: '', maintenance_type: '', description: '',
  priority: 'normal', scheduled_date: '', assigned_to: '', notes: '', next_due_date: '',
};

export default function PreventiveMaintenance() {
  const { user } = useAuth();
  const { canEdit, isChefeSecao, sectionId, sectionName, missingSection } = useUserRole();
  const { sections } = useSections();
  const [items, setItems] = useState<PM[]>([]);
  const [notebooks, setNotebooks] = useState<{ id: string; patrimonio: string; modelo: string; secao: string }[]>([]);
  const [people, setPeople] = useState<{ user_id: string; display_name: string | null }[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [q, setQ] = useState('');
  const [fSection, setFSection] = useState('all');
  const [fStatus, setFStatus] = useState('all');
  const [fType, setFType] = useState('all');
  const [fPriority, setFPriority] = useState('all');
  const [fResp, setFResp] = useState('all');
  const [fFrom, setFFrom] = useState('');
  const [fTo, setFTo] = useState('');

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<PM | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [completing, setCompleting] = useState<PM | null>(null);
  const [completeResult, setCompleteResult] = useState('');
  const [completeNext, setCompleteNext] = useState('');
  const [cancelling, setCancelling] = useState<PM | null>(null);

  const load = async () => {
    setLoading(true); setError(null);
    const { data, error } = await supabase.from('preventive_maintenances').select('*').order('scheduled_date', { ascending: true });
    if (error) setError(error.message); else setItems((data as PM[]) || []);
    setLoading(false);
  };

  useEffect(() => {
    load();
    supabase.from('notebooks').select('id, patrimonio, modelo, secao').order('patrimonio').then(({ data }) => setNotebooks(data || []));
    if (canEdit) supabase.from('profiles').select('user_id, display_name').order('display_name').then(({ data }) => setPeople(data || []));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canEdit]);

  const sectionLabel = (m: PM) => m.section_name || sections.find(s => s.id === m.section_id)?.name || 'Não informado';

  const filtered = useMemo(() => items.filter(m => {
    const st = effectiveStatus(m);
    if (fSection !== 'all' && m.section_id !== fSection) return false;
    if (fStatus !== 'all' && st !== fStatus) return false;
    if (fType !== 'all' && m.maintenance_type !== fType) return false;
    if (fPriority !== 'all' && m.priority !== fPriority) return false;
    if (fResp !== 'all' && (m.assigned_name || '') !== fResp) return false;
    if (fFrom && m.scheduled_date < fFrom) return false;
    if (fTo && m.scheduled_date > fTo) return false;
    if (q) {
      const s = q.toLowerCase();
      if (![m.title, m.equipment_label, m.section_name, m.assigned_name, m.description].some(v => v?.toLowerCase().includes(s))) return false;
    }
    return true;
  }), [items, q, fSection, fStatus, fType, fPriority, fResp, fFrom, fTo]);

  const stats = useMemo(() => {
    const t = today();
    const in7 = new Date(Date.now() + 7 * 864e5).toISOString().slice(0, 10);
    const month = t.slice(0, 7);
    const eff = items.map(m => ({ m, st: effectiveStatus(m) }));
    const withNext = new Set(items.filter(m => m.notebook_id && (m.status !== 'cancelada') && ((m.next_due_date && m.next_due_date >= t) || ['planejada', 'em_andamento'].includes(m.status))).map(m => m.notebook_id));
    return {
      planejadas: eff.filter(e => e.st === 'planejada').length,
      andamento: eff.filter(e => e.st === 'em_andamento').length,
      atrasadas: eff.filter(e => e.st === 'atrasada').length,
      concluidasMes: items.filter(m => m.status === 'concluida' && m.completed_at?.slice(0, 7) === month).length,
      proximas: items.filter(m => ['planejada', 'em_andamento'].includes(m.status) && m.scheduled_date >= t && m.scheduled_date <= in7).length,
      semProxima: notebooks.filter(n => !withNext.has(n.id)).length,
    };
  }, [items, notebooks]);

  const responsaveis = useMemo(() => Array.from(new Set(items.map(m => m.assigned_name).filter(Boolean))) as string[], [items]);

  const audit = (m: Pick<PM, 'id' | 'title' | 'equipment_label' | 'section_name'>, action: string, severity: 'baixo' | 'medio' | 'alto' = 'baixo', oldValue?: string | null, newValue?: string | null, details: Record<string, unknown> = {}) =>
    logAudit({
      action, entityType: 'manutencao_preventiva', entityId: m.id, entityLabel: m.title, eventType: 'equipamento', severity,
      oldValue, newValue, details: { equipamento: m.equipment_label, secao: m.section_name, ...details },
    });

  const openNew = () => { setEditing(null); setForm(emptyForm); setFormOpen(true); };
  const openEdit = (m: PM) => {
    setEditing(m);
    setForm({
      notebook_id: m.notebook_id || '', equipment_label: m.equipment_label || '', section_id: m.section_id || '', title: m.title,
      maintenance_type: m.maintenance_type, description: m.description || '', priority: m.priority, scheduled_date: m.scheduled_date,
      assigned_to: m.assigned_to || '', notes: m.notes || '', next_due_date: m.next_due_date || '',
    });
    setFormOpen(true);
  };

  const pickNotebook = (id: string) => {
    const nb = notebooks.find(n => n.id === id);
    const sec = nb ? sections.find(s => s.name.toLowerCase() === nb.secao?.toLowerCase()) : undefined;
    setForm(f => ({ ...f, notebook_id: id, equipment_label: nb ? `${nb.patrimonio} — ${nb.modelo}` : f.equipment_label, section_id: sec?.id || f.section_id }));
  };

  const save = async () => {
    if (!form.title.trim() || !form.maintenance_type || !form.scheduled_date) {
      toast.error('Preencha título, tipo de manutenção e data agendada.'); return;
    }
    if (form.next_due_date && form.next_due_date < form.scheduled_date) {
      toast.error('A próxima manutenção deve ser depois da data agendada.'); return;
    }
    setSaving(true);
    const sec = sections.find(s => s.id === form.section_id);
    const person = people.find(p => p.user_id === form.assigned_to);
    const payload = {
      equipment_type: form.notebook_id ? 'notebook' : 'outro',
      notebook_id: form.notebook_id || null,
      equipment_label: form.equipment_label.trim() || null,
      section_id: form.section_id || null, section_name: sec?.name || null,
      title: form.title.trim(), maintenance_type: form.maintenance_type, description: form.description.trim() || null,
      priority: form.priority, scheduled_date: form.scheduled_date,
      assigned_to: form.assigned_to || null, assigned_name: person?.display_name || null,
      notes: form.notes.trim() || null, next_due_date: form.next_due_date || null,
    };
    if (editing) {
      const { error } = await supabase.from('preventive_maintenances').update(payload).eq('id', editing.id);
      setSaving(false);
      if (error) { toast.error('Erro ao salvar: ' + error.message); return; }
      const target = { ...editing, ...payload };
      await audit(target, 'Edição de manutenção preventiva');
      if ((editing.assigned_to || null) !== payload.assigned_to)
        await audit(target, 'Alteração de responsável da manutenção', 'medio', editing.assigned_name, payload.assigned_name);
      if (editing.scheduled_date !== payload.scheduled_date)
        await audit(target, 'Alteração de data agendada da manutenção', 'medio', editing.scheduled_date, payload.scheduled_date);
      toast.success('Manutenção atualizada.');
    } else {
      const { data, error } = await supabase.from('preventive_maintenances').insert({ ...payload, created_by: user?.id }).select('id').single();
      setSaving(false);
      if (error || !data) { toast.error('Erro ao criar: ' + (error?.message || '')); return; }
      await audit({ id: data.id, title: payload.title, equipment_label: payload.equipment_label, section_name: payload.section_name }, 'Criação de manutenção preventiva');
      toast.success('Manutenção criada.');
    }
    setFormOpen(false); load();
  };

  const setStatus = async (m: PM, status: string, extra: Record<string, unknown>, action: string, severity: 'baixo' | 'medio' | 'alto') => {
    const { error } = await supabase.from('preventive_maintenances').update({ status, ...extra }).eq('id', m.id);
    if (error) { toast.error('Erro: ' + error.message); return false; }
    await audit(m, action, severity, PM_STATUS[m.status]?.label, PM_STATUS[status]?.label, extra);
    toast.success(`Manutenção ${PM_STATUS[status].label.toLowerCase()}.`);
    load(); return true;
  };

  const start = (m: PM) => setStatus(m, 'em_andamento', { started_at: new Date().toISOString() }, 'Início de manutenção preventiva', 'baixo');
  const reopen = (m: PM) => setStatus(m, 'planejada', { completed_at: null, completed_by: null, cancelled_at: null }, 'Reabertura de manutenção preventiva', 'medio');
  const confirmComplete = async () => {
    if (!completing) return;
    if (completeNext && completeNext < today()) { toast.error('A próxima manutenção deve ser uma data futura.'); return; }
    const ok = await setStatus(completing, 'concluida', {
      completed_at: new Date().toISOString(), completed_by: user?.id, result: completeResult.trim() || null,
      next_due_date: completeNext || completing.next_due_date,
    }, 'Conclusão de manutenção preventiva', 'medio');
    if (ok) setCompleting(null);
  };
  const confirmCancel = async () => {
    if (!cancelling) return;
    const ok = await setStatus(cancelling, 'cancelada', { cancelled_at: new Date().toISOString() }, 'Cancelamento de manutenção preventiva', 'alto');
    if (ok) setCancelling(null);
  };

  const cards = [
    { label: 'Planejadas', value: stats.planejadas, icon: ListChecks, color: PM_STATUS.planejada.color },
    { label: 'Em andamento', value: stats.andamento, icon: Clock, color: PM_STATUS.em_andamento.color },
    { label: 'Atrasadas', value: stats.atrasadas, icon: AlertTriangle, color: PM_STATUS.atrasada.color },
    { label: 'Concluídas no mês', value: stats.concluidasMes, icon: CheckCircle2, color: PM_STATUS.concluida.color },
    { label: 'Próximas 7 dias', value: stats.proximas, icon: CalendarClock, color: '#0ea5e9' },
    { label: 'Notebooks sem próxima', value: stats.semProxima, icon: CalendarX, color: '#64748b' },
  ];

  if (missingSection) {
    return <div className="p-4 md:p-6"><EmptyState icon={Wrench} title="Sua conta ainda não está vinculada a uma seção." description="Peça ao administrador para vincular sua conta." /></div>;
  }

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto">
      <PageHeader icon={Wrench} title="Manutenção Preventiva"
        description={isChefeSecao ? `Manutenções da seção ${sectionName}` : 'Planejamento e acompanhamento das manutenções dos equipamentos'}
        actions={canEdit && <Button onClick={openNew}><Plus className="h-4 w-4 mr-1" />Nova Manutenção</Button>} />

      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3 mb-5">
        {cards.map(c => (
          <Card key={c.label}><CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-medium text-muted-foreground">{c.label}</span>
              <c.icon className="h-4 w-4" style={{ color: c.color }} />
            </div>
            {loading ? <Skeleton className="h-7 w-10 mt-2" /> : <p className="text-2xl font-bold mt-1">{c.value}</p>}
          </CardContent></Card>
        ))}
      </div>

      <Card className="mb-4"><CardContent className="p-3 grid grid-cols-2 md:grid-cols-4 xl:grid-cols-8 gap-2">
        <Input className="col-span-2" placeholder="Buscar título, equipamento..." value={q} onChange={e => setQ(e.target.value)} />
        {isChefeSecao ? (
          <Input value={sectionName || ''} disabled />
        ) : (
          <Select value={fSection} onValueChange={setFSection}>
            <SelectTrigger><SelectValue placeholder="Seção" /></SelectTrigger>
            <SelectContent><SelectItem value="all">Todas as seções</SelectItem>{sections.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
          </Select>
        )}
        <Select value={fStatus} onValueChange={setFStatus}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent><SelectItem value="all">Todos os status</SelectItem>{Object.entries(PM_STATUS).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}</SelectContent>
        </Select>
        <Select value={fType} onValueChange={setFType}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent><SelectItem value="all">Todos os tipos</SelectItem>{Object.entries(PM_TYPES).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent>
        </Select>
        <Select value={fPriority} onValueChange={setFPriority}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent><SelectItem value="all">Todas prioridades</SelectItem>{Object.entries(PM_PRIORITY).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}</SelectContent>
        </Select>
        <Select value={fResp} onValueChange={setFResp}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent><SelectItem value="all">Todos responsáveis</SelectItem>{responsaveis.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent>
        </Select>
        <div className="col-span-2 md:col-span-4 xl:col-span-8 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          Período agendado: <Input type="date" className="w-40 h-8" value={fFrom} onChange={e => setFFrom(e.target.value)} />
          até <Input type="date" className="w-40 h-8" value={fTo} onChange={e => setFTo(e.target.value)} />
        </div>
      </CardContent></Card>

      <Card><CardContent className="p-0 overflow-x-auto">
        {loading ? (
          <div className="p-4 space-y-2">{[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-10 w-full" />)}</div>
        ) : error ? (
          <EmptyState icon={AlertTriangle} title="Erro ao carregar manutenções" description={error} action={<Button variant="outline" onClick={load}>Tentar novamente</Button>} />
        ) : filtered.length === 0 ? (
          <EmptyState icon={Wrench} title="Nenhuma manutenção encontrada" description={items.length ? 'Ajuste os filtros.' : 'Nenhuma manutenção preventiva cadastrada ainda.'} />
        ) : (
          <Table>
            <TableHeader><TableRow>
              <TableHead>Equipamento</TableHead><TableHead>Seção</TableHead><TableHead>Tipo</TableHead><TableHead>Status</TableHead>
              <TableHead>Prioridade</TableHead><TableHead>Agendada</TableHead><TableHead>Responsável</TableHead><TableHead>Próxima</TableHead>
              {canEdit && <TableHead className="text-right">Ações</TableHead>}
            </TableRow></TableHeader>
            <TableBody>
              {filtered.map(m => {
                const st = effectiveStatus(m);
                const open = m.status === 'planejada' || m.status === 'em_andamento';
                return (
                  <TableRow key={m.id}>
                    <TableCell><p className="font-medium text-sm">{m.title}</p><p className="text-xs text-muted-foreground">{m.equipment_label || 'Não informado'}</p></TableCell>
                    <TableCell className="text-sm">{sectionLabel(m)}</TableCell>
                    <TableCell className="text-sm">{PM_TYPES[m.maintenance_type] || m.maintenance_type}</TableCell>
                    <TableCell><Pill label={PM_STATUS[st]?.label || st} color={PM_STATUS[st]?.color || '#64748b'} /></TableCell>
                    <TableCell><Pill label={PM_PRIORITY[m.priority]?.label || m.priority} color={PM_PRIORITY[m.priority]?.color || '#64748b'} /></TableCell>
                    <TableCell className="text-sm font-mono">{fmtDate(m.scheduled_date)}</TableCell>
                    <TableCell className="text-sm">{m.assigned_name || '—'}</TableCell>
                    <TableCell className="text-sm font-mono">{fmtDate(m.next_due_date)}</TableCell>
                    {canEdit && (
                      <TableCell className="text-right whitespace-nowrap">
                        {open && <Button size="icon" variant="ghost" title="Editar" onClick={() => openEdit(m)}><Pencil className="h-4 w-4" /></Button>}
                        {m.status === 'planejada' && <Button size="icon" variant="ghost" title="Iniciar" onClick={() => start(m)}><Play className="h-4 w-4" /></Button>}
                        {open && <Button size="icon" variant="ghost" title="Concluir" onClick={() => { setCompleting(m); setCompleteResult(m.result || ''); setCompleteNext(m.next_due_date || ''); }}><CheckCircle2 className="h-4 w-4" /></Button>}
                        {open && <Button size="icon" variant="ghost" title="Cancelar" onClick={() => setCancelling(m)}><XCircle className="h-4 w-4" /></Button>}
                        {!open && <Button size="icon" variant="ghost" title="Reabrir" onClick={() => reopen(m)}><RotateCcw className="h-4 w-4" /></Button>}
                      </TableCell>
                    )}
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </CardContent></Card>

      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editing ? 'Editar Manutenção' : 'Nova Manutenção'}</DialogTitle></DialogHeader>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="md:col-span-2"><Label>Título *</Label><Input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} maxLength={150} /></div>
            <div><Label>Notebook</Label>
              <Select value={form.notebook_id || 'none'} onValueChange={v => v === 'none' ? setForm({ ...form, notebook_id: '' }) : pickNotebook(v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="none">Outro equipamento</SelectItem>{notebooks.map(n => <SelectItem key={n.id} value={n.id}>{n.patrimonio} — {n.modelo}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Equipamento (descrição)</Label><Input value={form.equipment_label} onChange={e => setForm({ ...form, equipment_label: e.target.value })} maxLength={150} /></div>
            <div><Label>Seção</Label>
              <Select value={form.section_id || 'none'} onValueChange={v => setForm({ ...form, section_id: v === 'none' ? '' : v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="none">Não informada</SelectItem>{sections.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Tipo de manutenção *</Label>
              <Select value={form.maintenance_type} onValueChange={v => setForm({ ...form, maintenance_type: v })}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>{Object.entries(PM_TYPES).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Prioridade</Label>
              <Select value={form.priority} onValueChange={v => setForm({ ...form, priority: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{Object.entries(PM_PRIORITY).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Responsável</Label>
              <Select value={form.assigned_to || 'none'} onValueChange={v => setForm({ ...form, assigned_to: v === 'none' ? '' : v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="none">Não definido</SelectItem>{people.map(p => <SelectItem key={p.user_id} value={p.user_id}>{p.display_name || 'Sem nome'}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Data agendada *</Label><Input type="date" value={form.scheduled_date} onChange={e => setForm({ ...form, scheduled_date: e.target.value })} /></div>
            <div><Label>Próxima data prevista</Label><Input type="date" value={form.next_due_date} onChange={e => setForm({ ...form, next_due_date: e.target.value })} /></div>
            <div className="md:col-span-2"><Label>Descrição</Label><Textarea rows={2} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} maxLength={2000} /></div>
            <div className="md:col-span-2"><Label>Observações</Label><Textarea rows={2} value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} maxLength={2000} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setFormOpen(false)}>Cancelar</Button>
            <Button onClick={save} disabled={saving}>{saving ? 'Salvando...' : 'Salvar'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!completing} onOpenChange={o => !o && setCompleting(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Concluir manutenção</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">{completing?.title}</p>
          <div><Label>Resultado</Label><Textarea rows={3} value={completeResult} onChange={e => setCompleteResult(e.target.value)} maxLength={2000} /></div>
          <div><Label>Próxima manutenção</Label><Input type="date" value={completeNext} onChange={e => setCompleteNext(e.target.value)} /></div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCompleting(null)}>Voltar</Button>
            <Button onClick={confirmComplete}>Concluir</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!cancelling} onOpenChange={o => !o && setCancelling(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancelar manutenção?</AlertDialogTitle>
            <AlertDialogDescription>"{cancelling?.title}" será marcada como cancelada. Ela pode ser reaberta depois.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Voltar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmCancel}>Cancelar manutenção</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
