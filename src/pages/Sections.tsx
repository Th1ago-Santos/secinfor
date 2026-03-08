import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Plus, Pencil, Trash2, Settings } from 'lucide-react';
import { toast } from 'sonner';

import { useSections } from '@/hooks/useSections';

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
    <div className="container mx-auto py-6 px-4 max-w-3xl animate-in-page">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-4">
            <CardTitle className="flex items-center gap-2.5 text-lg">
              <div className="p-2 rounded-lg bg-primary/10">
                <Settings className="h-4 w-4 text-primary" />
              </div>
              Gerenciar Seções
            </CardTitle>
            <Button size="sm" onClick={() => setShowAdd(true)} className="shadow-sm transition-all duration-200">
              <Plus className="h-4 w-4 mr-1.5" />
              Nova Seção
            </Button>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-2">
                {[...Array(8)].map((_, i) => <Skeleton key={i} className="h-12 w-full rounded-lg" />)}
              </div>
            ) : (
              <div className="rounded-xl border">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50 hover:bg-muted/50 border-b">
                      <TableHead className="font-semibold text-xs uppercase tracking-wider">Nome</TableHead>
                      <TableHead className="font-semibold text-xs uppercase tracking-wider text-right w-28">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sections.map((s) => (
                      <TableRow key={s.id} className="hover:bg-muted/30 transition-colors duration-150 group">
                        <TableCell className="font-medium text-sm">{s.name}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-0.5 opacity-70 group-hover:opacity-100 transition-opacity duration-150">
                            <Button variant="ghost" size="icon" onClick={() => { setEditId(s.id); setEditName(s.name); }} className="h-8 w-8 hover:text-primary hover:bg-primary/10 transition-all duration-200">
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => setDeleteId(s.id)} className="h-8 w-8 text-destructive/70 hover:text-destructive hover:bg-destructive/10 transition-all duration-200">
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
            {!loading && <p className="text-xs text-muted-foreground mt-3 font-medium">{sections.length} seção(ões) cadastrada(s)</p>}
          </CardContent>
        </Card>
      

      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent>
          <DialogHeader><DialogTitle>Nova Seção</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <Label htmlFor="new-section" className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Nome da Seção</Label>
            <Input id="new-section" value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Ex: S5" className="h-10 bg-muted/30 border-border/60 focus:bg-background" />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAdd(false)}>Cancelar</Button>
            <Button onClick={handleAdd} disabled={saving || !newName.trim()} className="transition-all duration-200">{saving ? 'Salvando...' : 'Salvar'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!editId} onOpenChange={() => setEditId(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Editar Seção</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <Label htmlFor="edit-section" className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Nome da Seção</Label>
            <Input id="edit-section" value={editName} onChange={(e) => setEditName(e.target.value)} className="h-10 bg-muted/30 border-border/60 focus:bg-background" />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditId(null)}>Cancelar</Button>
            <Button onClick={handleEdit} disabled={saving || !editName.trim()} className="transition-all duration-200">{saving ? 'Salvando...' : 'Salvar'}</Button>
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
  );
}
