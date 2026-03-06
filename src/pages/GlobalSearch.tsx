import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Laptop, Package, Search, Pencil } from 'lucide-react';
import AppHeader from '@/components/AppHeader';

type Notebook = { id: string; patrimonio: string; modelo: string; secao: string; militar: string; status: string };
type Material = { id: string; patrimonio: string; codigo_material: string; numero_ficha: string; nome: string };

const statusColor = (s: string) => {
  if (s === 'Em uso') return 'default';
  if (s === 'Em manutenção') return 'destructive';
  if (s === 'Baixado') return 'secondary';
  return 'outline';
};

export default function GlobalSearch() {
  const [searchParams] = useSearchParams();
  const q = searchParams.get('q') || '';
  const navigate = useNavigate();
  const [notebooks, setNotebooks] = useState<Notebook[]>([]);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!q.trim()) { setNotebooks([]); setMaterials([]); setLoading(false); return; }
    const search = async () => {
      setLoading(true);
      const term = `%${q.trim()}%`;
      const [nbRes, matRes] = await Promise.all([
        supabase.from('notebooks').select('id, patrimonio, modelo, secao, militar, status')
          .or(`patrimonio.ilike.${term},modelo.ilike.${term},secao.ilike.${term},militar.ilike.${term},status.ilike.${term}`)
          .limit(50),
        supabase.from('materials').select('id, patrimonio, codigo_material, numero_ficha, nome')
          .or(`patrimonio.ilike.${term},codigo_material.ilike.${term},numero_ficha.ilike.${term},nome.ilike.${term}`)
          .limit(50),
      ]);
      setNotebooks((nbRes.data as Notebook[]) || []);
      setMaterials((matRes.data as Material[]) || []);
      setLoading(false);
    };
    search();
  }, [q]);

  const total = notebooks.length + materials.length;

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <main className="container mx-auto py-6 px-4 animate-in-page">
        <Card className="animate-in-card">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2 text-xl">
              <Search className="h-5 w-5 text-primary" />
              Resultados para "{q}"
            </CardTitle>
            {!loading && <p className="text-sm text-muted-foreground mt-1">{total} resultado(s) encontrado(s)</p>}
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-3">
                {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-12 w-full rounded-md" />)}
              </div>
            ) : (
              <Tabs defaultValue="notebooks">
                <TabsList className="mb-4">
                  <TabsTrigger value="notebooks" className="transition-hover">
                    <Laptop className="h-4 w-4 mr-1.5" />
                    Notebooks ({notebooks.length})
                  </TabsTrigger>
                  <TabsTrigger value="materials" className="transition-hover">
                    <Package className="h-4 w-4 mr-1.5" />
                    Material Carga ({materials.length})
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="notebooks" className="mt-0 animate-in-card">
                  {notebooks.length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground">
                      <Laptop className="h-12 w-12 mx-auto mb-3 opacity-20" />
                      <p>Nenhum notebook encontrado.</p>
                    </div>
                  ) : (
                    <div className="rounded-lg border overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-muted/40 hover:bg-muted/40">
                            <TableHead className="font-semibold">Patrimônio</TableHead>
                            <TableHead className="font-semibold">Modelo</TableHead>
                            <TableHead className="font-semibold hidden md:table-cell">Seção</TableHead>
                            <TableHead className="font-semibold hidden md:table-cell">Militar</TableHead>
                            <TableHead className="font-semibold">Status</TableHead>
                            <TableHead className="font-semibold text-right">Ações</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {notebooks.map((nb) => (
                            <TableRow key={nb.id} className="hover:bg-muted/20 transition-hover">
                              <TableCell className="font-mono font-medium text-sm">{nb.patrimonio}</TableCell>
                              <TableCell className="text-sm">{nb.modelo}</TableCell>
                              <TableCell className="text-sm hidden md:table-cell">{nb.secao}</TableCell>
                              <TableCell className="text-sm hidden md:table-cell">{nb.militar}</TableCell>
                              <TableCell><Badge variant={statusColor(nb.status) as any} className="text-xs">{nb.status}</Badge></TableCell>
                              <TableCell className="text-right">
                                <Button variant="ghost" size="icon" onClick={() => navigate(`/itens/${nb.id}/editar`)} className="h-8 w-8 transition-hover hover:text-primary">
                                  <Pencil className="h-4 w-4" />
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="materials" className="mt-0 animate-in-card">
                  {materials.length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground">
                      <Package className="h-12 w-12 mx-auto mb-3 opacity-20" />
                      <p>Nenhum material encontrado.</p>
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
                                <Button variant="ghost" size="icon" onClick={() => navigate(`/materiais/${m.id}/editar`)} className="h-8 w-8 transition-hover hover:text-primary">
                                  <Pencil className="h-4 w-4" />
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </TabsContent>
              </Tabs>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
