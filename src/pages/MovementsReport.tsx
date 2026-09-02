import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { ArrowRightLeft, Search, Printer, Download, CalendarIcon, Filter, FileText, ChevronLeft, ChevronRight } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { generatePDFReport } from '@/lib/pdfExport';
import { useSections } from '@/hooks/useSections';
import PageTransition from '@/components/PageTransition';
import PageHeader from '@/components/PageHeader';
import type { Movement } from '@/types';

const EVENT_TYPES = ['Transferência de seção', 'Alteração de responsável', 'Manutenção iniciada', 'Manutenção finalizada', 'Baixa', 'Cadastro', 'Edição'];

export default function MovementsReport() {
  const { sections } = useSections();
  const [dateFrom, setDateFrom] = useState<Date | undefined>();
  const [dateTo, setDateTo] = useState<Date | undefined>();
  const [filterTipo, setFilterTipo] = useState('all');
  const [filterEvento, setFilterEvento] = useState('all');
  const [filterSecao, setFilterSecao] = useState('all');
  const [searchText, setSearchText] = useState('');
  const [page, setPage] = useState(0);
  const [printMode, setPrintMode] = useState(false);
  const PAGE_SIZE = 100;

  const { data, isLoading: loading } = useQuery({
    queryKey: ['movements', dateFrom?.toISOString(), dateTo?.toISOString(), filterTipo, filterEvento, filterSecao, page],
    queryFn: async () => {
      let query = supabase.from('movements').select('*', { count: 'exact' }).order('data_hora', { ascending: false });
      if (dateFrom) query = query.gte('data_hora', dateFrom.toISOString());
      if (dateTo) { const end = new Date(dateTo); end.setHours(23, 59, 59, 999); query = query.lte('data_hora', end.toISOString()); }
      if (filterTipo !== 'all') query = query.eq('item_tipo', filterTipo);
      if (filterEvento !== 'all') query = query.eq('tipo_evento', filterEvento);
      if (filterSecao !== 'all') query = query.or(`secao_origem.eq.${filterSecao},secao_destino.eq.${filterSecao}`);
      query = query.range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);
      const { data, error, count } = await query;
      if (error) { toast.error('Erro ao carregar movimentações.'); throw error; }
      return { movements: (data as Movement[]) || [], totalCount: count || 0 };
    },
    staleTime: 15_000,
  });

  const movements = data?.movements || [];
  const totalCount = data?.totalCount || 0;
  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  const filtered = searchText.trim()
    ? movements.filter(m =>
        m.tipo_evento.toLowerCase().includes(searchText.toLowerCase()) ||
        m.observacao?.toLowerCase().includes(searchText.toLowerCase()) ||
        m.responsavel_novo?.toLowerCase().includes(searchText.toLowerCase()) ||
        m.responsavel_anterior?.toLowerCase().includes(searchText.toLowerCase())
      )
    : movements;

  const exportCSV = () => {
    const header = 'Data/Hora;Tipo Item;Evento;Seção Origem;Seção Destino;Resp. Anterior;Resp. Novo;Observação\n';
    const rows = filtered.map(m =>
      `${new Date(m.data_hora).toLocaleString('pt-BR')};${m.item_tipo};${m.tipo_evento};${m.secao_origem || ''};${m.secao_destino || ''};${m.responsavel_anterior || ''};${m.responsavel_novo || ''};${m.observacao || ''}`
    ).join('\n');
    const blob = new Blob([header + rows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `movimentacoes_${format(new Date(), 'yyyy-MM-dd')}.csv`; a.click();
    URL.revokeObjectURL(url);
    toast.success('CSV exportado com sucesso.');
  };

  const exportPDF = () => {
    const filters: string[] = [
      `Período: ${dateFrom ? format(dateFrom, 'dd/MM/yyyy') : 'início'} até ${dateTo ? format(dateTo, 'dd/MM/yyyy') : 'hoje'}`,
      `Tipo: ${filterTipo === 'all' ? 'Todos' : filterTipo}`,
      `Evento: ${filterEvento === 'all' ? 'Todos' : filterEvento}`,
      `Seção: ${filterSecao === 'all' ? 'Todas' : filterSecao}`,
    ];
    if (searchText.trim()) filters.push(`Busca: "${searchText.trim()}"`);

    const transferencias = filtered.filter(m => m.tipo_evento.includes('Transferência')).length;
    const manutencoes = filtered.filter(m => m.tipo_evento.includes('Manutenção')).length;
    const baixas = filtered.filter(m => m.tipo_evento.includes('Baixa')).length;

    generatePDFReport({
      title: 'Relatório de Movimentações',
      subtitle: `${filtered.length} registro(s) nesta emissão · ${totalCount} no total filtrado`,
      emitter: null,
      section: filterSecao === 'all' ? null : filterSecao,
      filters,
      summary: [
        { label: 'Movimentações', value: filtered.length },
        { label: 'Transferências', value: transferencias },
        { label: 'Manutenções', value: manutencoes },
        { label: 'Baixas', value: baixas },
      ],
      columns: ['Data/Hora', 'Tipo', 'Evento', 'Origem', 'Destino', 'Resp. Ant.', 'Resp. Novo', 'Obs.'],
      rows: filtered.map(m => [
        new Date(m.data_hora).toLocaleString('pt-BR'), m.item_tipo, m.tipo_evento,
        m.secao_origem || '', m.secao_destino || '', m.responsavel_anterior || '',
        m.responsavel_novo || '', m.observacao || '',
      ]),
      columnWidths: { 0: 32 },
      filename: 'movimentacoes',
      orientation: 'landscape',
    });
    toast.success('PDF exportado com sucesso.');
  };


  const eventColor = (tipo: string) => {
    if (tipo.includes('Manutenção iniciada')) return 'destructive';
    if (tipo.includes('Manutenção finalizada')) return 'default';
    if (tipo.includes('Transferência')) return 'secondary';
    if (tipo.includes('Baixa')) return 'destructive';
    return 'outline';
  };

  const clearFilters = () => {
    setDateFrom(undefined); setDateTo(undefined); setFilterTipo('all');
    setFilterEvento('all'); setFilterSecao('all'); setSearchText(''); setPage(0);
  };

  if (printMode) {
    const dataAtual = new Date().toLocaleDateString('pt-BR');
    const horaAtual = new Date().toLocaleTimeString('pt-BR');
    return (
      <div className="fixed inset-0 z-[100] bg-white text-black overflow-auto" style={{ fontFamily: "'DM Sans', Arial, sans-serif" }}>
        <div className="no-print fixed top-4 right-4 z-50">
          <button onClick={() => setPrintMode(false)} className="px-4 py-2 rounded-lg bg-gray-200 text-black text-sm font-medium shadow-lg hover:bg-gray-300 transition-all">Fechar</button>
        </div>
        <div className="max-w-[210mm] mx-auto p-[15mm]">
          <div className="text-center border-b-2 border-black pb-4 mb-6">
            <h1 className="text-xl font-bold uppercase">Seção de Informática — 14° B Log</h1>
            <h2 className="text-lg font-semibold mt-1 uppercase">Relatório de Movimentações</h2>
            <p className="text-xs mt-2 text-gray-600">Data: {dataAtual} — Hora: {horaAtual}</p>
            <p className="text-xs font-semibold mt-1">{filtered.length} registro(s)</p>
          </div>
          <table className="w-full text-[10px] border-collapse">
            <thead>
              <tr className="bg-gray-200">
                <th className="border border-gray-400 px-1.5 py-1 text-left font-semibold">Data/Hora</th>
                <th className="border border-gray-400 px-1.5 py-1 text-left font-semibold">Tipo</th>
                <th className="border border-gray-400 px-1.5 py-1 text-left font-semibold">Evento</th>
                <th className="border border-gray-400 px-1.5 py-1 text-left font-semibold">Origem</th>
                <th className="border border-gray-400 px-1.5 py-1 text-left font-semibold">Destino</th>
                <th className="border border-gray-400 px-1.5 py-1 text-left font-semibold">Resp. Ant.</th>
                <th className="border border-gray-400 px-1.5 py-1 text-left font-semibold">Resp. Novo</th>
                <th className="border border-gray-400 px-1.5 py-1 text-left font-semibold">Obs.</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((m, i) => (
                <tr key={m.id} className={i % 2 === 1 ? 'bg-gray-50' : ''}>
                  <td className="border border-gray-300 px-1.5 py-0.5">{new Date(m.data_hora).toLocaleString('pt-BR')}</td>
                  <td className="border border-gray-300 px-1.5 py-0.5 capitalize">{m.item_tipo}</td>
                  <td className="border border-gray-300 px-1.5 py-0.5">{m.tipo_evento}</td>
                  <td className="border border-gray-300 px-1.5 py-0.5">{m.secao_origem || '—'}</td>
                  <td className="border border-gray-300 px-1.5 py-0.5">{m.secao_destino || '—'}</td>
                  <td className="border border-gray-300 px-1.5 py-0.5">{m.responsavel_anterior || '—'}</td>
                  <td className="border border-gray-300 px-1.5 py-0.5">{m.responsavel_novo || '—'}</td>
                  <td className="border border-gray-300 px-1.5 py-0.5">{m.observacao || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="mt-8 text-center text-[10px] border-t border-gray-400 pt-4">
            <p>Total de registros: {filtered.length}</p>
            <p className="mt-1">Documento gerado pela Seção de Informática — 14° B Log</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <PageTransition>
      <div className="container mx-auto py-6 px-4">
        <PageHeader
          icon={ArrowRightLeft}
          title="Relatório de Movimentações"
          description={`${totalCount} registro(s)`}
          actions={
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={exportPDF} disabled={filtered.length === 0}><FileText className="h-3.5 w-3.5 mr-1.5" />PDF</Button>
              <Button variant="outline" size="sm" onClick={exportCSV} disabled={filtered.length === 0}><Download className="h-3.5 w-3.5 mr-1.5" />CSV</Button>
              <Button variant="outline" size="sm" onClick={() => { setPrintMode(true); setTimeout(() => { window.print(); setTimeout(() => setPrintMode(false), 500); }, 100); }} disabled={filtered.length === 0}><Printer className="h-3.5 w-3.5 mr-1.5" />Imprimir</Button>
            </div>
          }
        />

        <Card className="shadow-card border-border/50">
          <CardContent className="pt-5">
            <div className="flex flex-col gap-3 mb-5 no-print">
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/50" />
                  <Input placeholder="Buscar por evento, responsável, observação..." value={searchText} onChange={e => setSearchText(e.target.value)} className="pl-9 h-9 bg-muted/30 border-border/50 focus:bg-background focus:border-primary/50 focus:shadow-glow transition-all duration-300" />
                </div>
                <Select value={filterTipo} onValueChange={v => { setFilterTipo(v); setPage(0); }}>
                  <SelectTrigger className="w-full sm:w-[160px] h-9 bg-muted/30 border-border/50"><SelectValue placeholder="Tipo" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os tipos</SelectItem>
                    <SelectItem value="notebook">Notebook</SelectItem>
                    <SelectItem value="material">Material</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={filterEvento} onValueChange={v => { setFilterEvento(v); setPage(0); }}>
                  <SelectTrigger className="w-full sm:w-[200px] h-9 bg-muted/30 border-border/50"><SelectValue placeholder="Evento" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os eventos</SelectItem>
                    {EVENT_TYPES.map(e => <SelectItem key={e} value={e}>{e}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col sm:flex-row gap-3">
                <Select value={filterSecao} onValueChange={v => { setFilterSecao(v); setPage(0); }}>
                  <SelectTrigger className="w-full sm:w-[200px] h-9 bg-muted/30 border-border/50"><SelectValue placeholder="Seção" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas as seções</SelectItem>
                    {sections.map(s => <SelectItem key={s.id} value={s.name}>{s.name}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" size="sm" className={cn("h-9 w-full sm:w-[160px] justify-start text-left font-normal bg-muted/30 border-border/50", !dateFrom && "text-muted-foreground")}>
                      <CalendarIcon className="h-3.5 w-3.5 mr-1.5" />
                      {dateFrom ? format(dateFrom, 'dd/MM/yyyy') : 'Data inicial'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar mode="single" selected={dateFrom} onSelect={d => { setDateFrom(d); setPage(0); }} className="p-3 pointer-events-auto" />
                  </PopoverContent>
                </Popover>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" size="sm" className={cn("h-9 w-full sm:w-[160px] justify-start text-left font-normal bg-muted/30 border-border/50", !dateTo && "text-muted-foreground")}>
                      <CalendarIcon className="h-3.5 w-3.5 mr-1.5" />
                      {dateTo ? format(dateTo, 'dd/MM/yyyy') : 'Data final'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar mode="single" selected={dateTo} onSelect={d => { setDateTo(d); setPage(0); }} className="p-3 pointer-events-auto" />
                  </PopoverContent>
                </Popover>
                {(dateFrom || dateTo || filterTipo !== 'all' || filterEvento !== 'all' || filterSecao !== 'all' || searchText) && (
                  <Button variant="ghost" size="sm" className="h-9 text-muted-foreground hover:text-foreground" onClick={clearFilters}>
                    <Filter className="h-3.5 w-3.5 mr-1" />Limpar
                  </Button>
                )}
              </div>
            </div>

            {loading ? (
              <div className="space-y-2">{[...Array(6)].map((_, i) => <Skeleton key={i} className="h-14 w-full rounded-xl" />)}</div>
            ) : filtered.length === 0 ? (
              <div className="text-center py-20 text-muted-foreground">
                <div className="mx-auto w-16 h-16 rounded-2xl bg-muted/60 flex items-center justify-center mb-4">
                  <ArrowRightLeft className="h-7 w-7 text-muted-foreground/30" />
                </div>
                <p className="text-base font-semibold">Nenhuma movimentação encontrada</p>
                <p className="text-sm mt-1 text-muted-foreground/70">Ajuste os filtros ou aguarde novas movimentações.</p>
              </div>
            ) : (
              <>
                {/* Desktop table */}
                <div className="rounded-xl border border-border/50 overflow-x-auto hidden md:block">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/40 hover:bg-muted/40 border-b border-border/50">
                        <TableHead className="font-semibold text-[10px] uppercase tracking-widest text-muted-foreground whitespace-nowrap">Data/Hora</TableHead>
                        <TableHead className="font-semibold text-[10px] uppercase tracking-widest text-muted-foreground">Tipo</TableHead>
                        <TableHead className="font-semibold text-[10px] uppercase tracking-widest text-muted-foreground">Evento</TableHead>
                        <TableHead className="font-semibold text-[10px] uppercase tracking-widest text-muted-foreground">Origem</TableHead>
                        <TableHead className="font-semibold text-[10px] uppercase tracking-widest text-muted-foreground">Destino</TableHead>
                        <TableHead className="font-semibold text-[10px] uppercase tracking-widest text-muted-foreground">Resp. Ant.</TableHead>
                        <TableHead className="font-semibold text-[10px] uppercase tracking-widest text-muted-foreground">Resp. Novo</TableHead>
                        <TableHead className="font-semibold text-[10px] uppercase tracking-widest text-muted-foreground">Obs.</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filtered.map(m => (
                        <TableRow key={m.id} className="hover:bg-muted/30 transition-colors duration-200 border-b border-border/30 last:border-0">
                          <TableCell className="text-xs whitespace-nowrap text-muted-foreground">{new Date(m.data_hora).toLocaleString('pt-BR')}</TableCell>
                          <TableCell><Badge variant="outline" className="text-[10px] capitalize font-medium">{m.item_tipo}</Badge></TableCell>
                          <TableCell><Badge variant={eventColor(m.tipo_evento) as any} className="text-[10px] font-medium">{m.tipo_evento}</Badge></TableCell>
                          <TableCell className="text-sm text-muted-foreground">{m.secao_origem || '—'}</TableCell>
                          <TableCell className="text-sm text-muted-foreground">{m.secao_destino || '—'}</TableCell>
                          <TableCell className="text-sm text-muted-foreground">{m.responsavel_anterior || '—'}</TableCell>
                          <TableCell className="text-sm text-muted-foreground">{m.responsavel_novo || '—'}</TableCell>
                          <TableCell className="max-w-[180px] truncate text-sm text-muted-foreground">{m.observacao || '—'}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                {/* Mobile card view */}
                <div className="space-y-3 md:hidden">
                  {filtered.map(m => (
                    <Card key={m.id} className="border-border/50 shadow-sm">
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between mb-2">
                          <Badge variant={eventColor(m.tipo_evento) as any} className="text-[10px] font-medium">{m.tipo_evento}</Badge>
                          <span className="text-[10px] text-muted-foreground">{new Date(m.data_hora).toLocaleString('pt-BR')}</span>
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <div>
                            <span className="text-muted-foreground">Tipo: </span>
                            <span className="capitalize font-medium">{m.item_tipo}</span>
                          </div>
                          {m.secao_origem && <div><span className="text-muted-foreground">Origem: </span><span>{m.secao_origem}</span></div>}
                          {m.secao_destino && <div><span className="text-muted-foreground">Destino: </span><span>{m.secao_destino}</span></div>}
                          {m.responsavel_novo && <div><span className="text-muted-foreground">Resp: </span><span>{m.responsavel_novo}</span></div>}
                        </div>
                        {m.observacao && <p className="text-xs text-muted-foreground mt-2 truncate">{m.observacao}</p>}
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

        {/* Print area */}
        <div className="hidden print:block mt-6">
          <div className="text-center border-b-2 border-foreground pb-4 mb-4">
            <h1 className="text-xl font-bold">RELATÓRIO DE MOVIMENTAÇÕES</h1>
            <p className="text-sm mt-1">Data: {new Date().toLocaleDateString('pt-BR')} — Hora: {new Date().toLocaleTimeString('pt-BR')}</p>
          </div>
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr className="bg-muted/50 print:bg-neutral-200">
                <th className="border px-2 py-1 text-left">Data/Hora</th>
                <th className="border px-2 py-1 text-left">Tipo</th>
                <th className="border px-2 py-1 text-left">Evento</th>
                <th className="border px-2 py-1 text-left">Origem</th>
                <th className="border px-2 py-1 text-left">Destino</th>
                <th className="border px-2 py-1 text-left">Resp. Ant.</th>
                <th className="border px-2 py-1 text-left">Resp. Novo</th>
                <th className="border px-2 py-1 text-left">Obs.</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((m, i) => (
                <tr key={m.id} className={i % 2 === 0 ? '' : 'bg-muted/20 print:bg-neutral-50'}>
                  <td className="border px-2 py-1">{new Date(m.data_hora).toLocaleString('pt-BR')}</td>
                  <td className="border px-2 py-1 capitalize">{m.item_tipo}</td>
                  <td className="border px-2 py-1">{m.tipo_evento}</td>
                  <td className="border px-2 py-1">{m.secao_origem || '—'}</td>
                  <td className="border px-2 py-1">{m.secao_destino || '—'}</td>
                  <td className="border px-2 py-1">{m.responsavel_anterior || '—'}</td>
                  <td className="border px-2 py-1">{m.responsavel_novo || '—'}</td>
                  <td className="border px-2 py-1">{m.observacao || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="mt-4 text-center text-xs border-t pt-3">
            <p>Total: {filtered.length} registro(s)</p>
            <p className="mt-1">Seção de Informática - 14° B Log</p>
          </div>
        </div>
      </div>
    </PageTransition>
  );
}
