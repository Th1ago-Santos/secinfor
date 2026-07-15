import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Plus, Pencil, Trash2, Settings, ArrowUp, ArrowDown } from 'lucide-react';
import { toast } from 'sonner';
import PageTransition from '@/components/PageTransition';
import PageHeader from '@/components/PageHeader';
import { useTicketQueues, useTicketStatuses } from '@/hooks/useTicketMeta';

export default function TicketAdmin() {
  return (
    <PageTransition>
      <div className="container mx-auto py-6 px-4 max-w-4xl">
        <PageHeader icon={Settings} title="Configurações de Chamados" description="Gerencie filas e status" />
        <Tabs defaultValue="queues">
          <TabsList>
            <TabsTrigger value="queues">Filas</TabsTrigger>
            <TabsTrigger value="statuses">Status</TabsTrigger>
          </TabsList>
          <TabsContent value="queues"><QueuesTab /></TabsContent>
          <TabsContent value="statuses"><StatusesTab /></TabsContent>
        </Tabs>
      </div>
    </PageTransition>
  );
}

function QueuesTab() {
  const { queues, refetch } = useTicketQueues();
  const [editing, setEditing] = useState<any>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ name: '', description: '', active: true });

  const openAdd = () => { setForm({ name: '', description: '', active: true }); setShowAdd(true); };
  const openEdit = (q: any) => { setForm({ name: q.name, description: q.description || '', active: q.active }); setEditing(q); };

  const save = async () => {
    if (!form.name.trim()) return;
    if (editing) {
      const { error } = await (supabase as any).from('ticket_queues').update({ name: form.name.trim(), description: form.description || null, active: form.active }).eq('id', editing.id);
      if (error) toast.error('Erro ao salvar.'); else { toast.success('Fila atualizada.'); setEditing(null); refetch(); }
    } else {
      const nextOrder = (queues[queues.length - 1]?.display_order || 0) + 1;
      const { error } = await (supabase as any).from('ticket_queues').insert({ name: form.name.trim(), description: form.description || null, active: form.active, display_order: nextOrder });
      if (error) toast.error(error.code === '23505' ? 'Fila já existe.' : 'Erro ao criar.'); else { toast.success('Fila criada.'); setShowAdd(false); refetch(); }
    }
  };

  const remove = async () => {
    if (!deleteId) return;
    const { error } = await (supabase as any).from('ticket_queues').delete().eq('id', deleteId);
    if (error) toast.error('Erro ao excluir.'); else { toast.success('Fila excluída.'); refetch(); }
    setDeleteId(null);
  };

  const move = async (q: any, dir: -1 | 1) => {
    const idx = queues.findIndex(x => x.id === q.id);
    const other = queues[idx + dir];
    if (!other) return;
    await (supabase as any).from('ticket_queues').update({ display_order: other.display_order }).eq('id', q.id);
    await (supabase as any).from('ticket_queues').update({ display_order: q.display_order }).eq('id', other.id);
    refetch();
  };

  return (
    <Card className="shadow-card border-border/50 mt-3">
      <CardContent className="pt-5">
        <div className="flex justify-end mb-3">
          <Button size="sm" onClick={openAdd} className="gradient-primary border-0"><Plus className="h-4 w-4 mr-1.5" />Nova fila</Button>
        </div>
        <div className="rounded-xl border border-border/50">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40 hover:bg-muted/40">
                <TableHead className="text-[10px] uppercase tracking-widest">Ordem</TableHead>
                <TableHead className="text-[10px] uppercase tracking-widest">Nome</TableHead>
                <TableHead className="text-[10px] uppercase tracking-widest">Descrição</TableHead>
                <TableHead className="text-[10px] uppercase tracking-widest">Ativa</TableHead>
                <TableHead className="text-right text-[10px] uppercase tracking-widest">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {queues.map((q, i) => (
                <TableRow key={q.id} className="group">
                  <TableCell className="text-xs">
                    <div className="flex gap-0.5">
                      <Button variant="ghost" size="icon" className="h-6 w-6" disabled={i === 0} onClick={() => move(q, -1)}><ArrowUp className="h-3 w-3" /></Button>
                      <Button variant="ghost" size="icon" className="h-6 w-6" disabled={i === queues.length - 1} onClick={() => move(q, 1)}><ArrowDown className="h-3 w-3" /></Button>
                    </div>
                  </TableCell>
                  <TableCell className="text-sm font-medium">{q.name}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{q.description || '—'}</TableCell>
                  <TableCell><span className={`text-xs ${q.active ? 'text-green-500' : 'text-muted-foreground'}`}>{q.active ? 'Sim' : 'Não'}</span></TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-0.5 opacity-70 group-hover:opacity-100">
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(q)}><Pencil className="h-3.5 w-3.5" /></Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive/70 hover:text-destructive" onClick={() => setDeleteId(q.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        <Dialog open={showAdd || !!editing} onOpenChange={(o) => { if (!o) { setShowAdd(false); setEditing(null); } }}>
          <DialogContent>
            <DialogHeader><DialogTitle>{editing ? 'Editar fila' : 'Nova fila'}</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div><Label className="text-[10px] uppercase tracking-widest">Nome</Label><Input value={form.name} onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))} /></div>
              <div><Label className="text-[10px] uppercase tracking-widest">Descrição</Label><Input value={form.description} onChange={(e) => setForm(f => ({ ...f, description: e.target.value }))} /></div>
              <div className="flex items-center gap-2"><Switch checked={form.active} onCheckedChange={(v) => setForm(f => ({ ...f, active: v }))} /><Label>Ativa</Label></div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => { setShowAdd(false); setEditing(null); }}>Cancelar</Button>
              <Button onClick={save} className="gradient-primary border-0">Salvar</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
          <AlertDialogContent>
            <AlertDialogHeader><AlertDialogTitle>Excluir fila?</AlertDialogTitle><AlertDialogDescription>Chamados nesta fila ficarão sem fila até serem reatribuídos.</AlertDialogDescription></AlertDialogHeader>
            <AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel><AlertDialogAction onClick={remove} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Excluir</AlertDialogAction></AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </CardContent>
    </Card>
  );
}

