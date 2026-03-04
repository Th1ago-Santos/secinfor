import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Plus, Pencil, Trash2, Search, Monitor, Eye } from 'lucide-react';
import { toast } from 'sonner';
import AppHeader from '@/components/AppHeader';
import { useSections } from '@/hooks/useSections';
import type { Database } from '@/integrations/supabase/types';

type Notebook = Database['public']['Tables']['notebooks']['Row'] & { foto_url?: string | null };

export default function Index() {
  const [notebooks, setNotebooks] = useState<Notebook[]>([]);
  const [filterSecao, setFilterSecao] = useState('all');
  const [searchPatrimonio, setSearchPatrimonio] = useState('');
  const [loading, setLoading] = useState(true);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [viewItem, setViewItem] = useState<Notebook | null>(null);
  const navigate = useNavigate();
  const { sections } = useSections();

  const fetchNotebooks = async () => {
    setLoading(true);
    let query = supabase.from('notebooks').select('*').order('created_at', { ascending: false });

    if (filterSecao && filterSecao !== 'all') {
      query = query.eq('secao', filterSecao);
    }
    if (searchPatrimonio.trim()) {
      query = query.ilike('patrimonio', `%${searchPatrimonio.trim()}%`);
    }

    const { data, error } = await query;
    if (error) {
      toast.error('Erro ao carregar dados.');
    } else {
      setNotebooks((data as Notebook[]) || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchNotebooks();
  }, [filterSecao, searchPatrimonio]);

  const handleDelete = async () => {
    if (!deleteId) return;
    const { error } = await supabase.from('notebooks').delete().eq('id', deleteId);
    if (error) {
      toast.error('Erro ao excluir item.');
    } else {
      toast.success('Item excluído com sucesso.');
      fetchNotebooks();
    }
    setDeleteId(null);
  };

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <main className="container mx-auto py-6 px-4">
        <Card>
          <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <CardTitle className="flex items-center gap-2 text-xl">
              <Monitor className="h-5 w-5 text-primary" />
              Notebooks Cadastrados
            </CardTitle>
            <Button onClick={() => navigate('/itens/novo')}>
              <Plus className="h-4 w-4 mr-1" />
              Novo Notebook
            </Button>
          </CardHeader>
          <CardContent>
            {/* Filtros */}
            <div className="flex flex-col sm:flex-row gap-3 mb-6">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar por patrimônio..."
                    value={searchPatrimonio}
                    onChange={(e) => setSearchPatrimonio(e.target.value)}
                    className="pl-9"
                  />
                </div>
              </div>
              <Select value={filterSecao} onValueChange={setFilterSecao}>
                <SelectTrigger className="w-full sm:w-[220px]">
                  <SelectValue placeholder="Filtrar por seção" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as seções</SelectItem>
                  {sections.map((s) => (
                    <SelectItem key={s.id} value={s.name}>{s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Tabela */}
            {loading ? (
              <div className="flex justify-center py-12">
                <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
              </div>
            ) : notebooks.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Monitor className="h-12 w-12 mx-auto mb-3 opacity-30" />
                <p className="text-lg font-medium">Nenhum item encontrado</p>
                <p className="text-sm">Cadastre um novo notebook ou altere os filtros.</p>
              </div>
            ) : (
              <div className="rounded-md border overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead className="font-semibold w-12">Foto</TableHead>
                      <TableHead className="font-semibold">Patrimônio</TableHead>
                      <TableHead className="font-semibold">Modelo</TableHead>
                      <TableHead className="font-semibold">Seção</TableHead>
                      <TableHead className="font-semibold">Militar</TableHead>
                      <TableHead className="font-semibold text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {notebooks.map((nb) => (
                      <TableRow key={nb.id} className="hover:bg-muted/30">
                        <TableCell>
                          {nb.foto_url ? (
                            <img
                              src={nb.foto_url}
                              alt="Foto"
                              className="h-8 w-8 rounded object-cover cursor-pointer"
                              onClick={() => setViewItem(nb)}
                            />
                          ) : (
                            <div className="h-8 w-8 rounded bg-muted flex items-center justify-center">
                              <Monitor className="h-4 w-4 text-muted-foreground" />
                            </div>
                          )}
                        </TableCell>
                        <TableCell className="font-mono font-medium">{nb.patrimonio}</TableCell>
                        <TableCell>{nb.modelo}</TableCell>
                        <TableCell>{nb.secao}</TableCell>
                        <TableCell>{nb.militar}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button variant="ghost" size="icon" onClick={() => setViewItem(nb)} title="Visualizar">
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => navigate(`/itens/${nb.id}/editar`)} title="Editar">
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => setDeleteId(nb.id)} title="Excluir" className="text-destructive hover:text-destructive">
                              <Trash2 className="h-4 w-4" />
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
      </main>

      {/* Modal de visualização rápida */}
      <Dialog open={!!viewItem} onOpenChange={() => setViewItem(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Detalhes do Notebook</DialogTitle>
          </DialogHeader>
          {viewItem && (
            <div className="space-y-4">
              {viewItem.foto_url && (
                <div className="rounded-lg overflow-hidden border">
                  <img src={viewItem.foto_url} alt="Foto do notebook" className="w-full h-auto max-h-64 object-contain bg-muted" />
                </div>
              )}
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-muted-foreground text-xs">Patrimônio</p>
                  <p className="font-mono font-semibold">{viewItem.patrimonio}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Modelo</p>
                  <p className="font-semibold">{viewItem.modelo}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Seção</p>
                  <p className="font-semibold">{viewItem.secao}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Militar</p>
                  <p className="font-semibold">{viewItem.militar}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Criado em</p>
                  <p className="text-xs">{new Date(viewItem.created_at).toLocaleString('pt-BR')}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Atualizado em</p>
                  <p className="text-xs">{new Date(viewItem.updated_at).toLocaleString('pt-BR')}</p>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Diálogo de confirmação de exclusão */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir este notebook? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
