import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { useTicketQueues } from '@/hooks/useTicketMeta';
import type { TicketSla } from '@/types/ticket';

const PRIORITIES = ['Baixa', 'Normal', 'Alta', 'Urgente'];

function fmt(minutes: number) {
  if (minutes >= 1440) return `${Math.round((minutes / 1440) * 10) / 10} d`;
  if (minutes >= 60) return `${Math.round((minutes / 60) * 10) / 10} h`;
  return `${minutes} min`;
}

export default function SlaTab() {
  const { queues } = useTicketQueues();
  const [rows, setRows] = useState<TicketSla[]>([]);
  const [editing, setEditing] = useState<TicketSla | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ priority: 'Normal', queue_id: 'global', response_minutes: 60, resolution_minutes: 1440 });

  const refetch = useCallback(async () => {
    const { data } = await (supabase as any).from('ticket_sla').select('*').order('priority');
    setRows((data as TicketSla[]) || []);
  }, []);

  useEffect(() => { refetch(); }, [refetch]);

  const openAdd = () => { setForm({ priority: 'Normal', queue_id: 'global', response_minutes: 60, resolution_minutes: 1440 }); setShowAdd(true); };
  const openEdit = (r: TicketSla) => {
    setForm({ priority: r.priority, queue_id: r.queue_id ?? 'global', response_minutes: r.response_minutes, resolution_minutes: r.resolution_minutes });
    setEditing(r);
  };

  const save = async () => {
    const payload = {
      priority: form.priority,
      queue_id: form.queue_id === 'global' ? null : form.queue_id,
      response_minutes: Number(form.response_minutes),
      resolution_minutes: Number(form.resolution_minutes),
    };
    if (payload.response_minutes <= 0 || payload.resolution_minutes <= 0) {
      toast.error('Informe tempos maiores que zero.');
      return;
    }
    const q = editing
      ? (supabase as any).from('ticket_sla').update(payload).eq('id', editing.id)
      : (supabase as any).from('ticket_sla').insert(payload);
    const { error } = await q;
    if (error) {
      toast.error(error.code === '23505' ? 'Já existe SLA para esta prioridade/fila.' : 'Erro ao salvar SLA.');
      return;
    }
    toast.success('SLA salvo.');
    setEditing(null); setShowAdd(false);
    refetch();
  };

  const remove = async (id: string) => {
    const { error } = await (supabase as any).from('ticket_sla').delete().eq('id', id);
    if (error) toast.error('Erro ao excluir.'); else { toast.success('Regra removida.'); refetch(); }
  };

  const queueName = (id: string | null | undefined) => queues.find(q => q.id === id)?.name;

  return (
    <Card className="shadow-card border-border/50 mt-3">
      <CardContent className="pt-5">
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs text-muted-foreground">
            Regras globais por prioridade e regras específicas por fila (a regra da fila tem precedência).
          </p>
          <Button size="sm" onClick={openAdd} className="gradient-primary border-0"><Plus className="h-4 w-4 mr-1.5" />Nova regra</Button>
        </div>
        <div className="rounded-xl border border-border/50">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40 hover:bg-muted/40">
                <TableHead className="text-[10px] uppercase tracking-widest">Prioridade</TableHead>
                <TableHead className="text-[10px] uppercase tracking-widest">Fila</TableHead>
                <TableHead className="text-[10px] uppercase tracking-widest">1ª resposta</TableHead>
                <TableHead className="text-[10px] uppercase tracking-widest">Solução</TableHead>
                <TableHead className="text-right text-[10px] uppercase tracking-widest">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.length === 0 && (
                <TableRow><TableCell colSpan={5} className="text-center text-sm text-muted-foreground py-8">Nenhuma regra de SLA configurada.</TableCell></TableRow>
              )}
              {rows.map(r => (
                <TableRow key={r.id} className="group">
                  <TableCell className="text-sm font-medium">{r.priority}</TableCell>
                  <TableCell className="text-xs">
                    {r.queue_id
                      ? <Badge variant="outline" className="text-[10px]">{queueName(r.queue_id) || 'Fila removida'}</Badge>
                      : <span className="text-muted-foreground">Global</span>}
                  </TableCell>
                  <TableCell className="text-xs tabular-nums">{fmt(r.response_minutes)}</TableCell>
                  <TableCell className="text-xs tabular-nums">{fmt(r.resolution_minutes)}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-0.5 opacity-70 group-hover:opacity-100">
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(r)}><Pencil className="h-3.5 w-3.5" /></Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive/70 hover:text-destructive" onClick={() => remove(r.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        <Dialog open={showAdd || !!editing} onOpenChange={(o) => { if (!o) { setShowAdd(false); setEditing(null); } }}>
          <DialogContent>
            <DialogHeader><DialogTitle>{editing ? 'Editar regra de SLA' : 'Nova regra de SLA'}</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div>
                <Label className="text-[10px] uppercase tracking-widest">Prioridade</Label>
                <Select value={form.priority} onValueChange={v => setForm(f => ({ ...f, priority: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{PRIORITIES.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-[10px] uppercase tracking-widest">Fila</Label>
                <Select value={form.queue_id} onValueChange={v => setForm(f => ({ ...f, queue_id: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="global">Global (todas as filas)</SelectItem>
                    {queues.map(q => <SelectItem key={q.id} value={q.id}>{q.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-[10px] uppercase tracking-widest">1ª resposta (min)</Label>
                  <Input type="number" min={1} value={form.response_minutes} onChange={e => setForm(f => ({ ...f, response_minutes: Number(e.target.value) }))} />
                </div>
                <div>
                  <Label className="text-[10px] uppercase tracking-widest">Solução (min)</Label>
                  <Input type="number" min={1} value={form.resolution_minutes} onChange={e => setForm(f => ({ ...f, resolution_minutes: Number(e.target.value) }))} />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => { setShowAdd(false); setEditing(null); }}>Cancelar</Button>
              <Button onClick={save} className="gradient-primary border-0">Salvar</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
