import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowLeft, History } from 'lucide-react';
import AppHeader from '@/components/AppHeader';

type Movement = {
  id: string;
  item_tipo: string;
  item_id: string;
  data_hora: string;
  tipo_evento: string;
  secao_origem: string | null;
  secao_destino: string | null;
  responsavel_anterior: string | null;
  responsavel_novo: string | null;
  observacao: string | null;
  created_at: string;
};

export default function MovementHistory() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = window.location.pathname;
  const [movements, setMovements] = useState<Movement[]>([]);
  const [loading, setLoading] = useState(true);
  const [itemName, setItemName] = useState('');

  const itemTipo = location.includes('materiais') ? 'material' : 'notebook';

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      if (itemTipo === 'notebook') {
        const { data } = await supabase.from('notebooks').select('patrimonio, modelo').eq('id', id!).single();
        if (data) setItemName(`${(data as any).patrimonio} - ${(data as any).modelo}`);
      } else {
        const { data } = await supabase.from('materials').select('patrimonio, nome').eq('id', id!).single();
        if (data) setItemName(`${(data as any).patrimonio} - ${(data as any).nome}`);
      }
      const { data: movs } = await supabase
        .from('movements').select('*').eq('item_id', id!).eq('item_tipo', itemTipo)
        .order('data_hora', { ascending: false });
      setMovements((movs as Movement[]) || []);
      setLoading(false);
    };
    fetchData();
  }, [id, itemTipo]);

  const eventColor = (tipo: string) => {
    if (tipo.includes('Manutenção iniciada')) return 'destructive';
    if (tipo.includes('Manutenção finalizada')) return 'default';
    if (tipo.includes('Transferência')) return 'secondary';
    if (tipo.includes('Baixa')) return 'destructive';
    return 'outline';
  };

  const backPath = itemTipo === 'notebook' ? '/' : '/materiais';

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <main className="container mx-auto py-6 px-4 max-w-4xl animate-in-page">
        <Button variant="ghost" onClick={() => navigate(backPath)} className="mb-4 transition-hover">
          <ArrowLeft className="h-4 w-4 mr-1" />
          Voltar
        </Button>

        <Card className="animate-in-card">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2 text-xl">
              <History className="h-5 w-5 text-primary" />
              Histórico de Movimentações
            </CardTitle>
            {itemName && <p className="text-sm text-muted-foreground mt-1 font-mono">{itemName}</p>}
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-3">
                {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-12 w-full rounded-md" />)}
              </div>
            ) : movements.length === 0 ? (
              <div className="text-center py-16 text-muted-foreground animate-in-card">
                <History className="h-14 w-14 mx-auto mb-4 opacity-20" />
                <p className="text-lg font-medium">Nenhuma movimentação registrada</p>
                <p className="text-sm mt-1">Alterações de seção, responsável ou status aparecerão aqui.</p>
              </div>
            ) : (
              <div className="rounded-lg border overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/40 hover:bg-muted/40">
                      <TableHead className="font-semibold">Data/Hora</TableHead>
                      <TableHead className="font-semibold">Evento</TableHead>
                      <TableHead className="font-semibold hidden md:table-cell">Seção Origem</TableHead>
                      <TableHead className="font-semibold hidden md:table-cell">Seção Destino</TableHead>
                      <TableHead className="font-semibold hidden lg:table-cell">Resp. Anterior</TableHead>
                      <TableHead className="font-semibold hidden lg:table-cell">Resp. Novo</TableHead>
                      <TableHead className="font-semibold hidden sm:table-cell">Observação</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {movements.map((m) => (
                      <TableRow key={m.id} className="hover:bg-muted/20 transition-hover">
                        <TableCell className="text-xs whitespace-nowrap">
                          {new Date(m.data_hora).toLocaleString('pt-BR')}
                        </TableCell>
                        <TableCell>
                          <Badge variant={eventColor(m.tipo_evento) as any} className="text-xs">{m.tipo_evento}</Badge>
                        </TableCell>
                        <TableCell className="text-sm hidden md:table-cell">{m.secao_origem || '—'}</TableCell>
                        <TableCell className="text-sm hidden md:table-cell">{m.secao_destino || '—'}</TableCell>
                        <TableCell className="text-sm hidden lg:table-cell">{m.responsavel_anterior || '—'}</TableCell>
                        <TableCell className="text-sm hidden lg:table-cell">{m.responsavel_novo || '—'}</TableCell>
                        <TableCell className="max-w-[180px] truncate text-sm hidden sm:table-cell">{m.observacao || '—'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
