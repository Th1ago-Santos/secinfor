import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import {
  ListOrdered, Plus, GripVertical, Pencil, Trash2, Printer,
  ArrowUpToLine, ArrowDownToLine, Trophy, Clock, Hash,
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

interface Priority {
  id: string;
  secao: string;
  responsavel: string;
  motivo: string;
  observacoes: string | null;
  data_solicitacao: string | null;
  ordem: number;
  created_at: string;
}

const emptyForm = { secao: '', responsavel: '', motivo: '', observacoes: '', data_solicitacao: '' };

function SortableItem({ item, index, onEdit, onDelete, onMoveTop, onMoveBottom, total }: {
  item: Priority; index: number; onEdit: () => void; onDelete: () => void;
  onMoveTop: () => void; onMoveBottom: () => void; total: number;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: item.id });
  const style = { transform: CSS.Transform.toString(transform), transition };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`group flex items-stretch gap-3 rounded-xl border bg-card p-4 shadow-sm transition-all duration-200 ${isDragging ? 'z-50 shadow-xl ring-2 ring-primary/40 scale-[1.02]' : 'hover:shadow-md'}`}
    >
      {/* Drag handle */}
      <div
        {...attributes}
        {...listeners}
        className="flex flex-col items-center justify-center cursor-grab active:cursor-grabbing text-muted-foreground/40 hover:text-muted-foreground transition-colors"
      >
        <GripVertical className="h-5 w-5" />
      </div>

      {/* Position badge */}
      <div className="flex items-center justify-center">
        <div className={`h-10 w-10 rounded-xl flex items-center justify-center font-bold text-sm shrink-0 ${
          index === 0 ? 'gradient-primary text-primary-foreground shadow-glow' :
          index === 1 ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400' :
          index === 2 ? 'bg-orange-500/15 text-orange-600 dark:text-orange-400' :
          'bg-muted text-muted-foreground'
        }`}>
          {index + 1}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0 space-y-1">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-semibold text-foreground">{item.secao}</span>
          <Badge variant="outline" className="text-[10px]">{item.responsavel}</Badge>
        </div>
        <p className="text-sm text-muted-foreground line-clamp-2">{item.motivo}</p>
        {item.observacoes && (
          <p className="text-xs text-muted-foreground/60 italic line-clamp-1">{item.observacoes}</p>
        )}
        {item.data_solicitacao && (
          <p className="text-[10px] text-muted-foreground/40 flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {format(new Date(item.data_solicitacao + 'T00:00:00'), 'dd/MM/yyyy')}
          </p>
        )}
      </div>

      {/* Actions */}
      <div className="flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        {index > 0 && (
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onMoveTop} title="Mover ao topo">
            <ArrowUpToLine className="h-3.5 w-3.5" />
          </Button>
        )}
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onEdit} title="Editar">
          <Pencil className="h-3.5 w-3.5" />
        </Button>
        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={onDelete} title="Excluir">
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
        {index < total - 1 && (
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onMoveBottom} title="Mover ao final">
            <ArrowDownToLine className="h-3.5 w-3.5" />
          </Button>
        )}
      </div>
    </div>
  );
}

