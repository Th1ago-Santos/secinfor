import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
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

    if (searchNome.trim()) {
      query = query.ilike('nome', `%${searchNome.trim()}%`);
    }

    const { data, error } = await query;
    if (error) {
      toast.error('Erro ao carregar materiais.');
    } else {
      setMaterials((data as Material[]) || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchMaterials();
  }, [searchNome]);

  const handleDelete = async () => {
    if (!deleteId) return;
    const { error } = await supabase.from('materials').delete().eq('id', deleteId);
    if (error) {
      toast.error('Erro ao excluir material.');
    } else {
      toast.success('Material excluído com sucesso.');
      fetchMaterials();
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
              <Package className="h-5 w-5 text-primary" />
              Material Carga da Seção
            </CardTitle>
            <Button onClick={() => navigate('/materiais/novo')}>
              <Plus className="h-4 w-4 mr-1" />
              Novo Material
            </Button>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col sm:flex-row gap-3 mb-6">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar por nome..."
                    value={searchNome}
                    onChange={(e) => setSearchNome(e.target.value)}
                    className="pl-9"
                  />
                </div>
              </div>
            </div>

            {loading ? (
              <div className="flex justify-center py-12">
                <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
              </div>
            ) : materials.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Package className="h-12 w-12 mx-auto mb-3 opacity-30" />
                <p className="text-lg font-medium">Nenhum material encontrado</p>
                <p className="text-sm">Cadastre um novo material ou altere a busca.</p>
              </div>
            ) : (
              <div className="rounded-md border overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead className="font-semibold">Patrimônio</TableHead>
                      <TableHead className="font-semibold">Código do Material</TableHead>
                      <TableHead className="font-semibold">Nº da Ficha</TableHead>
                      <TableHead className="font-semibold">Nome</TableHead>
                      <TableHead className="font-semibold text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {materials.map((m) => (
                      <TableRow key={m.id} className="hover:bg-muted/30">
                        <TableCell className="font-mono font-medium">{m.patrimonio}</TableCell>
                        <TableCell className="font-mono">{m.codigo_material}</TableCell>
                        <TableCell className="font-mono">{m.numero_ficha}</TableCell>
                        <TableCell>{m.nome}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button variant="ghost" size="icon" onClick={() => navigate(`/materiais/${m.id}/editar`)} title="Editar">
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => setDeleteId(m.id)} title="Excluir" className="text-destructive hover:text-destructive">
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

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir este material? Esta ação não pode ser desfeita.
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
