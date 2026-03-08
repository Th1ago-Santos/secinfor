import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent } from '@/components/ui/card';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { Plus, Pencil, Trash2, Search, Package, History, ChevronLeft, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';
import PageTransition from '@/components/PageTransition';
import PageHeader from '@/components/PageHeader';
import type { Material } from '@/types';

export default function Materials() {
  const [searchNome, setSearchNome] = useState('');
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const PAGE_SIZE = 50;
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data, isLoading: loading } = useQuery({
    queryKey: ['materials', searchNome, page],
    queryFn: async () => {
      let query = supabase.from('materials').select('*', { count: 'exact' }).order('created_at', { ascending: false });
      if (searchNome.trim()) query = query.ilike('nome', `%${searchNome.trim()}%`);
      query = query.range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);
      const { data, error, count } = await query;
      if (error) { toast.error('Erro ao carregar materiais.'); throw error; }
      return { materials: (data as Material[]) || [], totalCount: count || 0 };
    },
    staleTime: 15_000,
  });

  const materials = data?.materials || [];
  const totalCount = data?.totalCount || 0;
  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  const handleDelete = async () => {
    if (!deleteId) return;
    const { error } = await supabase.from('materials').delete().eq('id', deleteId);
    if (error) toast.error('Erro ao excluir material.');
    else {
      toast.success('Material excluído com sucesso.');
      queryClient.invalidateQueries({ queryKey: ['materials'] });
    }
    setDeleteId(null);
  };

  return (
    <PageTransition>
      <div className="container mx-auto py-6 px-4">
        <PageHeader
          icon={Package}
          title="Material Carga da Seção"
          description={`${totalCount} registro(s)`}
          actions={
            <Button onClick={() => navigate('/materiais/novo')} className="gradient-primary border-0 shadow-glow hover:opacity-90 transition-all duration-300">
              <Plus className="h-4 w-4 mr-1.5" />
              Novo Material
            </Button>
          }
        />

        <Card className="shadow-card border-border/50">
          <CardContent className="pt-5">
            <div className="flex flex-col sm:flex-row gap-3 mb-5">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/50" />
                <Input placeholder="Buscar por nome..." value={searchNome} onChange={(e) => { setSearchNome(e.target.value); setPage(0); }} className="pl-9 h-9 bg-muted/30 border-border/50 focus:bg-background focus:border-primary/50 focus:shadow-glow transition-all duration-300" />
              </div>
            </div>

            {loading ? (
              <div className="space-y-2">
                {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-14 w-full rounded-xl" />)}
              </div>
            ) : materials.length === 0 ? (
              <div className="text-center py-20 text-muted-foreground">
                <div className="mx-auto w-16 h-16 rounded-2xl bg-muted/60 flex items-center justify-center mb-4">
                  <Package className="h-7 w-7 text-muted-foreground/30" />
                </div>
                <p className="text-base font-semibold">Nenhum material encontrado</p>
                <p className="text-sm mt-1 text-muted-foreground/70">Cadastre um novo material ou altere a busca.</p>
              </div>
            ) : (
              <>
                {/* Desktop table */}
                <div className="rounded-xl border border-border/50 overflow-x-auto hidden sm:block">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/40 hover:bg-muted/40 border-b border-border/50">
                        <TableHead className="font-semibold text-[10px] uppercase tracking-widest text-muted-foreground">Patrimônio</TableHead>
                        <TableHead className="font-semibold text-[10px] uppercase tracking-widest text-muted-foreground">Código</TableHead>
                        <TableHead className="font-semibold text-[10px] uppercase tracking-widest text-muted-foreground">Nº Ficha</TableHead>
                        <TableHead className="font-semibold text-[10px] uppercase tracking-widest text-muted-foreground">Nome</TableHead>
                        <TableHead className="font-semibold text-[10px] uppercase tracking-widest text-muted-foreground text-right">Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {materials.map((m) => (
                        <TableRow key={m.id} className="hover:bg-muted/30 transition-colors duration-200 group border-b border-border/30 last:border-0">
                          <TableCell className="font-mono font-semibold text-sm">{m.patrimonio}</TableCell>
                          <TableCell className="font-mono text-sm text-muted-foreground">{m.codigo_material}</TableCell>
                          <TableCell className="font-mono text-sm text-muted-foreground">{m.numero_ficha}</TableCell>
                          <TableCell className="text-sm">{m.nome}</TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-0.5 opacity-60 group-hover:opacity-100 transition-opacity duration-200">
                              <Button variant="ghost" size="icon" onClick={() => navigate(`/materiais/${m.id}/historico`)} title="Histórico" className="h-8 w-8 hover:text-primary hover:bg-primary/10 rounded-lg"><History className="h-3.5 w-3.5" /></Button>
                              <Button variant="ghost" size="icon" onClick={() => navigate(`/materiais/${m.id}/editar`)} title="Editar" className="h-8 w-8 hover:text-primary hover:bg-primary/10 rounded-lg"><Pencil className="h-3.5 w-3.5" /></Button>
                              <Button variant="ghost" size="icon" onClick={() => setDeleteId(m.id)} title="Excluir" className="h-8 w-8 text-destructive/60 hover:text-destructive hover:bg-destructive/10 rounded-lg"><Trash2 className="h-3.5 w-3.5" /></Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                {/* Mobile card view */}
                <div className="space-y-3 sm:hidden">
                  {materials.map((m) => (
                    <Card key={m.id} className="border-border/50 shadow-sm">
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-mono font-semibold text-sm">{m.patrimonio}</span>
                          <span className="font-mono text-xs text-muted-foreground">{m.codigo_material}</span>
                        </div>
                        <p className="text-sm truncate">{m.nome}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">Ficha: {m.numero_ficha}</p>
                        <div className="flex justify-end gap-1 mt-3 pt-2 border-t border-border/30">
                          <Button variant="ghost" size="icon" onClick={() => navigate(`/materiais/${m.id}/historico`)} className="h-8 w-8"><History className="h-3.5 w-3.5" /></Button>
                          <Button variant="ghost" size="icon" onClick={() => navigate(`/materiais/${m.id}/editar`)} className="h-8 w-8"><Pencil className="h-3.5 w-3.5" /></Button>
                          <Button variant="ghost" size="icon" onClick={() => setDeleteId(m.id)} className="h-8 w-8 text-destructive/60"><Trash2 className="h-3.5 w-3.5" /></Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between mt-4 pt-3 border-t border-border/50">
                <p className="text-xs text-muted-foreground">
                  Página {page + 1} de {totalPages} ({totalCount} registros)
                </p>
                <div className="flex gap-1">
                  <Button variant="outline" size="icon" className="h-8 w-8" disabled={page === 0} onClick={() => setPage(p => p - 1)}>
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button variant="outline" size="icon" className="h-8 w-8" disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)}>
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

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
    </PageTransition>
  );
}
