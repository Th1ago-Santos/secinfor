import { useState, useCallback, forwardRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useSections } from '@/hooks/useSections';
import { useToast } from '@/hooks/use-toast';
import { generatePDFReport } from '@/lib/pdfExport';
import { format } from 'date-fns';
import PageTransition from '@/components/PageTransition';
import PageHeader from '@/components/PageHeader';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  ListOrdered, Plus, GripVertical, Pencil, Trash2, Printer,
  ArrowUpToLine, ArrowDownToLine, Trophy, Clock, Hash,
  CheckCircle2, PackageCheck, ChevronDown, ChevronUp,
} from 'lucide-react';
import {
  DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove, SortableContext, sortableKeyboardCoordinates,
  verticalListSortingStrategy, useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import type { Priority } from '@/types';

const emptyForm = { secao: '', responsavel: '', motivo: '', observacoes: '', data_solicitacao: '' };

// Fix forwardRef warning by wrapping SortableItem with forwardRef
const SortableItem = forwardRef<HTMLDivElement, {
  item: Priority; index: number; onEdit: () => void; onDelete: () => void;
  onMoveTop: () => void; onMoveBottom: () => void; onDeliver: () => void; total: number;
}>(function SortableItem({ item, index, onEdit, onDelete, onMoveTop, onMoveBottom, onDeliver, total }, _ref) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: item.id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : undefined,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`group flex items-center gap-2.5 rounded-lg border bg-card px-3 py-2 shadow-sm transition-shadow duration-200 ${isDragging ? 'shadow-xl ring-2 ring-primary/40' : 'hover:shadow-md'}`}
    >
      <button
        type="button"
        {...attributes}
        {...listeners}
        className="flex items-center justify-center cursor-grab active:cursor-grabbing text-muted-foreground/40 hover:text-muted-foreground transition-colors p-1 -m-1 touch-none"
      >
        <GripVertical className="h-4 w-4" />
      </button>

      <div className={`h-7 w-7 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 ${
        index === 0 ? 'gradient-primary text-primary-foreground shadow-glow' :
        index === 1 ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400' :
        index === 2 ? 'bg-orange-500/15 text-orange-600 dark:text-orange-400' :
        'bg-muted text-muted-foreground'
      }`}>
        {index + 1}
      </div>

      <div className="flex-1 min-w-0 flex items-center gap-2 flex-wrap">
        <span className="font-semibold text-sm text-foreground">{item.secao}</span>
        {item.responsavel && <Badge variant="outline" className="text-[9px] h-4">{item.responsavel}</Badge>}
        {item.motivo && <span className="text-xs text-muted-foreground truncate hidden sm:inline max-w-[200px]">{item.motivo}</span>}
        {item.observacoes && <span className="text-[10px] text-muted-foreground/50 italic truncate hidden md:inline max-w-[150px]">{item.observacoes}</span>}
        {item.data_solicitacao && (
          <span className="text-[10px] text-muted-foreground/40 flex items-center gap-0.5">
            <Clock className="h-2.5 w-2.5" />
            {format(new Date(item.data_solicitacao + 'T00:00:00'), 'dd/MM/yyyy')}
          </span>
        )}
      </div>

      {/* Always visible on mobile, hover on desktop */}
      <div className="flex items-center gap-0.5 transition-opacity sm:opacity-0 sm:group-hover:opacity-100">
        {index > 0 && (
          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={onMoveTop} title="Mover ao topo">
            <ArrowUpToLine className="h-3 w-3" />
          </Button>
        )}
        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={onEdit} title="Editar">
          <Pencil className="h-3 w-3" />
        </Button>
        <Button variant="ghost" size="icon" className="h-6 w-6 text-emerald-600 hover:text-emerald-700 dark:text-emerald-400" onClick={onDeliver} title="Computador entregue">
          <PackageCheck className="h-3 w-3" />
        </Button>
        <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive hover:text-destructive" onClick={onDelete} title="Excluir">
          <Trash2 className="h-3 w-3" />
        </Button>
        {index < total - 1 && (
          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={onMoveBottom} title="Mover ao final">
            <ArrowDownToLine className="h-3 w-3" />
          </Button>
        )}
      </div>
    </div>
  );
});

