import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { Plus, Pencil, Trash2, Search, Package } from 'lucide-react';
import { toast } from 'sonner';
import AppHeader from '@/components/AppHeader';

type Material = {
  id: string;
  patrimonio: string;
  codigo_material: string;
  numero_ficha: string;
  nome: string;
  created_at: string;
  updated_at: string;
};

export default function Materials() {
  const [materials, setMaterials] = useState<Material[]>([]);
  const [searchNome, setSearchNome] = useState('');
  const [loading, setLoading] = useState(true);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const navigate = useNavigate();

  const fetchMaterials = async () => {
    setLoading(true);
    let query = supabase.from('materials').select('*').order('created_at', { ascending: false });
    if (searchNome.trim()) query = query.ilike('nome', `%${searchNome.trim()}%`);
    const { data, error } = await query;
    if (error) toast.error('Erro ao carregar materiais.');
    else setMaterials((data as Material[]) || []);
    setLoading(false);
  };

  useEffect(() => { fetchMaterials(); }, [searchNome]);

  const handleDelete = async () => {
    if (!deleteId) return;
    const { error } = await supabase.from('materials').delete().eq('id', deleteId);
    if (error) toast.error('Erro ao excluir material.');
    else { toast.success('Material excluído com sucesso.'); fetchMaterials(); }
    setDeleteId(null);
  };

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <main className="container mx-auto py-6 px-4 animate-in-page">
        <Card className="animate-in-card">
          <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4">
            <CardTitle className="flex items-center gap-2 text-xl">
              <Package className="h-5 w-5 text-primary" />
              Material Carga da Seção
            </CardTitle>
            <Button onClick={() => navigate('/materiais/novo')} className="transition-hover">
              <Plus className="h-4 w-4 mr-1.5" />
              Novo Material
            </Button>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col sm:flex-row gap-3 mb-5">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Buscar por nome..." value={searchNome} onChange={(e) => setSearchNome(e.target.value)} className="pl-9 h-9" />
              </div>
            </div>

            {loading ? (
              <div className="space-y-3">
                {[...Array(5)].map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full rounded-md" />
                ))}
              </div>
            ) : materials.length === 0 ? (
              <div className="text-center py-16 text-muted-foreground animate-in-card">
                <Package className="h-14 w-14 mx-auto mb-4 opacity-20" />
                <p className="text-lg font-medium">Nenhum material encontrado</p>
                <p className="text-sm mt-1">Cadastre um novo material ou altere a busca.</p>
              </div>
            ) : (
              <div className="rounded-lg border overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/40 hover:bg-muted/40">
                      <TableHead className="font-semibold">Patrimônio</TableHead>
                      <TableHead className="font-semibold">Código</TableHead>
                      <TableHead className="font-semibold hidden sm:table-cell">Nº Ficha</TableHead>
                      <TableHead className="font-semibold">Nome</TableHead>
                      <TableHead className="font-semibold text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {materials.map((m) => (
                      <TableRow key={m.id} className="hover:bg-muted/20 transition-hover">
                        <TableCell className="font-mono font-medium text-sm">{m.patrimonio}</TableCell>
                        <TableCell className="font-mono text-sm">{m.codigo_material}</TableCell>
                        <TableCell className="font-mono text-sm hidden sm:table-cell">{m.numero_ficha}</TableCell>
                        <TableCell className="text-sm">{m.nome}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-0.5">
                            <Button variant="ghost" size="icon" onClick={() => navigate(`/materiais/${m.id}/editar`)} title="Editar" className="h-8 w-8 transition-hover hover:text-primary">
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => setDeleteId(m.id)} title="Excluir" className="h-8 w-8 text-destructive hover:text-destructive transition-hover">
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

            {!loading && materials.length > 0 && (
              <p className="text-xs text-muted-foreground mt-3">{materials.length} registro(s) encontrado(s)</p>
            )}
          </CardContent>
        </Card>
      </main>

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>Tem certeza que deseja excluir este material? Esta ação não pode ser desfeita.</AlertDialogDescription>
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
