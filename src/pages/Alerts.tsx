import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useSections } from '@/hooks/useSections';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Bell, CheckCircle, AlertTriangle, Info, XCircle, RefreshCw, Download, FileText, Printer } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { generatePDFReport } from '@/lib/pdfExport';
import PageTransition from '@/components/PageTransition';
import PageHeader from '@/components/PageHeader';
import type { Alert } from '@/types';

const nivelConfig: Record<string, { icon: React.ElementType; colorClass: string; badge: string }> = {
  informativo: { icon: Info, colorClass: 'text-info', badge: 'outline' },
  atencao: { icon: AlertTriangle, colorClass: 'text-warning', badge: 'secondary' },
  critico: { icon: XCircle, colorClass: 'text-destructive', badge: 'destructive' },
};

export default function Alerts() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [generating, setGenerating] = useState(false);
  const [filterNivel, setFilterNivel] = useState('all');
  const [filterStatus, setFilterStatus] = useState('ativo');

  const { data: alerts = [], isLoading: loading } = useQuery({
    queryKey: ['alerts', filterNivel, filterStatus],
    queryFn: async () => {
      let query = supabase.from('alerts').select('*').order('created_at', { ascending: false });
      if (filterStatus !== 'all') query = query.eq('status', filterStatus);
      if (filterNivel !== 'all') query = query.eq('nivel', filterNivel);
      const { data } = await query.limit(200);
      return (data as Alert[]) || [];
    },
    staleTime: 15_000,
  });

  const generateAlerts = async () => {
    setGenerating(true);
    const newAlerts: Omit<Alert, 'id' | 'created_at' | 'resolvido_em' | 'resolvido_por'>[] = [];

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const { data: manutNbs } = await supabase.from('notebooks').select('id, patrimonio, secao, data_entrada_manutencao')
      .eq('status', 'Em manutenção');
    (manutNbs || []).forEach((nb: any) => {
      if (nb.data_entrada_manutencao && new Date(nb.data_entrada_manutencao) < thirtyDaysAgo) {
        newAlerts.push({ tipo: 'Manutenção prolongada', nivel: 'atencao', mensagem: `Notebook ${nb.patrimonio} em manutenção há mais de 30 dias`, item_id: nb.id, item_tipo: 'notebook', item_patrimonio: nb.patrimonio, secao: nb.secao, status: 'ativo' });
      }
    });

    const { data: noPhotoNbs } = await supabase.from('notebooks').select('id, patrimonio, secao').is('foto_url', null);
    (noPhotoNbs || []).forEach((nb: any) => {
      newAlerts.push({ tipo: 'Sem foto', nivel: 'informativo', mensagem: `Notebook ${nb.patrimonio} sem foto cadastrada`, item_id: nb.id, item_tipo: 'notebook', item_patrimonio: nb.patrimonio, secao: nb.secao, status: 'ativo' });
    });

    const { data: baixados } = await supabase.from('notebooks').select('id, patrimonio, secao').eq('status', 'Baixado').not('secao', 'is', null);
    (baixados || []).forEach((nb: any) => {
      newAlerts.push({ tipo: 'Baixado com seção', nivel: 'atencao', mensagem: `Notebook ${nb.patrimonio} está baixado mas ainda vinculado à seção ${nb.secao}`, item_id: nb.id, item_tipo: 'notebook', item_patrimonio: nb.patrimonio, secao: nb.secao, status: 'ativo' });
    });

    if (newAlerts.length > 0) {
      await supabase.from('alerts').delete().eq('status', 'ativo');
      const { error } = await supabase.from('alerts').insert(newAlerts as any);
      if (error) toast.error('Erro ao gerar alertas.');
      else toast.success(`${newAlerts.length} alerta(s) gerado(s).`);
    } else {
      await supabase.from('alerts').delete().eq('status', 'ativo');
      toast.info('Nenhum alerta identificado.');
    }

    queryClient.invalidateQueries({ queryKey: ['alerts'] });
    setGenerating(false);
  };

  const resolveAlert = async (id: string) => {
    await supabase.from('alerts').update({ status: 'resolvido', resolvido_em: new Date().toISOString(), resolvido_por: user?.id } as any).eq('id', id);
    toast.success('Alerta marcado como resolvido.');
    queryClient.invalidateQueries({ queryKey: ['alerts'] });
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

  const exportPDF = () => {
    generatePDFReport({
      title: 'Relatório de Alertas',
      subtitle: `${alerts.length} alerta(s) — Status: ${filterStatus === 'all' ? 'Todos' : filterStatus}`,
      columns: ['Data', 'Nível', 'Tipo', 'Mensagem', 'Patrimônio', 'Seção', 'Status'],
      rows: alerts.map(a => [
        new Date(a.created_at).toLocaleString('pt-BR'), a.nivel, a.tipo, a.mensagem,
        a.item_patrimonio || '—', a.secao || '—', a.status,
      ]),
      filename: 'alertas',
    });
    toast.success('PDF exportado com sucesso.');
  };

  return (
    <PageTransition>
      <div className="container mx-auto py-6 px-4">
        <PageHeader
          icon={Bell}
          title="Alertas do Sistema"
          description={`${alerts.length} alerta(s)`}
          actions={
            <div className="flex gap-2 flex-wrap">
              <Button size="sm" onClick={generateAlerts} disabled={generating} className="gradient-primary border-0 shadow-glow hover:opacity-90 transition-all duration-300">
                <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${generating ? 'animate-spin' : ''}`} />
                {generating ? 'Gerando...' : 'Gerar Alertas'}
              </Button>
              <Button variant="outline" size="sm" onClick={exportPDF} disabled={alerts.length === 0}><FileText className="h-3.5 w-3.5 mr-1.5" />PDF</Button>
              <Button variant="outline" size="sm" onClick={exportCSV} disabled={alerts.length === 0}><Download className="h-3.5 w-3.5 mr-1.5" />CSV</Button>
              <Button variant="outline" size="sm" onClick={() => window.print()} disabled={alerts.length === 0}><Printer className="h-3.5 w-3.5 mr-1.5" />Imprimir</Button>
            </div>
          }
        />

        <Card className="shadow-card border-border/50">
          <CardContent className="pt-5">
            <div className="flex flex-col sm:flex-row gap-3 mb-5 no-print">
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-full sm:w-[160px] h-9 bg-muted/30 border-border/50"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="ativo">Ativos</SelectItem>
                  <SelectItem value="resolvido">Resolvidos</SelectItem>
                </SelectContent>
              </Select>
              <Select value={filterNivel} onValueChange={setFilterNivel}>
                <SelectTrigger className="w-full sm:w-[160px] h-9 bg-muted/30 border-border/50"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os níveis</SelectItem>
                  <SelectItem value="informativo">Informativo</SelectItem>
                  <SelectItem value="atencao">Atenção</SelectItem>
                  <SelectItem value="critico">Crítico</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {loading ? (
              <div className="space-y-2">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-14 w-full rounded-xl" />)}</div>
            ) : alerts.length === 0 ? (
              <div className="text-center py-20 text-muted-foreground">
                <div className="mx-auto w-16 h-16 rounded-2xl bg-muted/60 flex items-center justify-center mb-4">
                  <Bell className="h-7 w-7 text-muted-foreground/30" />
                </div>
                <p className="text-base font-semibold">Nenhum alerta encontrado</p>
                <p className="text-sm mt-1 text-muted-foreground/70">Clique em "Gerar Alertas" para verificar o sistema.</p>
              </div>
            ) : (
              <>
                {/* Desktop table */}
                <div className="rounded-xl border border-border/50 overflow-x-auto hidden md:block">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/40 hover:bg-muted/40 border-b border-border/50">
                        <TableHead className="font-semibold text-[10px] uppercase tracking-widest text-muted-foreground w-10">Nível</TableHead>
                        <TableHead className="font-semibold text-[10px] uppercase tracking-widest text-muted-foreground">Tipo</TableHead>
                        <TableHead className="font-semibold text-[10px] uppercase tracking-widest text-muted-foreground">Mensagem</TableHead>
                        <TableHead className="font-semibold text-[10px] uppercase tracking-widest text-muted-foreground">Patrimônio</TableHead>
                        <TableHead className="font-semibold text-[10px] uppercase tracking-widest text-muted-foreground">Seção</TableHead>
                        <TableHead className="font-semibold text-[10px] uppercase tracking-widest text-muted-foreground">Data</TableHead>
                        <TableHead className="font-semibold text-[10px] uppercase tracking-widest text-muted-foreground text-right">Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {alerts.map(a => {
                        const cfg = nivelConfig[a.nivel] || nivelConfig.informativo;
                        const Icon = cfg.icon;
                        return (
                          <TableRow key={a.id} className="hover:bg-muted/30 transition-colors duration-200 group border-b border-border/30 last:border-0">
                            <TableCell><Icon className={`h-4 w-4 ${cfg.colorClass}`} /></TableCell>
                            <TableCell><Badge variant={cfg.badge as any} className="text-[10px] font-medium">{a.tipo}</Badge></TableCell>
                            <TableCell className="text-sm max-w-[300px]">{a.mensagem}</TableCell>
                            <TableCell className="text-sm font-mono text-muted-foreground">{a.item_patrimonio || '—'}</TableCell>
                            <TableCell className="text-sm text-muted-foreground">{a.secao || '—'}</TableCell>
                            <TableCell className="text-xs text-muted-foreground whitespace-nowrap">{new Date(a.created_at).toLocaleDateString('pt-BR')}</TableCell>
                            <TableCell className="text-right">
                              <div className="flex justify-end gap-1 opacity-60 group-hover:opacity-100 transition-opacity duration-200">
                                {a.item_id && a.item_tipo && (
                                  <Button variant="ghost" size="icon" className="h-7 w-7 hover:text-primary hover:bg-primary/10 rounded-lg" onClick={() => {
                                    if (a.item_tipo === 'notebook') navigate(`/itens/${a.item_id}/editar`);
                                    else navigate(`/materiais/${a.item_id}/editar`);
                                  }} title="Abrir item"><Info className="h-3.5 w-3.5" /></Button>
                                )}
                                {a.status === 'ativo' && (
                                  <Button variant="ghost" size="icon" className="h-7 w-7 text-success hover:bg-success/10 rounded-lg" onClick={() => resolveAlert(a.id)} title="Resolver"><CheckCircle className="h-3.5 w-3.5" /></Button>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>

                {/* Mobile card view */}
                <div className="space-y-3 md:hidden">
                  {alerts.map(a => {
                    const cfg = nivelConfig[a.nivel] || nivelConfig.informativo;
                    const Icon = cfg.icon;
                    return (
                      <Card key={a.id} className="border-border/50 shadow-sm">
                        <CardContent className="p-4">
                          <div className="flex items-start gap-3">
                            <div className={`p-1.5 rounded-lg ${cfg.colorClass === 'text-destructive' ? 'bg-destructive/10' : cfg.colorClass === 'text-warning' ? 'bg-warning/10' : 'bg-info/10'} shrink-0 mt-0.5`}>
                              <Icon className={`h-4 w-4 ${cfg.colorClass}`} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <Badge variant={cfg.badge as any} className="text-[10px] font-medium">{a.tipo}</Badge>
                                <span className="text-[10px] text-muted-foreground">{new Date(a.created_at).toLocaleDateString('pt-BR')}</span>
                              </div>
                              <p className="text-sm">{a.mensagem}</p>
                              <div className="flex items-center gap-3 mt-1.5 text-xs text-muted-foreground">
                                {a.item_patrimonio && <span className="font-mono">{a.item_patrimonio}</span>}
                                {a.secao && <span>{a.secao}</span>}
                              </div>
                            </div>
                          </div>
                          <div className="flex justify-end gap-1 mt-3 pt-2 border-t border-border/30">
                            {a.item_id && a.item_tipo && (
                              <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => {
                                if (a.item_tipo === 'notebook') navigate(`/itens/${a.item_id}/editar`);
                                else navigate(`/materiais/${a.item_id}/editar`);
                              }}>Abrir item</Button>
                            )}
                            {a.status === 'ativo' && (
                              <Button variant="ghost" size="sm" className="h-7 text-xs text-success" onClick={() => resolveAlert(a.id)}>
                                <CheckCircle className="h-3 w-3 mr-1" />Resolver
                              </Button>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </PageTransition>
  );
}
