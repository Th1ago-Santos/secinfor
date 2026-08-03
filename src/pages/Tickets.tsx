import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Plus, Ticket as TicketIcon, Search, Eye, Pencil, Printer, Link2, QrCode, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import PageTransition from '@/components/PageTransition';
import PageHeader from '@/components/PageHeader';
import TicketsSubNav from '@/components/TicketsSubNav';
import { useTicketQueues, useTicketStatuses } from '@/hooks/useTicketMeta';
import { useUserRole } from '@/hooks/useUserRole';
import { logAudit } from '@/lib/audit';
import { formatTicketAge, PRIORITY_COLORS, type Ticket, type TicketPriority } from '@/types/ticket';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';

const PAGE_SIZE = 15;

export default function Tickets() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { queues } = useTicketQueues();
  const { statuses } = useTicketStatuses();
  const { canEdit, isAdmin } = useUserRole();

  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [queueFilter, setQueueFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [specialFilter, setSpecialFilter] = useState<string>('none'); // overdue, today-open, today-closed, unassigned
  const [page, setPage] = useState(0);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const fetchTickets = async () => {
    setLoading(true);
    const { data } = await (supabase as any)
      .from('tickets')
      .select('*')
      .is('deleted_at', null)
      .order('created_at', { ascending: false });
    setTickets((data as Ticket[]) || []);
    setLoading(false);
  };

  useEffect(() => { fetchTickets(); }, []);

  // Apply URL params (from dashboard card clicks)
  useEffect(() => {
    const s = searchParams.get('status'); if (s) setStatusFilter(s);
    const q = searchParams.get('queue'); if (q) setQueueFilter(q);
    const p = searchParams.get('priority'); if (p) setPriorityFilter(p);
    if (searchParams.get('overdue') === '1') setSpecialFilter('overdue');
    const today = searchParams.get('today');
    if (today === 'open') setSpecialFilter('today-open');
    if (today === 'closed') setSpecialFilter('today-closed');
    if (searchParams.get('unassigned') === '1') setSpecialFilter('unassigned');
  }, [searchParams]);

  const clearFilters = () => {
    setQueueFilter('all'); setStatusFilter('all'); setPriorityFilter('all');
    setSpecialFilter('none'); setSearch(''); setSearchParams({});
  };

  const filtered = useMemo(() => {
    const now = Date.now();
    const startToday = new Date(); startToday.setHours(0,0,0,0);
    const startTodayMs = startToday.getTime();
    return tickets.filter(t => {
      if (queueFilter !== 'all' && t.queue_id !== queueFilter) return false;
      if (statusFilter !== 'all' && t.status_id !== statusFilter) return false;
      if (priorityFilter !== 'all' && t.priority !== priorityFilter) return false;
      if (specialFilter === 'overdue') {
        const closed = statuses.find(s => s.id === t.status_id)?.is_closed;
        if (closed) return false;
        if ((now - new Date(t.created_at).getTime()) / 86400000 <= 14) return false;
      }
      if (specialFilter === 'today-open' && new Date(t.created_at).getTime() < startTodayMs) return false;
      if (specialFilter === 'today-closed' && (!t.closed_at || new Date(t.closed_at).getTime() < startTodayMs)) return false;
      if (specialFilter === 'unassigned' && t.assigned_user_id) return false;
      if (search.trim()) {
        const s = search.trim().toLowerCase();
        return (
          t.ticket_number.toLowerCase().includes(s) ||
          t.client_section_name.toLowerCase().includes(s) ||
          t.subject.toLowerCase().includes(s) ||
          (t.plate_name || '').toLowerCase().includes(s)
        );
      }
      return true;
    });
  }, [tickets, search, queueFilter, statusFilter, priorityFilter, specialFilter, statuses]);


  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageData = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  const queueName = (id: string | null) => queues.find(q => q.id === id)?.name || '—';
  const statusMeta = (id: string | null) => statuses.find(s => s.id === id);

  const handleCopyLink = (t: Ticket) => {
    const url = `${window.location.origin}/chamados/${t.id}`;
    navigator.clipboard.writeText(url);
    toast.success('Link copiado!');
  };

  const [isDeleting, setIsDeleting] = useState(false);
  const handleDelete = async () => {
    if (!deleteId || isDeleting) return;
    const target = tickets.find(t => t.id === deleteId);
    setIsDeleting(true);
    const { data, error } = await (supabase as any).rpc('soft_delete_ticket', { p_ticket_id: deleteId });
    setIsDeleting(false);
    if (error) {
      console.error('Erro ao excluir chamado:', { error, ticketId: deleteId });
      const msg = /permission/i.test(error.message) ? 'Sem permissão para excluir.'
        : /not found/i.test(error.message) ? 'Chamado já excluído.'
        : 'Não foi possível excluir o chamado.';
      toast.error(msg);
      setDeleteId(null);
      return;
    }
    toast.success(`Chamado ${data || target?.ticket_number || ''} excluído com sucesso.`);
    setTickets(prev => prev.filter(t => t.id !== deleteId));
    setDeleteId(null);
  };

  return (
    <PageTransition>
      <div className="container mx-auto py-6 px-4 max-w-[1400px]">
        <PageHeader
          icon={TicketIcon}
          title="Chamados"
          description={`${filtered.length} chamado(s)`}
          actions={
            canEdit ? (
              <Button size="sm" onClick={() => navigate('/chamados/novo')} className="gradient-primary border-0 shadow-glow hover:opacity-90">
                <Plus className="h-4 w-4 mr-1.5" /> Abrir Chamado
              </Button>
            ) : null
          }
        />

        <TicketsSubNav />

        {specialFilter !== 'none' && (
          <div className="mb-3 flex items-center gap-2 text-xs">
            <Badge variant="outline" className="border-primary/40 text-primary bg-primary/5">
              Filtro ativo: {({
                'overdue': 'Vencidos (>14d)',
                'today-open': 'Abertos hoje',
                'today-closed': 'Concluídos hoje',
                'unassigned': 'Sem responsável',
              } as any)[specialFilter]}
            </Badge>
            <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={clearFilters}>Limpar filtros</Button>
          </div>
        )}


        <Card className="shadow-card border-border/50 mb-4">
          <CardContent className="pt-5 space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
              <div className="relative md:col-span-2">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por ticket, seção, título ou placa..."
                  value={search}
                  onChange={(e) => { setSearch(e.target.value); setPage(0); }}
                  className="pl-9 h-10"
                />
              </div>
              <Select value={queueFilter} onValueChange={(v) => { setQueueFilter(v); setPage(0); }}>
                <SelectTrigger className="h-10"><SelectValue placeholder="Fila" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as filas</SelectItem>
                  {queues.map(q => <SelectItem key={q.id} value={q.id}>{q.name}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(0); }}>
                <SelectTrigger className="h-10"><SelectValue placeholder="Status" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os status</SelectItem>
                  {statuses.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
              <Select value={priorityFilter} onValueChange={(v) => { setPriorityFilter(v); setPage(0); }}>
                <SelectTrigger className="h-10"><SelectValue placeholder="Prioridade" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas prioridades</SelectItem>
                  <SelectItem value="Baixa">Baixa</SelectItem>
                  <SelectItem value="Normal">Normal</SelectItem>
                  <SelectItem value="Alta">Alta</SelectItem>
                  <SelectItem value="Urgente">Urgente</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-card border-border/50">
          <CardContent className="pt-5">
            {loading ? (
              <div className="space-y-2">
                {[...Array(8)].map((_, i) => <Skeleton key={i} className="h-12 w-full rounded-xl" />)}
              </div>
            ) : (
              <div className="rounded-xl border border-border/50 overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/40 hover:bg-muted/40">
                      <TableHead className="text-[10px] uppercase tracking-widest font-semibold">Ticket</TableHead>
                      <TableHead className="text-[10px] uppercase tracking-widest font-semibold">Seção</TableHead>
                      <TableHead className="text-[10px] uppercase tracking-widest font-semibold">Título</TableHead>
                      <TableHead className="text-[10px] uppercase tracking-widest font-semibold">Placa</TableHead>
                      <TableHead className="text-[10px] uppercase tracking-widest font-semibold">Fila</TableHead>
                      <TableHead className="text-[10px] uppercase tracking-widest font-semibold">Status</TableHead>
                      <TableHead className="text-[10px] uppercase tracking-widest font-semibold">Prio.</TableHead>
                      <TableHead className="text-[10px] uppercase tracking-widest font-semibold">Idade</TableHead>
                      <TableHead className="text-[10px] uppercase tracking-widest font-semibold text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pageData.length === 0 && (
                      <TableRow><TableCell colSpan={9} className="text-center text-muted-foreground py-10 text-sm">Nenhum chamado encontrado.</TableCell></TableRow>
                    )}
                    {pageData.map((t) => {
                      const sMeta = statusMeta(t.status_id);
                      return (
                        <TableRow key={t.id} className="hover:bg-muted/30 group">
                          <TableCell className="font-mono text-xs font-semibold">{t.ticket_number}</TableCell>
                          <TableCell className="text-sm">{t.client_section_name}</TableCell>
                          <TableCell className="text-sm max-w-[220px] truncate">{t.subject}</TableCell>
                          <TableCell className="text-xs text-muted-foreground">{t.plate_name || <span className="italic">Sem placa</span>}</TableCell>
                          <TableCell className="text-xs">{queueName(t.queue_id)}</TableCell>
                          <TableCell>
                            {sMeta ? (
                              <Badge variant="outline" className="text-[10px]" style={sMeta.color ? { color: sMeta.color, borderColor: sMeta.color } : undefined}>
                                {sMeta.name}
                              </Badge>
                            ) : '—'}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className={`text-[10px] ${PRIORITY_COLORS[t.priority as TicketPriority] || ''}`}>{t.priority}</Badge>
                          </TableCell>
                          <TableCell className="text-xs font-mono">{formatTicketAge(t.created_at, t.closed_at)}</TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-0.5 opacity-70 group-hover:opacity-100">
                              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => navigate(`/chamados/${t.id}`)} title="Visualizar">
                                <Eye className="h-3.5 w-3.5" />
                              </Button>
                              {canEdit && (
                                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => navigate(`/chamados/${t.id}/editar`)} title="Editar">
                                  <Pencil className="h-3.5 w-3.5" />
                                </Button>
                              )}
                              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => navigate(`/chamados/${t.id}/etiqueta`)} title="Imprimir etiqueta">
                                <Printer className="h-3.5 w-3.5" />
                              </Button>
                              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleCopyLink(t)} title="Copiar link">
                                <Link2 className="h-3.5 w-3.5" />
                              </Button>
                              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => navigate(`/chamados/${t.id}/etiqueta`)} title="QR Code">
                                <QrCode className="h-3.5 w-3.5" />
                              </Button>
                              {isAdmin && (
                                <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive/70 hover:text-destructive" onClick={() => setDeleteId(t.id)} title="Excluir">
                                  <Trash2 className="h-3.5 w-3.5" />
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
            )}

            {pageCount > 1 && (
              <div className="flex items-center justify-between mt-4">
                <p className="text-xs text-muted-foreground">Página {page + 1} de {pageCount}</p>
                <div className="flex gap-1">
                  <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage(p => Math.max(0, p - 1))}>Anterior</Button>
                  <Button variant="outline" size="sm" disabled={page + 1 >= pageCount} onClick={() => setPage(p => p + 1)}>Próxima</Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Excluir chamado?</AlertDialogTitle>
              <AlertDialogDescription>Esta ação removerá o chamado da listagem e do acesso público.</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={handleDelete} disabled={isDeleting} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">{isDeleting ? 'Excluindo...' : 'Excluir'}</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </PageTransition>
  );
}