function StatusesTab() {
  const { statuses, refetch } = useTicketStatuses();
  const [editing, setEditing] = useState<any>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ name: '', color: '#3b82f6', active: true, is_closed: false });

  const openAdd = () => { setForm({ name: '', color: '#3b82f6', active: true, is_closed: false }); setShowAdd(true); };
  const openEdit = (s: any) => { setForm({ name: s.name, color: s.color || '#3b82f6', active: s.active, is_closed: s.is_closed }); setEditing(s); };

  const save = async () => {
    if (!form.name.trim()) return;
    if (editing) {
      const { error } = await (supabase as any).from('ticket_statuses').update({ name: form.name.trim(), color: form.color, active: form.active, is_closed: form.is_closed }).eq('id', editing.id);
      if (error) toast.error('Erro ao salvar.'); else { toast.success('Status atualizado.'); setEditing(null); refetch(); }
    } else {
      const nextOrder = (statuses[statuses.length - 1]?.display_order || 0) + 1;
      const { error } = await (supabase as any).from('ticket_statuses').insert({ name: form.name.trim(), color: form.color, active: form.active, is_closed: form.is_closed, display_order: nextOrder });
      if (error) toast.error(error.code === '23505' ? 'Status já existe.' : 'Erro ao criar.'); else { toast.success('Status criado.'); setShowAdd(false); refetch(); }
    }
  };

  const remove = async () => {
    if (!deleteId) return;
    const { error } = await (supabase as any).from('ticket_statuses').delete().eq('id', deleteId);
    if (error) toast.error('Erro ao excluir.'); else { toast.success('Status excluído.'); refetch(); }
    setDeleteId(null);
  };

  return (
    <Card className="shadow-card border-border/50 mt-3">
      <CardContent className="pt-5">
        <div className="flex justify-end mb-3">
          <Button size="sm" onClick={openAdd} className="gradient-primary border-0"><Plus className="h-4 w-4 mr-1.5" />Novo status</Button>
        </div>
        <div className="rounded-xl border border-border/50">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40 hover:bg-muted/40">
                <TableHead className="text-[10px] uppercase tracking-widest">Cor</TableHead>
                <TableHead className="text-[10px] uppercase tracking-widest">Nome</TableHead>
                <TableHead className="text-[10px] uppercase tracking-widest">Fechado</TableHead>
                <TableHead className="text-[10px] uppercase tracking-widest">Ativo</TableHead>
                <TableHead className="text-right text-[10px] uppercase tracking-widest">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {statuses.map(s => (
                <TableRow key={s.id} className="group">
                  <TableCell><div className="h-4 w-4 rounded-full border border-border/40" style={{ background: s.color || '#888' }} /></TableCell>
                  <TableCell className="text-sm font-medium">{s.name}</TableCell>
                  <TableCell className="text-xs">{s.is_closed ? 'Sim' : 'Não'}</TableCell>
                  <TableCell><span className={`text-xs ${s.active ? 'text-green-500' : 'text-muted-foreground'}`}>{s.active ? 'Sim' : 'Não'}</span></TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-0.5 opacity-70 group-hover:opacity-100">
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(s)}><Pencil className="h-3.5 w-3.5" /></Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive/70 hover:text-destructive" onClick={() => setDeleteId(s.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        <Dialog open={showAdd || !!editing} onOpenChange={(o) => { if (!o) { setShowAdd(false); setEditing(null); } }}>
          <DialogContent>
            <DialogHeader><DialogTitle>{editing ? 'Editar status' : 'Novo status'}</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div><Label className="text-[10px] uppercase tracking-widest">Nome</Label><Input value={form.name} onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))} /></div>
              <div><Label className="text-[10px] uppercase tracking-widest">Cor</Label><Input type="color" value={form.color} onChange={(e) => setForm(f => ({ ...f, color: e.target.value }))} className="w-24 h-10" /></div>
              <div className="flex items-center gap-2"><Switch checked={form.active} onCheckedChange={(v) => setForm(f => ({ ...f, active: v }))} /><Label>Ativo</Label></div>
              <div className="flex items-center gap-2"><Switch checked={form.is_closed} onCheckedChange={(v) => setForm(f => ({ ...f, is_closed: v }))} /><Label>Finaliza chamado</Label></div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => { setShowAdd(false); setEditing(null); }}>Cancelar</Button>
              <Button onClick={save} className="gradient-primary border-0">Salvar</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
          <AlertDialogContent>
            <AlertDialogHeader><AlertDialogTitle>Excluir status?</AlertDialogTitle><AlertDialogDescription>Chamados com este status ficarão sem status.</AlertDialogDescription></AlertDialogHeader>
            <AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel><AlertDialogAction onClick={remove} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Excluir</AlertDialogAction></AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </CardContent>
    </Card>
  );
}
