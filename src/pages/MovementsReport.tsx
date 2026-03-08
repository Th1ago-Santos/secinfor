import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { ArrowRightLeft, Search, Printer, Download, CalendarIcon, Filter, FileText } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { generatePDFReport } from '@/lib/pdfExport';

import { useSections } from '@/hooks/useSections';

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
  usuario_sistema: string | null;
};

const EVENT_TYPES = ['Transferência de seção', 'Alteração de responsável', 'Manutenção iniciada', 'Manutenção finalizada', 'Baixa', 'Cadastro', 'Edição'];

export default function MovementsReport() {
  const { sections } = useSections();
  const [movements, setMovements] = useState<Movement[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateFrom, setDateFrom] = useState<Date | undefined>();
  const [dateTo, setDateTo] = useState<Date | undefined>();
  const [filterTipo, setFilterTipo] = useState('all');
  const [filterEvento, setFilterEvento] = useState('all');
  const [filterSecao, setFilterSecao] = useState('all');
  const [searchText, setSearchText] = useState('');

  const fetchMovements = async () => {
    setLoading(true);
    let query = supabase.from('movements').select('*').order('data_hora', { ascending: false });
    if (dateFrom) query = query.gte('data_hora', dateFrom.toISOString());
    if (dateTo) { const end = new Date(dateTo); end.setHours(23, 59, 59, 999); query = query.lte('data_hora', end.toISOString()); }
    if (filterTipo !== 'all') query = query.eq('item_tipo', filterTipo);
    if (filterEvento !== 'all') query = query.eq('tipo_evento', filterEvento);
    if (filterSecao !== 'all') query = query.or(`secao_origem.eq.${filterSecao},secao_destino.eq.${filterSecao}`);
    const { data, error } = await query.limit(500);
    if (error) toast.error('Erro ao carregar movimentações.');
    setMovements((data as Movement[]) || []);
    setLoading(false);
  };

  useEffect(() => { fetchMovements(); }, [dateFrom, dateTo, filterTipo, filterEvento, filterSecao]);

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

  const eventColor = (tipo: string) => {
    if (tipo.includes('Manutenção iniciada')) return 'destructive';
    if (tipo.includes('Manutenção finalizada')) return 'default';
    if (tipo.includes('Transferência')) return 'secondary';
    if (tipo.includes('Baixa')) return 'destructive';
    return 'outline';
  };

  return (
    <div className="container mx-auto py-6 px-4 animate-in-page">
        <Card>
          <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-4">
            <CardTitle className="flex items-center gap-2.5 text-lg">
              <div className="p-2 rounded-lg bg-primary/10">
                <ArrowRightLeft className="h-4 w-4 text-primary" />
              </div>
              Relatório de Movimentações
            </CardTitle>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={exportCSV} disabled={filtered.length === 0} className="transition-all duration-200">
                <Download className="h-3.5 w-3.5 mr-1.5" />CSV
              </Button>
              <Button variant="outline" size="sm" onClick={() => window.print()} disabled={filtered.length === 0} className="transition-all duration-200">
                <Printer className="h-3.5 w-3.5 mr-1.5" />Imprimir
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-3 mb-5 no-print">
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/60" />
                  <Input placeholder="Buscar por evento, responsável, observação..." value={searchText} onChange={e => setSearchText(e.target.value)} className="pl-9 h-9 bg-muted/30 border-border/60 focus:bg-background transition-all duration-200" />
                </div>
                <Select value={filterTipo} onValueChange={setFilterTipo}>
                  <SelectTrigger className="w-full sm:w-[160px] h-9 bg-muted/30 border-border/60"><SelectValue placeholder="Tipo" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os tipos</SelectItem>
                    <SelectItem value="notebook">Notebook</SelectItem>
                    <SelectItem value="material">Material</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={filterEvento} onValueChange={setFilterEvento}>
                  <SelectTrigger className="w-full sm:w-[200px] h-9 bg-muted/30 border-border/60"><SelectValue placeholder="Evento" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os eventos</SelectItem>
                    {EVENT_TYPES.map(e => <SelectItem key={e} value={e}>{e}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col sm:flex-row gap-3">
                <Select value={filterSecao} onValueChange={setFilterSecao}>
                  <SelectTrigger className="w-full sm:w-[200px] h-9 bg-muted/30 border-border/60"><SelectValue placeholder="Seção" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas as seções</SelectItem>
                    {sections.map(s => <SelectItem key={s.id} value={s.name}>{s.name}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" size="sm" className={cn("h-9 w-full sm:w-[160px] justify-start text-left font-normal bg-muted/30 border-border/60", !dateFrom && "text-muted-foreground")}>
                      <CalendarIcon className="h-3.5 w-3.5 mr-1.5" />
                      {dateFrom ? format(dateFrom, 'dd/MM/yyyy') : 'Data inicial'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar mode="single" selected={dateFrom} onSelect={setDateFrom} className="p-3 pointer-events-auto" />
                  </PopoverContent>
                </Popover>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" size="sm" className={cn("h-9 w-full sm:w-[160px] justify-start text-left font-normal bg-muted/30 border-border/60", !dateTo && "text-muted-foreground")}>
                      <CalendarIcon className="h-3.5 w-3.5 mr-1.5" />
                      {dateTo ? format(dateTo, 'dd/MM/yyyy') : 'Data final'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar mode="single" selected={dateTo} onSelect={setDateTo} className="p-3 pointer-events-auto" />
                  </PopoverContent>
                </Popover>
                {(dateFrom || dateTo || filterTipo !== 'all' || filterEvento !== 'all' || filterSecao !== 'all' || searchText) && (
                  <Button variant="ghost" size="sm" className="h-9 text-muted-foreground hover:text-foreground" onClick={() => { setDateFrom(undefined); setDateTo(undefined); setFilterTipo('all'); setFilterEvento('all'); setFilterSecao('all'); setSearchText(''); }}>
                    <Filter className="h-3.5 w-3.5 mr-1" />Limpar
                  </Button>
                )}
              </div>
            </div>

            {loading ? (
              <div className="space-y-2">{[...Array(6)].map((_, i) => <Skeleton key={i} className="h-14 w-full rounded-lg" />)}</div>
            ) : filtered.length === 0 ? (
              <div className="text-center py-20 text-muted-foreground animate-in-card">
                <div className="mx-auto w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mb-4">
                  <ArrowRightLeft className="h-7 w-7 text-muted-foreground/40" />
                </div>
                <p className="text-base font-semibold">Nenhuma movimentação encontrada</p>
                <p className="text-sm mt-1">Ajuste os filtros ou aguarde novas movimentações.</p>
              </div>
            ) : (
              <>
                <div className="rounded-xl border overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/50 hover:bg-muted/50 border-b">
                        <TableHead className="font-semibold text-xs uppercase tracking-wider whitespace-nowrap">Data/Hora</TableHead>
                        <TableHead className="font-semibold text-xs uppercase tracking-wider">Tipo</TableHead>
                        <TableHead className="font-semibold text-xs uppercase tracking-wider">Evento</TableHead>
                        <TableHead className="font-semibold text-xs uppercase tracking-wider hidden md:table-cell">Origem</TableHead>
                        <TableHead className="font-semibold text-xs uppercase tracking-wider hidden md:table-cell">Destino</TableHead>
                        <TableHead className="font-semibold text-xs uppercase tracking-wider hidden lg:table-cell">Resp. Ant.</TableHead>
                        <TableHead className="font-semibold text-xs uppercase tracking-wider hidden lg:table-cell">Resp. Novo</TableHead>
                        <TableHead className="font-semibold text-xs uppercase tracking-wider hidden sm:table-cell">Obs.</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filtered.map(m => (
                        <TableRow key={m.id} className="hover:bg-muted/30 transition-colors duration-150">
                          <TableCell className="text-xs whitespace-nowrap text-muted-foreground">{new Date(m.data_hora).toLocaleString('pt-BR')}</TableCell>
                          <TableCell><Badge variant="outline" className="text-[10px] capitalize font-medium">{m.item_tipo}</Badge></TableCell>
                          <TableCell><Badge variant={eventColor(m.tipo_evento) as any} className="text-[10px] font-medium">{m.tipo_evento}</Badge></TableCell>
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
                <p className="text-xs text-muted-foreground mt-3 font-medium">{filtered.length} registro(s)</p>
              </>
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
              <tr className="bg-gray-200">
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
                <tr key={m.id} className={i % 2 === 0 ? '' : 'bg-gray-50'}>
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
            <p className="mt-1">Sistema de Controle de Patrimônio</p>
          </div>
        </div>
    </div>
  );
}