export default function Priorities() {
  const [priorities, setPriorities] = useState<Priority[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const { sections } = useSections();
  const { toast } = useToast();

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const fetchPriorities = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from('computer_priorities')
      .select('*')
      .order('ordem', { ascending: true });
    setPriorities((data as Priority[]) || []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchPriorities(); }, [fetchPriorities]);

  const persistOrder = async (items: Priority[]) => {
    const updates = items.map((item, i) => ({ id: item.id, ordem: i }));
    for (const u of updates) {
      await supabase.from('computer_priorities').update({ ordem: u.ordem }).eq('id', u.id);
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = priorities.findIndex(p => p.id === active.id);
    const newIndex = priorities.findIndex(p => p.id === over.id);
    const reordered = arrayMove(priorities, oldIndex, newIndex);
    setPriorities(reordered);
    await persistOrder(reordered);
  };

  const moveToPosition = async (id: string, position: 'top' | 'bottom') => {
    const idx = priorities.findIndex(p => p.id === id);
    if (idx < 0) return;
    const target = position === 'top' ? 0 : priorities.length - 1;
    const reordered = arrayMove(priorities, idx, target);
    setPriorities(reordered);
    await persistOrder(reordered);
  };

  const openNew = () => {
    setEditingId(null);
    setForm(emptyForm);
    setDialogOpen(true);
  };

  const openEdit = (p: Priority) => {
    setEditingId(p.id);
    setForm({
      secao: p.secao,
      responsavel: p.responsavel,
      motivo: p.motivo,
      observacoes: p.observacoes || '',
      data_solicitacao: p.data_solicitacao || '',
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.secao || !form.responsavel || !form.motivo) {
      toast({ title: 'Preencha os campos obrigatórios', variant: 'destructive' });
      return;
    }
    setSaving(true);
    const payload = {
      secao: form.secao,
      responsavel: form.responsavel,
      motivo: form.motivo,
      observacoes: form.observacoes || null,
      data_solicitacao: form.data_solicitacao || null,
    };

    if (editingId) {
      await supabase.from('computer_priorities').update(payload).eq('id', editingId);
      toast({ title: 'Prioridade atualizada' });
    } else {
      const newOrdem = priorities.length;
      await supabase.from('computer_priorities').insert({ ...payload, ordem: newOrdem });
      toast({ title: 'Prioridade cadastrada' });
    }
    setSaving(false);
    setDialogOpen(false);
    fetchPriorities();
  };

  const handleDelete = async (id: string) => {
    await supabase.from('computer_priorities').delete().eq('id', id);
    toast({ title: 'Prioridade removida' });
    const remaining = priorities.filter(p => p.id !== id);
    setPriorities(remaining);
    await persistOrder(remaining);
  };

  const handlePrint = () => {
    generatePDFReport({
      title: 'Ranking de Prioridades de Computadores',
      subtitle: `Total: ${priorities.length} prioridade(s) cadastrada(s)`,
      columns: ['#', 'Seção', 'Responsável', 'Motivo', 'Data Solicitação'],
      rows: priorities.map((p, i) => [
        String(i + 1),
        p.secao,
        p.responsavel,
        p.motivo,
        p.data_solicitacao ? format(new Date(p.data_solicitacao + 'T00:00:00'), 'dd/MM/yyyy') : '-',
      ]),
      filename: 'ranking_prioridades',
    });
  };

  const topPriority = priorities[0];
  const lastAdded = [...priorities].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0];

  return (
    <PageTransition>
      <div className="space-y-6">
        <PageHeader
          icon={ListOrdered}
          title="Prioridades de Computadores"
          subtitle="Ranking de distribuição e substituição por seção"
          actions={
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={handlePrint} disabled={priorities.length === 0}>
                <Printer className="h-4 w-4 mr-1.5" /> Imprimir
              </Button>
              <Button size="sm" onClick={openNew}>
                <Plus className="h-4 w-4 mr-1.5" /> Nova Prioridade
              </Button>
            </div>
          }
        />

        {/* Summary cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card className="shadow-card">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10"><Hash className="h-5 w-5 text-primary" /></div>
              <div>
                <p className="text-xs text-muted-foreground">Total cadastradas</p>
                <p className="text-xl font-bold">{priorities.length}</p>
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

        {/* Ranking list */}
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => <Skeleton key={i} className="h-24 rounded-xl" />)}
          </div>
        ) : priorities.length === 0 ? (
          <Card className="shadow-card">
            <CardContent className="p-12 text-center text-muted-foreground">
              <ListOrdered className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p className="font-medium">Nenhuma prioridade cadastrada</p>
              <p className="text-sm mt-1">Clique em "Nova Prioridade" para começar.</p>
            </CardContent>
          </Card>
        ) : (
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={priorities.map(p => p.id)} strategy={verticalListSortingStrategy}>
              <div className="space-y-2">
                {priorities.map((item, index) => (
                  <SortableItem
                    key={item.id}
                    item={item}
                    index={index}
                    total={priorities.length}
                    onEdit={() => openEdit(item)}
                    onDelete={() => handleDelete(item.id)}
                    onMoveTop={() => moveToPosition(item.id, 'top')}
                    onMoveBottom={() => moveToPosition(item.id, 'bottom')}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        )}

        {/* Dialog */}
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>{editingId ? 'Editar Prioridade' : 'Nova Prioridade'}</DialogTitle>
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
      </div>
    </PageTransition>
  );
}