export default function Priorities() {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [deliverTarget, setDeliverTarget] = useState<Priority | null>(null);
  const [deliverObs, setDeliverObs] = useState('');
  const [showCompleted, setShowCompleted] = useState(true);
  const [printFilter, setPrintFilter] = useState<'abertas' | 'concluidas' | 'todas'>('todas');
  const { sections } = useSections();
  const { toast } = useToast();
  const { user } = useAuth();

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const { data: allPriorities = [], isLoading: loading } = useQuery({
    queryKey: ['priorities'],
    queryFn: async () => {
      const { data } = await supabase
        .from('computer_priorities')
        .select('*')
        .order('ordem', { ascending: true });
      return (data as Priority[]) || [];
    },
    staleTime: 10_000,
  });

  const activePriorities = allPriorities.filter(p => p.status === 'aberta').sort((a, b) => a.ordem - b.ordem);
  const completedPriorities = allPriorities.filter(p => p.status === 'concluida')
    .sort((a, b) => new Date(b.data_encerramento || b.created_at).getTime() - new Date(a.data_encerramento || a.created_at).getTime());

  const persistOrder = async (items: Priority[]) => {
    const ids = items.map(p => p.id);
    const orders = items.map((_, i) => i);
    await supabase.rpc('batch_update_priority_order', { ids, orders });
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = activePriorities.findIndex(p => p.id === active.id);
    const newIndex = activePriorities.findIndex(p => p.id === over.id);
    const reordered = arrayMove(activePriorities, oldIndex, newIndex).map((p, i) => ({ ...p, ordem: i }));
    // Optimistic update
    queryClient.setQueryData(['priorities'], [...reordered, ...allPriorities.filter(p => p.status !== 'aberta')]);
    await persistOrder(reordered);
  };

  const moveToPosition = async (id: string, position: 'top' | 'bottom') => {
    const idx = activePriorities.findIndex(p => p.id === id);
    if (idx < 0) return;
    const target = position === 'top' ? 0 : activePriorities.length - 1;
    const reordered = arrayMove(activePriorities, idx, target).map((p, i) => ({ ...p, ordem: i }));
    queryClient.setQueryData(['priorities'], [...reordered, ...allPriorities.filter(p => p.status !== 'aberta')]);
    await persistOrder(reordered);
  };

  const openNew = () => { setEditingId(null); setForm(emptyForm); setDialogOpen(true); };

  const openEdit = (p: Priority) => {
    setEditingId(p.id);
    setForm({
      secao: p.secao, responsavel: p.responsavel, motivo: p.motivo,
      observacoes: p.observacoes || '', data_solicitacao: p.data_solicitacao || '',
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.secao) { toast({ title: 'Selecione a seção', variant: 'destructive' }); return; }
    setSaving(true);
    const payload = {
      secao: form.secao, responsavel: form.responsavel || null, motivo: form.motivo || null,
      observacoes: form.observacoes || null, data_solicitacao: form.data_solicitacao || null,
    };

    if (editingId) {
      await supabase.from('computer_priorities').update(payload).eq('id', editingId);
      toast({ title: 'Prioridade atualizada' });
    } else {
      const newOrdem = activePriorities.length;
      await supabase.from('computer_priorities').insert({ ...payload, ordem: newOrdem, status: 'aberta' });
      toast({ title: 'Prioridade cadastrada' });
    }
    setSaving(false);
    setDialogOpen(false);
    queryClient.invalidateQueries({ queryKey: ['priorities'] });
  };

  const handleDelete = async (id: string) => {
    await supabase.from('computer_priorities').delete().eq('id', id);
    toast({ title: 'Prioridade removida' });
    const remaining = activePriorities.filter(p => p.id !== id);
    queryClient.setQueryData(['priorities'], [...remaining, ...allPriorities.filter(p => p.status !== 'aberta')]);
    await persistOrder(remaining);
  };

  const handleDeliver = async () => {
    if (!deliverTarget) return;
    setSaving(true);
    const now = new Date().toISOString();

    await supabase.from('computer_priorities').update({
      status: 'concluida', data_encerramento: now,
    }).eq('id', deliverTarget.id);

    await supabase.from('movements').insert({
      item_id: deliverTarget.id, item_tipo: 'prioridade', tipo_evento: 'entrega_computador',
      secao_destino: deliverTarget.secao, responsavel_novo: deliverTarget.responsavel,
      observacao: deliverObs || `Prioridade atendida — ${deliverTarget.motivo}`,
      usuario_sistema: user?.id || null, data_hora: now,
    });

    toast({ title: 'Computador entregue!', description: `Prioridade da seção ${deliverTarget.secao} concluída.` });

    const remaining = activePriorities.filter(p => p.id !== deliverTarget.id);
    await persistOrder(remaining);

    setSaving(false);
    setDeliverTarget(null);
    setDeliverObs('');
    queryClient.invalidateQueries({ queryKey: ['priorities'] });
  };

  const handlePrint = () => {
    const items = printFilter === 'abertas' ? activePriorities :
      printFilter === 'concluidas' ? completedPriorities : [...activePriorities, ...completedPriorities];
    const filterLabel = printFilter === 'abertas' ? 'Abertas' : printFilter === 'concluidas' ? 'Concluídas' : 'Todas';

    generatePDFReport({
      title: 'Ranking de Prioridades de Computadores',
      subtitle: `Filtro: ${filterLabel} — Total: ${items.length} prioridade(s)`,
      columns: ['#', 'Seção', 'Responsável', 'Motivo', 'Abertura', 'Encerramento', 'Status'],
      rows: items.map((p) => [
        p.status === 'aberta' ? String(activePriorities.indexOf(p) + 1) : '—',
        p.secao, p.responsavel, p.motivo,
        p.data_solicitacao ? format(new Date(p.data_solicitacao + 'T00:00:00'), 'dd/MM/yyyy') : '-',
        p.data_encerramento ? format(new Date(p.data_encerramento), 'dd/MM/yyyy') : '-',
        p.status === 'aberta' ? 'Aberta' : 'Concluída',
      ]),
      filename: 'ranking_prioridades',
    });
  };

  const topPriority = activePriorities[0];
  const lastAdded = [...allPriorities].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0];

  return (
    <PageTransition>
      <div className="space-y-6">
        <PageHeader
          icon={ListOrdered}
          title="Prioridades de Computadores"
          description="Ranking de distribuição e substituição por seção"
          actions={
            <div className="flex gap-2 flex-wrap">
              <Select value={printFilter} onValueChange={v => setPrintFilter(v as typeof printFilter)}>
                <SelectTrigger className="w-[130px] h-9 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="todas">Todas</SelectItem>
                  <SelectItem value="abertas">Abertas</SelectItem>
                  <SelectItem value="concluidas">Concluídas</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="outline" size="sm" onClick={handlePrint} disabled={allPriorities.length === 0}>
                <Printer className="h-4 w-4 mr-1.5" /> Imprimir
              </Button>
              <Button size="sm" onClick={openNew}>
                <Plus className="h-4 w-4 mr-1.5" /> Nova Prioridade
              </Button>
            </div>
          }
        />

        {/* Summary cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <Card className="shadow-card">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10"><Hash className="h-5 w-5 text-primary" /></div>
              <div>
                <p className="text-xs text-muted-foreground">Abertas</p>
                <p className="text-xl font-bold">{activePriorities.length}</p>
              </div>
            </CardContent>
          </Card>
          <Card className="shadow-card">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-emerald-500/10"><CheckCircle2 className="h-5 w-5 text-emerald-500" /></div>
              <div>
                <p className="text-xs text-muted-foreground">Concluídas</p>
                <p className="text-xl font-bold">{completedPriorities.length}</p>
              </div>
            </CardContent>
          </Card>
          <Card className="shadow-card">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-amber-500/10"><Trophy className="h-5 w-5 text-amber-500" /></div>
              <div>
                <p className="text-xs text-muted-foreground">Maior prioridade</p>
                <p className="text-xl font-bold truncate">{topPriority?.secao || '—'}</p>
              </div>
            </CardContent>
          </Card>
          <Card className="shadow-card">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-muted"><Clock className="h-5 w-5 text-muted-foreground" /></div>
              <div>
                <p className="text-xs text-muted-foreground">Última adicionada</p>
                <p className="text-xl font-bold truncate">{lastAdded?.secao || '—'}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Active ranking */}
        <div>
          <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
            <ListOrdered className="h-4 w-4 text-primary" />
            Prioridades Ativas
            <Badge variant="secondary" className="text-[10px]">{activePriorities.length}</Badge>
          </h3>

          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map(i => <Skeleton key={i} className="h-24 rounded-xl" />)}
            </div>
          ) : activePriorities.length === 0 ? (
            <Card className="shadow-card">
              <CardContent className="p-12 text-center text-muted-foreground">
                <ListOrdered className="h-12 w-12 mx-auto mb-3 opacity-30" />
                <p className="font-medium">Nenhuma prioridade ativa</p>
                <p className="text-sm mt-1">Clique em "Nova Prioridade" para começar.</p>
              </CardContent>
            </Card>
          ) : (
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
              <SortableContext items={activePriorities.map(p => p.id)} strategy={verticalListSortingStrategy}>
                <div className="space-y-2">
                  {activePriorities.map((item, index) => (
                    <SortableItem
                      key={item.id}
                      item={item}
                      index={index}
                      total={activePriorities.length}
                      onEdit={() => openEdit(item)}
                      onDelete={() => handleDelete(item.id)}
                      onMoveTop={() => moveToPosition(item.id, 'top')}
                      onMoveBottom={() => moveToPosition(item.id, 'bottom')}
                      onDeliver={() => { setDeliverTarget(item); setDeliverObs(''); }}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          )}
        </div>

        {/* Completed priorities */}
        {completedPriorities.length > 0 && (
          <div>
            <button
              onClick={() => setShowCompleted(v => !v)}
              className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2 hover:text-primary transition-colors"
            >
              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
              Prioridades Concluídas
              <Badge variant="secondary" className="text-[10px]">{completedPriorities.length}</Badge>
              {showCompleted ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
            </button>

            {showCompleted && (
              <Card className="shadow-card overflow-hidden">
                {/* Desktop table */}
                <div className="hidden sm:block">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-10"></TableHead>
                        <TableHead>Seção</TableHead>
                        <TableHead>Responsável</TableHead>
                        <TableHead className="hidden md:table-cell">Motivo</TableHead>
                        <TableHead className="hidden lg:table-cell">Observações</TableHead>
                        <TableHead>Abertura</TableHead>
                        <TableHead>Encerramento</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {completedPriorities.map(p => (
                        <TableRow key={p.id} className="text-muted-foreground">
                          <TableCell><CheckCircle2 className="h-4 w-4 text-emerald-500" /></TableCell>
                          <TableCell className="font-medium text-foreground">{p.secao}</TableCell>
                          <TableCell>{p.responsavel}</TableCell>
                          <TableCell className="hidden md:table-cell max-w-[200px] truncate">{p.motivo}</TableCell>
                          <TableCell className="hidden lg:table-cell max-w-[200px] truncate text-xs italic">{p.observacoes || '—'}</TableCell>
                          <TableCell className="text-xs">
                            {p.data_solicitacao ? format(new Date(p.data_solicitacao + 'T00:00:00'), 'dd/MM/yyyy') : format(new Date(p.created_at), 'dd/MM/yyyy')}
                          </TableCell>
                          <TableCell className="text-xs font-medium text-emerald-600 dark:text-emerald-400">
                            {p.data_encerramento ? format(new Date(p.data_encerramento), 'dd/MM/yyyy') : '-'}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                {/* Mobile card view */}
                <div className="space-y-0 sm:hidden divide-y divide-border/30">
                  {completedPriorities.map(p => (
                    <div key={p.id} className="p-4 flex items-start gap-3">
                      <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm">{p.secao}</p>
                        <p className="text-xs text-muted-foreground">{p.responsavel}</p>
                        <div className="flex gap-3 mt-1 text-[10px] text-muted-foreground">
                          <span>Aberta: {p.data_solicitacao ? format(new Date(p.data_solicitacao + 'T00:00:00'), 'dd/MM/yy') : format(new Date(p.created_at), 'dd/MM/yy')}</span>
                          <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                            Entregue: {p.data_encerramento ? format(new Date(p.data_encerramento), 'dd/MM/yy') : '-'}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            )}
          </div>
        )}

        {/* Edit/New Dialog */}
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>{editingId ? 'Editar Prioridade' : 'Nova Prioridade'}</DialogTitle>
              <DialogDescription>
                {editingId ? 'Atualize os dados da prioridade.' : 'Cadastre uma nova prioridade de computador.'}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="space-y-1.5">
                <Label>Seção *</Label>
                <Select value={form.secao} onValueChange={v => setForm(f => ({ ...f, secao: v }))}>
                  <SelectTrigger><SelectValue placeholder="Selecione a seção" /></SelectTrigger>
                  <SelectContent>
                    {sections.map(s => (
                      <SelectItem key={s.id} value={s.name}>{s.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Responsável / Referência *</Label>
                <Input
                  value={form.responsavel}
                  onChange={e => setForm(f => ({ ...f, responsavel: e.target.value }))}
                  placeholder="Nome do militar ou referência"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Motivo da prioridade *</Label>
                <Textarea
                  value={form.motivo}
                  onChange={e => setForm(f => ({ ...f, motivo: e.target.value }))}
                  placeholder="Justifique a necessidade..."
                  rows={3}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>Data da solicitação</Label>
                  <Input
                    type="date"
                    value={form.data_solicitacao}
                    onChange={e => setForm(f => ({ ...f, data_solicitacao: e.target.value }))}
                  />
                </div>
                <div className="space-y-1.5 col-span-2 sm:col-span-1">
                  <Label>Observações</Label>
                  <Input
                    value={form.observacoes}
                    onChange={e => setForm(f => ({ ...f, observacoes: e.target.value }))}
                    placeholder="Opcional"
                  />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
              <Button onClick={handleSave} disabled={saving}>
                {saving ? 'Salvando...' : editingId ? 'Salvar' : 'Cadastrar'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Deliver confirmation dialog */}
        <AlertDialog open={!!deliverTarget} onOpenChange={open => { if (!open) setDeliverTarget(null); }}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2">
                <PackageCheck className="h-5 w-5 text-emerald-500" />
                Confirmar entrega de computador
              </AlertDialogTitle>
              <AlertDialogDescription>
                Confirma que o computador foi entregue para a seção <strong>{deliverTarget?.secao}</strong>?
                Esta ação irá concluir a prioridade e registrar no histórico de movimentações.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <div className="space-y-1.5 py-2">
              <Label>Observação (opcional)</Label>
              <Input
                value={deliverObs}
                onChange={e => setDeliverObs(e.target.value)}
                placeholder="Ex: Notebook Dell Latitude entregue..."
              />
            </div>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDeliver}
                disabled={saving}
                className="bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                {saving ? 'Registrando...' : 'Confirmar Entrega'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </PageTransition>
  );
}
