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
    <div className="container mx-auto py-6 px-4 animate-in-page">
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2.5 text-lg">
              <div className="p-2 rounded-lg bg-primary/10">
                <Search className="h-4 w-4 text-primary" />
              </div>
              Resultados para "{q}"
            </CardTitle>
            {!loading && <p className="text-sm text-muted-foreground mt-1 font-medium">{total} resultado(s) encontrado(s)</p>}
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-2">
                {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-14 w-full rounded-lg" />)}
              </div>
            ) : (
              <Tabs defaultValue="notebooks">
                <TabsList className="mb-4">
                  <TabsTrigger value="notebooks" className="transition-all duration-200">
                    <Laptop className="h-3.5 w-3.5 mr-1.5" />
                    Notebooks ({notebooks.length})
                  </TabsTrigger>
                  <TabsTrigger value="materials" className="transition-all duration-200">
                    <Package className="h-3.5 w-3.5 mr-1.5" />
                    Material Carga ({materials.length})
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="notebooks" className="mt-0 animate-in-card">
                  {notebooks.length === 0 ? (
                    <div className="text-center py-16 text-muted-foreground">
                      <div className="mx-auto w-14 h-14 rounded-2xl bg-muted flex items-center justify-center mb-3">
                        <Laptop className="h-6 w-6 text-muted-foreground/40" />
                      </div>
                      <p className="font-medium">Nenhum notebook encontrado.</p>
                    </div>
                  ) : (
                    <div className="rounded-xl border overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-muted/50 hover:bg-muted/50 border-b">
                            <TableHead className="font-semibold text-xs uppercase tracking-wider">Patrimônio</TableHead>
                            <TableHead className="font-semibold text-xs uppercase tracking-wider">Modelo</TableHead>
                            <TableHead className="font-semibold text-xs uppercase tracking-wider hidden md:table-cell">Seção</TableHead>
                            <TableHead className="font-semibold text-xs uppercase tracking-wider hidden md:table-cell">Militar</TableHead>
                            <TableHead className="font-semibold text-xs uppercase tracking-wider">Status</TableHead>
                            <TableHead className="font-semibold text-xs uppercase tracking-wider text-right">Ações</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {notebooks.map((nb) => (
                            <TableRow key={nb.id} className="hover:bg-muted/30 transition-colors duration-150 group">
                              <TableCell className="font-mono font-semibold text-sm">{nb.patrimonio}</TableCell>
                              <TableCell className="text-sm">{nb.modelo}</TableCell>
                              <TableCell className="text-sm text-muted-foreground hidden md:table-cell">{nb.secao}</TableCell>
                              <TableCell className="text-sm text-muted-foreground hidden md:table-cell">{nb.militar}</TableCell>
                              <TableCell><Badge variant={statusColor(nb.status) as any} className="text-[10px] font-medium">{nb.status}</Badge></TableCell>
                              <TableCell className="text-right">
                                <Button variant="ghost" size="icon" onClick={() => navigate(`/itens/${nb.id}/editar`)} className="h-8 w-8 opacity-70 group-hover:opacity-100 hover:text-primary hover:bg-primary/10 transition-all duration-200">
                                  <Pencil className="h-3.5 w-3.5" />
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
                    <div className="text-center py-16 text-muted-foreground">
                      <div className="mx-auto w-14 h-14 rounded-2xl bg-muted flex items-center justify-center mb-3">
                        <Package className="h-6 w-6 text-muted-foreground/40" />
                      </div>
                      <p className="font-medium">Nenhum material encontrado.</p>
                    </div>
                  ) : (
                    <div className="rounded-xl border overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-muted/50 hover:bg-muted/50 border-b">
                            <TableHead className="font-semibold text-xs uppercase tracking-wider">Patrimônio</TableHead>
                            <TableHead className="font-semibold text-xs uppercase tracking-wider">Código</TableHead>
                            <TableHead className="font-semibold text-xs uppercase tracking-wider hidden sm:table-cell">Nº Ficha</TableHead>
                            <TableHead className="font-semibold text-xs uppercase tracking-wider">Nome</TableHead>
                            <TableHead className="font-semibold text-xs uppercase tracking-wider text-right">Ações</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {materials.map((m) => (
                            <TableRow key={m.id} className="hover:bg-muted/30 transition-colors duration-150 group">
                              <TableCell className="font-mono font-semibold text-sm">{m.patrimonio}</TableCell>
                              <TableCell className="font-mono text-sm text-muted-foreground">{m.codigo_material}</TableCell>
                              <TableCell className="font-mono text-sm text-muted-foreground hidden sm:table-cell">{m.numero_ficha}</TableCell>
                              <TableCell className="text-sm">{m.nome}</TableCell>
                              <TableCell className="text-right">
                                <Button variant="ghost" size="icon" onClick={() => navigate(`/materiais/${m.id}/editar`)} className="h-8 w-8 opacity-70 group-hover:opacity-100 hover:text-primary hover:bg-primary/10 transition-all duration-200">
                                  <Pencil className="h-3.5 w-3.5" />
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
    </div>
  );
}
