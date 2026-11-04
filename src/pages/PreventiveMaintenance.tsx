import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { ROLE_LABELS, useUserRole } from '@/hooks/useUserRole';
import { useSections } from '@/hooks/useSections';
import { logAudit } from '@/lib/audit';
import { toast } from 'sonner';
import PageHeader from '@/components/PageHeader';
import EmptyState from '@/components/EmptyState';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
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
import { generatePreventivePDF } from '@/lib/preventivePdf';
import { effectiveStatus, filterMaintenances, maintenanceSummary, today, fmtDate, recurrenceLabel, validRecurrence, RECURRENCE_UNITS, PM_STATUS, PM_TYPES, PM_PRIORITY, type Maintenance as PM } from '@/lib/preventiveMaintenance';
import { FileDown, Loader2, RefreshCw, Wrench, Plus, Play, CheckCircle2, XCircle, RotateCcw, Pencil, AlertTriangle, CalendarClock, Clock, ListChecks, CalendarX, Repeat2, Eye, ArrowLeft, ArrowRight, Trash2 } from 'lucide-react';

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
  description: string; priority: string; scheduled_date: string; assigned_to: string; notes: string; next_due_date: string; recurrence_enabled: boolean; recurrence_interval: string; recurrence_unit: string;
};
const emptyForm: FormState = {
  notebook_id: '', equipment_label: '', section_id: '', title: '', maintenance_type: '', description: '',
  priority: 'normal', scheduled_date: '', assigned_to: '', notes: '', next_due_date: '', recurrence_enabled: false, recurrence_interval: '', recurrence_unit: '',
};

