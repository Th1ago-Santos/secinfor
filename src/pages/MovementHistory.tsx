import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
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
      // Fetch item info
      if (itemTipo === 'notebook') {
        const { data } = await supabase.from('notebooks').select('patrimonio, modelo').eq('id', id!).single();
        if (data) setItemName(`${(data as any).patrimonio} - ${(data as any).modelo}`);
      } else {
        const { data } = await supabase.from('materials').select('patrimonio, nome').eq('id', id!).single();
        if (data) setItemName(`${(data as any).patrimonio} - ${(data as any).nome}`);
      }

      // Fetch movements
      const { data: movs } = await supabase
        .from('movements')
        .select('*')
        .eq('item_id', id!)
        .eq('item_tipo', itemTipo)
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
      <main className="container mx-auto py-6 px-4 max-w-4xl">
        <Button variant="ghost" onClick={() => navigate(backPath)} className="mb-4">
          <ArrowLeft className="h-4 w-4 mr-1" />
          Voltar
        </Button>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <History className="h-5 w-5 text-primary" />
              Histórico de Movimentações
            </CardTitle>
            {itemName && <p className="text-sm text-muted-foreground mt-1">{itemName}</p>}
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex justify-center py-12">
                <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
              </div>
            ) : movements.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <History className="h-12 w-12 mx-auto mb-3 opacity-30" />
                <p className="text-lg font-medium">Nenhuma movimentação registrada</p>
              </div>
            ) : (
              <div className="rounded-md border overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead className="font-semibold">Data/Hora</TableHead>
                      <TableHead className="font-semibold">Evento</TableHead>
                      <TableHead className="font-semibold">Seção Origem</TableHead>
                      <TableHead className="font-semibold">Seção Destino</TableHead>
                      <TableHead className="font-semibold">Resp. Anterior</TableHead>
                      <TableHead className="font-semibold">Resp. Novo</TableHead>
                      <TableHead className="font-semibold">Observação</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {movements.map((m) => (
                      <TableRow key={m.id}>
                        <TableCell className="text-xs whitespace-nowrap">
                          {new Date(m.data_hora).toLocaleString('pt-BR')}
                        </TableCell>
                        <TableCell>
                          <Badge variant={eventColor(m.tipo_evento) as any}>{m.tipo_evento}</Badge>
                        </TableCell>
                        <TableCell>{m.secao_origem || '—'}</TableCell>
                        <TableCell>{m.secao_destino || '—'}</TableCell>
                        <TableCell>{m.responsavel_anterior || '—'}</TableCell>
                        <TableCell>{m.responsavel_novo || '—'}</TableCell>
                        <TableCell className="max-w-[200px] truncate">{m.observacao || '—'}</TableCell>
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
