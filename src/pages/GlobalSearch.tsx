import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Monitor, Package, Search, Pencil, Eye } from 'lucide-react';
import AppHeader from '@/components/AppHeader';

type Notebook = {
  id: string;
  patrimonio: string;
  modelo: string;
  secao: string;
  militar: string;
  status: string;
};

type Material = {
  id: string;
  patrimonio: string;
  codigo_material: string;
  numero_ficha: string;
  nome: string;
};

export default function GlobalSearch() {
  const [searchParams] = useSearchParams();
  const q = searchParams.get('q') || '';
  const navigate = useNavigate();
  const [notebooks, setNotebooks] = useState<Notebook[]>([]);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!q.trim()) {
      setNotebooks([]);
      setMaterials([]);
      setLoading(false);
      return;
    }

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

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <main className="container mx-auto py-6 px-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Search className="h-5 w-5 text-primary" />
              Resultados para "{q}"
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex justify-center py-12">
                <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
              </div>
            ) : (
              <Tabs defaultValue="notebooks">
                <TabsList>
                  <TabsTrigger value="notebooks">
                    <Monitor className="h-4 w-4 mr-1" />
                    Notebooks ({notebooks.length})
                  </TabsTrigger>
                  <TabsTrigger value="materials">
                    <Package className="h-4 w-4 mr-1" />
                    Material Carga ({materials.length})
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="notebooks" className="mt-4">
                  {notebooks.length === 0 ? (
                    <p className="text-center py-8 text-muted-foreground">Nenhum notebook encontrado.</p>
                  ) : (
                    <div className="rounded-md border overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-muted/50">
                            <TableHead>Patrimônio</TableHead>
                            <TableHead>Modelo</TableHead>
                            <TableHead>Seção</TableHead>
                            <TableHead>Militar</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead className="text-right">Ações</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {notebooks.map((nb) => (
                            <TableRow key={nb.id}>
                              <TableCell className="font-mono font-medium">{nb.patrimonio}</TableCell>
                              <TableCell>{nb.modelo}</TableCell>
                              <TableCell>{nb.secao}</TableCell>
                              <TableCell>{nb.militar}</TableCell>
                              <TableCell><Badge variant="outline">{nb.status}</Badge></TableCell>
                              <TableCell className="text-right">
                                <Button variant="ghost" size="icon" onClick={() => navigate(`/itens/${nb.id}/editar`)}>
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

                <TabsContent value="materials" className="mt-4">
                  {materials.length === 0 ? (
                    <p className="text-center py-8 text-muted-foreground">Nenhum material encontrado.</p>
                  ) : (
                    <div className="rounded-md border overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-muted/50">
                            <TableHead>Patrimônio</TableHead>
                            <TableHead>Código</TableHead>
                            <TableHead>Nº Ficha</TableHead>
                            <TableHead>Nome</TableHead>
                            <TableHead className="text-right">Ações</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {materials.map((m) => (
                            <TableRow key={m.id}>
                              <TableCell className="font-mono font-medium">{m.patrimonio}</TableCell>
                              <TableCell className="font-mono">{m.codigo_material}</TableCell>
                              <TableCell className="font-mono">{m.numero_ficha}</TableCell>
                              <TableCell>{m.nome}</TableCell>
                              <TableCell className="text-right">
                                <Button variant="ghost" size="icon" onClick={() => navigate(`/materiais/${m.id}/editar`)}>
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