export default function PreventiveMaintenance() {
  const { user } = useAuth();
  const { role, loading: roleLoading, canEdit, isChefeSecao, sectionId, sectionName, missingSection } = useUserRole();
  const { sections } = useSections();
  const [items, setItems] = useState<PM[]>([]);
  const [notebooks, setNotebooks] = useState<{ id: string; patrimonio: string; modelo: string; secao: string }[]>([]);
  const [people, setPeople] = useState<{ user_id: string; display_name: string | null }[]>([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
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
  const [viewing, setViewing] = useState<PM | null>(null);
  const [deleting, setDeleting] = useState<PM | null>(null);
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
     
  }, [canEdit]);

  const sectionLabel = (m: PM) => m.section_name || sections.find(s => s.id === m.section_id)?.name || 'Não informado';

  const filters = useMemo(() => ({ section: isChefeSecao ? sectionId || 'none' : fSection, status: fStatus, type: fType,
    priority: fPriority, responsible: fResp, from: fFrom, to: fTo, query: q }),
    [isChefeSecao, sectionId, fSection, fStatus, fType, fPriority, fResp, fFrom, fTo, q]);
  const filtered = useMemo(() => filterMaintenances(items, filters, isChefeSecao ? sectionId : null), [items, filters, isChefeSecao, sectionId]);
  const scopedNotebooks = useMemo(() => {
    const name = isChefeSecao ? sectionName : sections.find(s => s.id === fSection)?.name;
    return notebooks.filter(n => !name || n.secao?.toLowerCase() === name.toLowerCase());
  }, [notebooks, isChefeSecao, sectionName, sections, fSection]);
  const stats = useMemo(() => maintenanceSummary(filtered, scopedNotebooks), [filtered, scopedNotebooks]);

  const exportPdf = async () => {
    if (!role || roleLoading || role === 'visualizador' || loading || error || exporting || missingSection) return;
    setExporting(true);
    try {
      const issuedAt = new Date();
      const section = isChefeSecao ? sectionName || 'Não informado' : sections.find(s => s.id === fSection)?.name || 'Todas as seções';
      const applied = [q.trim() && `Busca: ${q.trim()}`, fStatus !== 'all' && `Status: ${PM_STATUS[fStatus]?.label}`,
        fType !== 'all' && `Tipo: ${PM_TYPES[fType]}`, fPriority !== 'all' && `Prioridade: ${PM_PRIORITY[fPriority]?.label}`,
        fResp !== 'all' && `Responsável: ${fResp}`, fFrom && `De: ${fmtDate(fFrom)}`, fTo && `Até: ${fmtDate(fTo)}`].filter((v): v is string => Boolean(v));
      generatePreventivePDF({ rows: filtered.map(m => ({ ...m, section_name: sectionLabel(m) })), section,
        singleSection: isChefeSecao || fSection !== 'all' || new Set(filtered.map(m => m.section_id || m.section_name)).size === 1,
        emitter: user?.email || 'Não informado', role: ROLE_LABELS[role], filters: applied,
        summary: cards.map(c => ({ label: c.label, value: c.value })), issuedAt });
      await logAudit({ action: 'Exportação de PDF da Manutenção Preventiva', entityType: 'manutencao_preventiva',
        entityLabel: section, eventType: 'equipamento', severity: 'baixo',
        details: { usuario: user?.id, perfil: role, secao: section, filtros: filters, quantidade: filtered.length, emissao: issuedAt.toISOString() } });
      toast.success('PDF exportado.');
    } catch { toast.error('Não foi possível exportar o PDF.'); }
    finally { setExporting(false); }
  };

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
      assigned_to: m.assigned_to || '', notes: m.notes || '', next_due_date: m.next_due_date || '', recurrence_enabled: !!m.recurrence_enabled, recurrence_interval: String(m.recurrence_interval || ''), recurrence_unit: m.recurrence_unit || '',
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
    if (form.recurrence_enabled && !validRecurrence(Number(form.recurrence_interval), form.recurrence_unit)) {
      toast.error('Informe um intervalo inteiro maior que zero e uma unidade.'); return;
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
      recurrence_enabled: form.recurrence_enabled, recurrence_interval: form.recurrence_enabled ? Number(form.recurrence_interval) : null, recurrence_unit: form.recurrence_enabled ? form.recurrence_unit : null,
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
    if (!completing || saving) return;
    if (completeNext && completeNext < today()) { toast.error('A próxima manutenção deve ser uma data futura.'); return; }
    setSaving(true);
    try {
      const { data, error } = await supabase.rpc('complete_preventive_maintenance', {
        p_id: completing.id, p_result: completeResult.trim() || undefined, p_next_date: completeNext || undefined,
      });
      if (error) throw error;
      const result = data as { next_id?: string; reused?: boolean; removed?: boolean };
      toast.success(result.removed ? 'Concluída. A próxima ocorrência já havia sido gerada e excluída.' : result.next_id ?
        result.reused ? 'Concluída. Próxima ocorrência existente reutilizada.' : 'Concluída. Próxima ocorrência planejada criada.' : 'Manutenção concluída.');
      setCompleting(null); await load();
    } catch (err) { toast.error(err instanceof Error ? err.message : 'Não foi possível concluir a manutenção.'); }
    finally { setSaving(false); }
  };
  const confirmDelete = async () => {
    if (!deleting || role !== 'admin' || saving) return;
    setSaving(true);
    const { error } = await supabase.from('preventive_maintenances').delete().eq('id', deleting.id);
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success('Ocorrência excluída.'); setDeleting(null); await load();
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
        actions={<div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={load} disabled={loading}><RefreshCw className="h-4 w-4 mr-1" />Atualizar</Button>
          <Button variant="outline" onClick={exportPdf} disabled={loading || roleLoading || exporting || !!error || !role || role === 'visualizador'}>
            {exporting ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <FileDown className="h-4 w-4 mr-1" />}{exporting ? 'Gerando PDF...' : 'Exportar PDF'}
          </Button>
          {canEdit && <Button onClick={openNew}><Plus className="h-4 w-4 mr-1" />Nova Manutenção</Button>}
        </div>} />

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
            <SelectTrigger aria-label="Seção"><SelectValue placeholder="Seção" /></SelectTrigger>
            <SelectContent><SelectItem value="all">Todas as seções</SelectItem>{sections.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
          </Select>
        )}
        <Select value={fStatus} onValueChange={setFStatus}>
          <SelectTrigger aria-label="Status"><SelectValue /></SelectTrigger>
          <SelectContent><SelectItem value="all">Todos os status</SelectItem>{Object.entries(PM_STATUS).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}</SelectContent>
        </Select>
        <Select value={fType} onValueChange={setFType}>
          <SelectTrigger aria-label="Tipo"><SelectValue /></SelectTrigger>
          <SelectContent><SelectItem value="all">Todos os tipos</SelectItem>{Object.entries(PM_TYPES).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent>
        </Select>
        <Select value={fPriority} onValueChange={setFPriority}>
          <SelectTrigger aria-label="Prioridade"><SelectValue /></SelectTrigger>
          <SelectContent><SelectItem value="all">Todas prioridades</SelectItem>{Object.entries(PM_PRIORITY).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}</SelectContent>
        </Select>
        <Select value={fResp} onValueChange={setFResp}>
          <SelectTrigger aria-label="Responsável"><SelectValue /></SelectTrigger>
          <SelectContent><SelectItem value="all">Todos responsáveis</SelectItem>{responsaveis.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent>
        </Select>
        <div className="col-span-2 md:col-span-4 xl:col-span-8 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          Período agendado: <Input type="date" aria-label="Período inicial" className="w-40 h-8" value={fFrom} onChange={e => setFFrom(e.target.value)} />
          até <Input type="date" aria-label="Período final" className="w-40 h-8" value={fTo} onChange={e => setFTo(e.target.value)} />
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
              <TableHead className="text-right">Ações</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {filtered.map(m => {
                const st = effectiveStatus(m);
                const open = m.status === 'planejada' || m.status === 'em_andamento';
                return (
                  <TableRow key={m.id}>
                    <TableCell><p className="font-medium text-sm">{m.title}</p><p className="text-xs text-muted-foreground">{m.equipment_label || 'Não informado'}</p><p className="flex items-center gap-1 text-xs text-muted-foreground mt-1">{m.recurrence_enabled && <Repeat2 className="h-3 w-3 shrink-0" />}{recurrenceLabel(m)}</p></TableCell>
                    <TableCell className="text-sm">{sectionLabel(m)}</TableCell>
                    <TableCell className="text-sm">{PM_TYPES[m.maintenance_type] || m.maintenance_type}</TableCell>
                    <TableCell><Pill label={PM_STATUS[st]?.label || st} color={PM_STATUS[st]?.color || '#64748b'} /></TableCell>
                    <TableCell><Pill label={PM_PRIORITY[m.priority]?.label || m.priority} color={PM_PRIORITY[m.priority]?.color || '#64748b'} /></TableCell>
                    <TableCell className="text-sm font-mono">{fmtDate(m.scheduled_date)}</TableCell>
                    <TableCell className="text-sm">{m.assigned_name || '—'}</TableCell>
                    <TableCell className="text-sm font-mono">{fmtDate(m.next_due_date)}</TableCell>
                    <TableCell className="text-right whitespace-nowrap">
                        <Tooltip><TooltipTrigger asChild><Button size="icon" variant="ghost" aria-label="Detalhes" onClick={() => setViewing(m)}><Eye className="h-4 w-4" /></Button></TooltipTrigger><TooltipContent>Detalhes</TooltipContent></Tooltip>
                        {canEdit && <>
                        {open && <Button size="icon" variant="ghost" title="Editar" onClick={() => openEdit(m)}><Pencil className="h-4 w-4" /></Button>}
                        {m.status === 'planejada' && <Button size="icon" variant="ghost" title="Iniciar" onClick={() => start(m)}><Play className="h-4 w-4" /></Button>}
                        {open && <Button size="icon" variant="ghost" title="Concluir" onClick={() => { setCompleting(m); setCompleteResult(m.result || ''); setCompleteNext(m.next_due_date || ''); }}><CheckCircle2 className="h-4 w-4" /></Button>}
                        {open && <Button size="icon" variant="ghost" title="Cancelar" onClick={() => setCancelling(m)}><XCircle className="h-4 w-4" /></Button>}
                        {!open && <Button size="icon" variant="ghost" title="Reabrir" onClick={() => reopen(m)}><RotateCcw className="h-4 w-4" /></Button>}
                        </>}
                        {role === 'admin' && <Tooltip><TooltipTrigger asChild><Button size="icon" variant="ghost" aria-label="Excluir ocorrência" onClick={() => setDeleting(m)}><Trash2 className="h-4 w-4" /></Button></TooltipTrigger><TooltipContent>Excluir ocorrência</TooltipContent></Tooltip>}
                      </TableCell>
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
            <div className="md:col-span-2 flex items-center gap-3"><Switch id="recurrence" checked={form.recurrence_enabled} onCheckedChange={enabled => setForm({ ...form, recurrence_enabled: enabled, recurrence_interval: enabled ? '1' : '', recurrence_unit: enabled ? 'meses' : '' })} /><Label htmlFor="recurrence">Manutenção recorrente</Label></div>
            {form.recurrence_enabled && <>
              <div><Label htmlFor="recurrence-quantity">Quantidade do intervalo</Label><Input id="recurrence-quantity" type="number" min="1" step="1" value={form.recurrence_interval} onChange={e => setForm({ ...form, recurrence_interval: e.target.value })} /></div>
              <div><Label>Unidade</Label><Select value={form.recurrence_unit} onValueChange={v => setForm({ ...form, recurrence_unit: v })}><SelectTrigger aria-label="Unidade de recorrência"><SelectValue /></SelectTrigger><SelectContent>{Object.entries(RECURRENCE_UNITS).map(([key, label]) => <SelectItem key={key} value={key}>{label}</SelectItem>)}</SelectContent></Select></div>
            </>}
            <p className="md:col-span-2 text-sm text-muted-foreground">{recurrenceLabel({ recurrence_enabled: form.recurrence_enabled, recurrence_interval: Number(form.recurrence_interval), recurrence_unit: form.recurrence_unit })}</p>
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
          <p className="text-sm text-muted-foreground">{completing?.title} · {completing && recurrenceLabel(completing)}</p>
          <div><Label>Resultado</Label><Textarea rows={3} value={completeResult} onChange={e => setCompleteResult(e.target.value)} maxLength={2000} /></div>
          <div><Label>Próxima manutenção</Label><Input type="date" value={completeNext} onChange={e => setCompleteNext(e.target.value)} /></div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCompleting(null)}>Voltar</Button>
            <Button onClick={confirmComplete} disabled={saving}>{saving ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : null}Concluir</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!viewing} onOpenChange={o => !o && setViewing(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto"><DialogHeader><DialogTitle>{viewing?.title}</DialogTitle></DialogHeader>
          {viewing && <div className="space-y-3 text-sm break-words">
            <p>{viewing.equipment_label || 'Não informado'} · {sectionLabel(viewing)}</p>
            <p className="flex gap-2 items-center"><Repeat2 className="h-4 w-4" />{recurrenceLabel(viewing)}</p>
            <p>{PM_STATUS[effectiveStatus(viewing)]?.label} · {fmtDate(viewing.scheduled_date)}</p>
            <p>{viewing.description || 'Não informado'}</p><p>Resultado: {viewing.result || 'Não informado'}</p>
            <div className="flex flex-wrap gap-2">{items.filter(m => m.id === viewing.generated_from_id || m.generated_from_id === viewing.id).map(m => <Button key={m.id} variant="outline" onClick={() => setViewing(m)}>{m.id === viewing.generated_from_id ? <ArrowLeft className="h-4 w-4 mr-1" /> : <ArrowRight className="h-4 w-4 mr-1" />}{m.id === viewing.generated_from_id ? 'Anterior' : 'Próxima'} · {fmtDate(m.scheduled_date)}</Button>)}</div>
          </div>}
        </DialogContent>
      </Dialog>
      <AlertDialog open={!!deleting} onOpenChange={o => !o && setDeleting(null)}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Excluir ocorrência?</AlertDialogTitle><AlertDialogDescription>Somente “{deleting?.title}” será excluída. Equipamentos e outras ocorrências serão preservados.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Voltar</AlertDialogCancel><AlertDialogAction disabled={saving} onClick={confirmDelete}>Excluir ocorrência</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
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
