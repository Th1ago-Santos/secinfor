import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowLeft, History } from 'lucide-react';


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

  const backPath = itemTipo === 'notebook' ? '/notebooks' : '/materiais';

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <main className="container mx-auto py-6 px-4 max-w-4xl animate-in-page">
        <Button variant="ghost" onClick={() => navigate(backPath)} className="mb-4 transition-all duration-200 hover:bg-muted/50">
          <ArrowLeft className="h-4 w-4 mr-1" />
          Voltar
        </Button>

        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2.5 text-lg">
              <div className="p-2 rounded-lg bg-primary/10">
                <History className="h-4 w-4 text-primary" />
              </div>
              Histórico de Movimentações
            </CardTitle>
            {itemName && <p className="text-sm text-muted-foreground mt-1 font-mono">{itemName}</p>}
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-2">
                {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-14 w-full rounded-lg" />)}
              </div>
            ) : movements.length === 0 ? (
              <div className="text-center py-20 text-muted-foreground animate-in-card">
                <div className="mx-auto w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mb-4">
                  <History className="h-7 w-7 text-muted-foreground/40" />
                </div>
                <p className="text-base font-semibold">Nenhuma movimentação registrada</p>
                <p className="text-sm mt-1">Alterações de seção, responsável ou status aparecerão aqui.</p>
              </div>
            ) : (
              <div className="rounded-xl border overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50 hover:bg-muted/50 border-b">
                      <TableHead className="font-semibold text-xs uppercase tracking-wider">Data/Hora</TableHead>
                      <TableHead className="font-semibold text-xs uppercase tracking-wider">Evento</TableHead>
                      <TableHead className="font-semibold text-xs uppercase tracking-wider hidden md:table-cell">Seção Origem</TableHead>
                      <TableHead className="font-semibold text-xs uppercase tracking-wider hidden md:table-cell">Seção Destino</TableHead>
                      <TableHead className="font-semibold text-xs uppercase tracking-wider hidden lg:table-cell">Resp. Anterior</TableHead>
                      <TableHead className="font-semibold text-xs uppercase tracking-wider hidden lg:table-cell">Resp. Novo</TableHead>
                      <TableHead className="font-semibold text-xs uppercase tracking-wider hidden sm:table-cell">Observação</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {movements.map((m) => (
                      <TableRow key={m.id} className="hover:bg-muted/30 transition-colors duration-150">
                        <TableCell className="text-xs whitespace-nowrap text-muted-foreground">
                          {new Date(m.data_hora).toLocaleString('pt-BR')}
                        </TableCell>
                        <TableCell>
                          <Badge variant={eventColor(m.tipo_evento) as any} className="text-[10px] font-medium">{m.tipo_evento}</Badge>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground hidden md:table-cell">{m.secao_origem || '—'}</TableCell>
                        <TableCell className="text-sm text-muted-foreground hidden md:table-cell">{m.secao_destino || '—'}</TableCell>
                        <TableCell className="text-sm text-muted-foreground hidden lg:table-cell">{m.responsavel_anterior || '—'}</TableCell>
                        <TableCell className="text-sm text-muted-foreground hidden lg:table-cell">{m.responsavel_novo || '—'}</TableCell>
                        <TableCell className="max-w-[180px] truncate text-sm text-muted-foreground hidden sm:table-cell">{m.observacao || '—'}</TableCell>
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
