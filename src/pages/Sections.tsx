import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Plus, Pencil, Trash2, Settings } from 'lucide-react';
import { toast } from 'sonner';
import { useSections } from '@/hooks/useSections';
import PageTransition from '@/components/PageTransition';
import PageHeader from '@/components/PageHeader';

export default function Sections() {
  const { sections, loading, refetch } = useSections();
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [editId, setEditId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState('');
  const [saving, setSaving] = useState(false);

  const handleAdd = async () => {
    if (!newName.trim()) return;
    setSaving(true);
    const { error } = await supabase.from('sections').insert([{ name: newName.trim() }] as any);
    if (error) toast.error(error.code === '23505' ? 'Seção já existe.' : 'Erro ao adicionar seção.');
    else { toast.success('Seção adicionada.'); setNewName(''); setShowAdd(false); refetch(); }
    setSaving(false);
  };

  const handleEdit = async () => {
    if (!editId || !editName.trim()) return;
    setSaving(true);
    const { error } = await supabase.from('sections').update({ name: editName.trim() } as any).eq('id', editId);
    if (error) toast.error(error.code === '23505' ? 'Seção já existe.' : 'Erro ao atualizar seção.');
    else { toast.success('Seção atualizada.'); setEditId(null); refetch(); }
    setSaving(false);
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    const { error } = await supabase.from('sections').delete().eq('id', deleteId);
    if (error) toast.error('Erro ao excluir seção.');
    else { toast.success('Seção excluída.'); refetch(); }
    setDeleteId(null);
  };

  return (
    <PageTransition>
      <div className="container mx-auto py-6 px-4 max-w-3xl">
        <PageHeader
          icon={Settings}
          title="Gerenciar Seções"
          description={`${sections.length} seção(ões)`}
          actions={
            <Button size="sm" onClick={() => setShowAdd(true)} className="gradient-primary border-0 shadow-glow hover:opacity-90 transition-all duration-300">
              <Plus className="h-4 w-4 mr-1.5" />
              Nova Seção
            </Button>
          }
        />

        <Card className="shadow-card border-border/50">
          <CardContent className="pt-5">
            {loading ? (
              <div className="space-y-2">
                {[...Array(8)].map((_, i) => <Skeleton key={i} className="h-12 w-full rounded-xl" />)}
              </div>
            ) : (
              <div className="rounded-xl border border-border/50">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/40 hover:bg-muted/40 border-b border-border/50">
                      <TableHead className="font-semibold text-[10px] uppercase tracking-widest text-muted-foreground">Nome</TableHead>
                      <TableHead className="font-semibold text-[10px] uppercase tracking-widest text-muted-foreground text-right w-28">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sections.map((s) => (
                      <TableRow key={s.id} className="hover:bg-muted/30 transition-colors duration-200 group border-b border-border/30 last:border-0">
                        <TableCell className="font-medium text-sm">{s.name}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-0.5 opacity-60 group-hover:opacity-100 transition-opacity duration-200">
                            <Button variant="ghost" size="icon" onClick={() => { setEditId(s.id); setEditName(s.name); }} className="h-8 w-8 hover:text-primary hover:bg-primary/10 rounded-lg transition-all duration-200">
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => setDeleteId(s.id)} className="h-8 w-8 text-destructive/60 hover:text-destructive hover:bg-destructive/10 rounded-lg transition-all duration-200">
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent>
          <DialogHeader><DialogTitle>Nova Seção</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <Label htmlFor="new-section" className="text-[10px] font-medium text-muted-foreground uppercase tracking-widest">Nome da Seção</Label>
            <Input id="new-section" value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Ex: S5" className="h-10 bg-muted/30 border-border/50 focus:bg-background focus:border-primary/50 transition-all duration-300" />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAdd(false)}>Cancelar</Button>
            <Button onClick={handleAdd} disabled={saving || !newName.trim()} className="gradient-primary border-0 transition-all duration-200">{saving ? 'Salvando...' : 'Salvar'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!editId} onOpenChange={() => setEditId(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Editar Seção</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <Label htmlFor="edit-section" className="text-[10px] font-medium text-muted-foreground uppercase tracking-widest">Nome da Seção</Label>
            <Input id="edit-section" value={editName} onChange={(e) => setEditName(e.target.value)} className="h-10 bg-muted/30 border-border/50 focus:bg-background focus:border-primary/50 transition-all duration-300" />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditId(null)}>Cancelar</Button>
            <Button onClick={handleEdit} disabled={saving || !editName.trim()} className="gradient-primary border-0 transition-all duration-200">{saving ? 'Salvando...' : 'Salvar'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>Tem certeza que deseja excluir esta seção?</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      </div>
    </PageTransition>
  );
}
