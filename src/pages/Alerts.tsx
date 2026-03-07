import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Bell, CheckCircle, AlertTriangle, Info, XCircle, RefreshCw, Printer, Download } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import AppHeader from '@/components/AppHeader';

type Alert = {
  id: string;
  tipo: string;
  nivel: string;
  mensagem: string;
  item_id: string | null;
  item_tipo: string | null;
  item_patrimonio: string | null;
  secao: string | null;
  status: string;
  created_at: string;
};

const nivelConfig: Record<string, { icon: React.ElementType; color: string; badge: string }> = {
  informativo: { icon: Info, color: 'text-blue-400', badge: 'outline' },
  atencao: { icon: AlertTriangle, color: 'text-warning', badge: 'secondary' },
  critico: { icon: XCircle, color: 'text-destructive', badge: 'destructive' },
};

export default function Alerts() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [filterNivel, setFilterNivel] = useState('all');
  const [filterStatus, setFilterStatus] = useState('ativo');

  const fetchAlerts = async () => {
    setLoading(true);
    let query = supabase.from('alerts').select('*').order('created_at', { ascending: false });
    if (filterStatus !== 'all') query = query.eq('status', filterStatus);
    if (filterNivel !== 'all') query = query.eq('nivel', filterNivel);
    const { data } = await query.limit(200);
    setAlerts((data as Alert[]) || []);
    setLoading(false);
  };

  useEffect(() => { fetchAlerts(); }, [filterNivel, filterStatus]);

  const generateAlerts = async () => {
    setGenerating(true);
    const newAlerts: Omit<Alert, 'id' | 'created_at'>[] = [];

    // Notebooks em manutenção há mais de 30 dias
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const { data: manutNbs } = await supabase.from('notebooks').select('id, patrimonio, secao, data_entrada_manutencao')
      .eq('status', 'Em manutenção');
    (manutNbs as any[] || []).forEach(nb => {
      if (nb.data_entrada_manutencao && new Date(nb.data_entrada_manutencao) < thirtyDaysAgo) {
        newAlerts.push({
          tipo: 'Manutenção prolongada',
          nivel: 'atencao',
          mensagem: `Notebook ${nb.patrimonio} em manutenção há mais de 30 dias`,
          item_id: nb.id,
          item_tipo: 'notebook',
          item_patrimonio: nb.patrimonio,
          secao: nb.secao,
          status: 'ativo',
        });
      }
    });

    // Notebooks sem foto
    const { data: noPhotoNbs } = await supabase.from('notebooks').select('id, patrimonio, secao')
      .is('foto_url', null);
    (noPhotoNbs as any[] || []).forEach(nb => {
      newAlerts.push({
        tipo: 'Sem foto',
        nivel: 'informativo',
        mensagem: `Notebook ${nb.patrimonio} sem foto cadastrada`,
        item_id: nb.id,
        item_tipo: 'notebook',
        item_patrimonio: nb.patrimonio,
        secao: nb.secao,
        status: 'ativo',
      });
    });

    // Notebooks baixados ainda vinculados a seção
    const { data: baixados } = await supabase.from('notebooks').select('id, patrimonio, secao')
      .eq('status', 'Baixado').not('secao', 'is', null);
    (baixados as any[] || []).forEach(nb => {
      newAlerts.push({
        tipo: 'Baixado com seção',
        nivel: 'atencao',
        mensagem: `Notebook ${nb.patrimonio} está baixado mas ainda vinculado à seção ${nb.secao}`,
        item_id: nb.id,
        item_tipo: 'notebook',
        item_patrimonio: nb.patrimonio,
        secao: nb.secao,
        status: 'ativo',
      });
    });

    if (newAlerts.length > 0) {
      // Clear old auto-generated active alerts before inserting new ones
      await supabase.from('alerts').delete().eq('status', 'ativo');
      const { error } = await supabase.from('alerts').insert(newAlerts as any);
      if (error) toast.error('Erro ao gerar alertas.');
      else toast.success(`${newAlerts.length} alerta(s) gerado(s).`);
    } else {
      await supabase.from('alerts').delete().eq('status', 'ativo');
      toast.info('Nenhum alerta identificado.');
    }

    fetchAlerts();
    setGenerating(false);
  };

  const resolveAlert = async (id: string) => {
    await supabase.from('alerts').update({ status: 'resolvido', resolvido_em: new Date().toISOString(), resolvido_por: user?.id } as any).eq('id', id);
    toast.success('Alerta marcado como resolvido.');
    fetchAlerts();
  };

  const exportCSV = () => {
    const header = 'Data;Nível;Tipo;Mensagem;Patrimônio;Seção;Status\n';
    const rows = alerts.map(a =>
      `${new Date(a.created_at).toLocaleString('pt-BR')};${a.nivel};${a.tipo};${a.mensagem};${a.item_patrimonio || ''};${a.secao || ''};${a.status}`
    ).join('\n');
    const blob = new Blob([header + rows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `alertas_${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <main className="container mx-auto py-6 px-4 animate-in-page">
        <Card className="animate-in-card">
          <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-4">
            <CardTitle className="flex items-center gap-2 text-xl">
              <Bell className="h-5 w-5 text-primary" />
              Alertas do Sistema
            </CardTitle>
            <div className="flex gap-2 flex-wrap">
              <Button size="sm" onClick={generateAlerts} disabled={generating} className="transition-hover">
                <RefreshCw className={`h-4 w-4 mr-1.5 ${generating ? 'animate-spin' : ''}`} />
                {generating ? 'Gerando...' : 'Gerar Alertas'}
              </Button>
              <Button variant="outline" size="sm" onClick={exportCSV} disabled={alerts.length === 0} className="transition-hover">
                <Download className="h-4 w-4 mr-1.5" />CSV
              </Button>
              <Button variant="outline" size="sm" onClick={() => window.print()} disabled={alerts.length === 0} className="transition-hover">
                <Printer className="h-4 w-4 mr-1.5" />Imprimir
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col sm:flex-row gap-3 mb-5 no-print">
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-full sm:w-[160px] h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="ativo">Ativos</SelectItem>
                  <SelectItem value="resolvido">Resolvidos</SelectItem>
                </SelectContent>
              </Select>
              <Select value={filterNivel} onValueChange={setFilterNivel}>
                <SelectTrigger className="w-full sm:w-[160px] h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os níveis</SelectItem>
                  <SelectItem value="informativo">Informativo</SelectItem>
                  <SelectItem value="atencao">Atenção</SelectItem>
                  <SelectItem value="critico">Crítico</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {loading ? (
              <div className="space-y-3">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-12 w-full rounded-md" />)}</div>
            ) : alerts.length === 0 ? (
              <div className="text-center py-16 text-muted-foreground animate-in-card">
                <Bell className="h-14 w-14 mx-auto mb-4 opacity-20" />
                <p className="text-lg font-medium">Nenhum alerta encontrado</p>
                <p className="text-sm mt-1">Clique em "Gerar Alertas" para verificar o sistema.</p>
              </div>
            ) : (
              <>
                <div className="rounded-lg border overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/40 hover:bg-muted/40">
                        <TableHead className="font-semibold w-8">Nível</TableHead>
                        <TableHead className="font-semibold">Tipo</TableHead>
                        <TableHead className="font-semibold">Mensagem</TableHead>
                        <TableHead className="font-semibold hidden md:table-cell">Patrimônio</TableHead>
                        <TableHead className="font-semibold hidden md:table-cell">Seção</TableHead>
                        <TableHead className="font-semibold hidden sm:table-cell">Data</TableHead>
                        <TableHead className="font-semibold text-right">Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {alerts.map(a => {
                        const cfg = nivelConfig[a.nivel] || nivelConfig.informativo;
                        const Icon = cfg.icon;
                        return (
                          <TableRow key={a.id} className="hover:bg-muted/20 transition-hover">
                            <TableCell><Icon className={`h-4 w-4 ${cfg.color}`} /></TableCell>
                            <TableCell><Badge variant={cfg.badge as any} className="text-xs">{a.tipo}</Badge></TableCell>
                            <TableCell className="text-sm max-w-[300px]">{a.mensagem}</TableCell>
                            <TableCell className="text-sm font-mono hidden md:table-cell">{a.item_patrimonio || '—'}</TableCell>
                            <TableCell className="text-sm hidden md:table-cell">{a.secao || '—'}</TableCell>
                            <TableCell className="text-xs hidden sm:table-cell whitespace-nowrap">{new Date(a.created_at).toLocaleDateString('pt-BR')}</TableCell>
                            <TableCell className="text-right">
                              <div className="flex justify-end gap-1">
                                {a.item_id && a.item_tipo && (
                                  <Button variant="ghost" size="icon" className="h-7 w-7 transition-hover" onClick={() => {
                                    if (a.item_tipo === 'notebook') navigate(`/itens/${a.item_id}/editar`);
                                    else navigate(`/materiais/${a.item_id}/editar`);
                                  }} title="Abrir item">
                                    <Info className="h-3.5 w-3.5" />
                                  </Button>
                                )}
                                {a.status === 'ativo' && (
                                  <Button variant="ghost" size="icon" className="h-7 w-7 text-success transition-hover" onClick={() => resolveAlert(a.id)} title="Resolver">
                                    <CheckCircle className="h-3.5 w-3.5" />
                                  </Button>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
                <p className="text-xs text-muted-foreground mt-3">{alerts.length} alerta(s)</p>
              </>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
