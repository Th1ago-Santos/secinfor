import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent } from '@/components/ui/card';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Plus, Pencil, Trash2, Search, Eye, History, QrCode, Laptop, Download, FileText, ChevronLeft, ChevronRight, Printer } from 'lucide-react';
import { toast } from 'sonner';
import { useSections } from '@/hooks/useSections';
import { QRCodeSVG } from 'qrcode.react';
import { generatePDFReport } from '@/lib/pdfExport';
import { format } from 'date-fns';
import PageTransition from '@/components/PageTransition';
import PageHeader from '@/components/PageHeader';
import { Notebook, statusColor } from '@/types';
import { useUserRole } from '@/hooks/useUserRole';
import CautelaPrint from '@/components/CautelaPrint';

export default function Index() {
  const [searchParams] = useSearchParams();
  const [filterSecao, setFilterSecao] = useState(searchParams.get('secao') || 'all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [viewItem, setViewItem] = useState<Notebook | null>(null);
  const [qrItem, setQrItem] = useState<Notebook | null>(null);
  const [cautelaItem, setCautelaItem] = useState<Notebook | null>(null);
  const [cautelaDialogItem, setCautelaDialogItem] = useState<Notebook | null>(null);
  const [responsavelCautela, setResponsavelCautela] = useState('');
  const [page, setPage] = useState(0);
  const PAGE_SIZE = 50;
  const navigate = useNavigate();
  const { sections } = useSections();
  const queryClient = useQueryClient();
  const { canEdit } = useUserRole();

  const resetPage = () => setPage(0);

  const { data, isLoading: loading } = useQuery({
    queryKey: ['notebooks', filterSecao, filterStatus, searchTerm, page],
    queryFn: async () => {
      let query = supabase.from('notebooks').select('*', { count: 'exact' }).order('created_at', { ascending: false });
      if (filterSecao !== 'all') query = query.eq('secao', filterSecao);
      if (filterStatus !== 'all') {
        if (filterStatus === 'Fora de Carga') {
          query = query.eq('status', 'Fora de Carga');
        } else {
          query = query.eq('status', filterStatus);
        }
      }
      if (searchTerm.trim()) {
        const term = `%${searchTerm.trim()}%`;
        query = query.or(`patrimonio.ilike.${term},militar.ilike.${term},modelo.ilike.${term},secao.ilike.${term}`);
      }
      query = query.range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);
      const { data, error, count } = await query;
      if (error) { toast.error('Erro ao carregar dados.'); throw error; }
      return { notebooks: (data as Notebook[]) || [], totalCount: count || 0 };
    },
    staleTime: 15_000,
  });

  const notebooks = data?.notebooks || [];
  const totalCount = data?.totalCount || 0;
  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  const exportCSV = () => {
    const header = 'Patrimônio;Modelo;Seção;Militar;Status\n';
    const rows = notebooks.map(n => `${n.patrimonio};${n.modelo};${n.secao};${n.militar};${n.status}`).join('\n');
    const blob = new Blob([header + rows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `notebooks_${format(new Date(), 'yyyy-MM-dd')}.csv`; a.click();
    URL.revokeObjectURL(url);
    toast.success('CSV exportado.');
  };

  const exportPDF = () => {
    generatePDFReport({
      title: 'Relatório de Notebooks',
      subtitle: `${totalCount} registro(s)`,
      columns: ['Patrimônio', 'Modelo', 'Seção', 'Militar', 'Status'],
      rows: notebooks.map(n => [n.patrimonio, n.modelo, n.secao, n.militar, n.status]),
      filename: 'notebooks',
    });
    toast.success('PDF exportado.');
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    const { error } = await supabase.from('notebooks').delete().eq('id', deleteId);
    if (error) toast.error('Erro ao excluir item.');
    else {
      toast.success('Item excluído com sucesso.');
      queryClient.invalidateQueries({ queryKey: ['notebooks'] });
    }
    setDeleteId(null);
  };

  const baseUrl = window.location.origin;

  // Show cautela full-screen print view
  if (cautelaItem) {
    return <CautelaPrint notebook={cautelaItem} responsavelCautela={responsavelCautela} onClose={() => { setCautelaItem(null); setResponsavelCautela(''); }} />;
  }

  return (
    <PageTransition>
      <div className="container mx-auto py-6 px-4">
        <PageHeader
          icon={Laptop}
          title="Notebooks Cadastrados"
          description={`${totalCount} registro(s)`}
          actions={
            <div className="flex gap-2 flex-wrap">
              <Button variant="outline" size="sm" onClick={exportPDF} disabled={notebooks.length === 0}>
                <FileText className="h-3.5 w-3.5 mr-1.5" />PDF
              </Button>
              <Button variant="outline" size="sm" onClick={exportCSV} disabled={notebooks.length === 0}>
                <Download className="h-3.5 w-3.5 mr-1.5" />CSV
              </Button>
              {canEdit && (
                <Button onClick={() => navigate('/itens/novo')} className="gradient-primary border-0 shadow-glow hover:opacity-90 transition-all duration-300">
                  <Plus className="h-4 w-4 mr-1.5" />
                  Novo Notebook
                </Button>
              )}
            </div>
          }
        />

        <Card className="shadow-card border-border/50">
          <CardContent className="pt-5">
            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-3 mb-5">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/50" />
                <Input placeholder="Buscar patrimônio, militar, modelo, seção..." value={searchTerm} onChange={(e) => { setSearchTerm(e.target.value); resetPage(); }} className="pl-9 h-9 bg-muted/30 border-border/50 focus:bg-background focus:border-primary/50 focus:shadow-glow transition-all duration-300" />
              </div>
              <Select value={filterSecao} onValueChange={v => { setFilterSecao(v); resetPage(); }}>
                <SelectTrigger className="w-full sm:w-[200px] h-9 bg-muted/30 border-border/50">
                  <SelectValue placeholder="Filtrar por seção" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as seções</SelectItem>
                  {sections.map((s) => (<SelectItem key={s.id} value={s.name}>{s.name}</SelectItem>))}
                </SelectContent>
              </Select>
              <Select value={filterStatus} onValueChange={v => { setFilterStatus(v); resetPage(); }}>
                <SelectTrigger className="w-full sm:w-[180px] h-9 bg-muted/30 border-border/50">
                  <SelectValue placeholder="Filtrar por status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os status</SelectItem>
                  <SelectItem value="Em uso">Em uso</SelectItem>
                  <SelectItem value="Em manutenção">Em manutenção</SelectItem>
                  <SelectItem value="Baixado">Baixado</SelectItem>
                  <SelectItem value="Em estoque">Em estoque</SelectItem>
                  <SelectItem value="Fora de Carga">Fora de Carga</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {loading ? (
              <div className="space-y-2">
                {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-14 w-full rounded-xl" />)}
              </div>
            ) : notebooks.length === 0 ? (
              <div className="text-center py-20 text-muted-foreground">
                <div className="mx-auto w-16 h-16 rounded-2xl bg-muted/60 flex items-center justify-center mb-4">
                  <Laptop className="h-7 w-7 text-muted-foreground/30" />
                </div>
                <p className="text-base font-semibold">Nenhum item encontrado</p>
                <p className="text-sm mt-1 text-muted-foreground/70">Cadastre um novo notebook ou altere os filtros.</p>
              </div>
            ) : (
              <>
                {/* Desktop table */}
                <div className="rounded-xl border border-border/50 overflow-x-auto hidden md:block">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/40 hover:bg-muted/40 border-b border-border/50">
                        <TableHead className="font-semibold text-[10px] uppercase tracking-widest text-muted-foreground w-12">Foto</TableHead>
                        <TableHead className="font-semibold text-[10px] uppercase tracking-widest text-muted-foreground">Patrimônio</TableHead>
                        <TableHead className="font-semibold text-[10px] uppercase tracking-widest text-muted-foreground">Modelo</TableHead>
                        <TableHead className="font-semibold text-[10px] uppercase tracking-widest text-muted-foreground">Seção</TableHead>
                        <TableHead className="font-semibold text-[10px] uppercase tracking-widest text-muted-foreground">Militar</TableHead>
                        <TableHead className="font-semibold text-[10px] uppercase tracking-widest text-muted-foreground">Status</TableHead>
                        <TableHead className="font-semibold text-[10px] uppercase tracking-widest text-muted-foreground text-right">Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {notebooks.map((nb) => (
                        <TableRow key={nb.id} className="hover:bg-muted/30 transition-colors duration-200 group border-b border-border/30 last:border-0">
                          <TableCell>
                            {nb.foto_url ? (
                              <img src={nb.foto_url} alt="Foto" className="h-9 w-9 rounded-lg object-cover cursor-pointer border border-border/50 hover:scale-110 transition-transform duration-200 shadow-sm" onClick={() => setViewItem(nb)} />
                            ) : (
                              <div className="h-9 w-9 rounded-lg bg-muted/50 flex items-center justify-center">
                                <Laptop className="h-4 w-4 text-muted-foreground/30" />
                              </div>
                            )}
                          </TableCell>
                          <TableCell className="font-mono font-semibold text-sm">{nb.patrimonio.startsWith('FC-') ? 'FORA DE CARGA' : nb.patrimonio}</TableCell>
                          <TableCell className="text-sm">{nb.modelo}</TableCell>
                          <TableCell className="text-sm text-muted-foreground">{nb.secao}</TableCell>
                          <TableCell className="text-sm text-muted-foreground">{nb.militar}</TableCell>
                          <TableCell>
                            <Badge variant={statusColor(nb.status) as any} className="text-[10px] font-medium">{nb.status}</Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-0.5 opacity-60 group-hover:opacity-100 transition-opacity duration-200">
                              <Button variant="ghost" size="icon" onClick={() => setViewItem(nb)} title="Visualizar" className="h-8 w-8 hover:text-primary hover:bg-primary/10 rounded-lg"><Eye className="h-3.5 w-3.5" /></Button>
                              <Button variant="ghost" size="icon" onClick={() => setQrItem(nb)} title="QR Code" className="h-8 w-8 hover:text-primary hover:bg-primary/10 rounded-lg"><QrCode className="h-3.5 w-3.5" /></Button>
                              <Button variant="ghost" size="icon" onClick={() => setCautelaDialogItem(nb)} title="Cautela" className="h-8 w-8 hover:text-primary hover:bg-primary/10 rounded-lg"><Printer className="h-3.5 w-3.5" /></Button>
                              <Button variant="ghost" size="icon" onClick={() => navigate(`/notebooks/${nb.id}/historico`)} title="Histórico" className="h-8 w-8 hover:text-primary hover:bg-primary/10 rounded-lg"><History className="h-3.5 w-3.5" /></Button>
                              {canEdit && (
                                <>
                                  <Button variant="ghost" size="icon" onClick={() => navigate(`/itens/${nb.id}/editar`)} title="Editar" className="h-8 w-8 hover:text-primary hover:bg-primary/10 rounded-lg"><Pencil className="h-3.5 w-3.5" /></Button>
                                  <Button variant="ghost" size="icon" onClick={() => setDeleteId(nb.id)} title="Excluir" className="h-8 w-8 text-destructive/60 hover:text-destructive hover:bg-destructive/10 rounded-lg"><Trash2 className="h-3.5 w-3.5" /></Button>
                                </>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                {/* Mobile card view */}
                <div className="space-y-3 md:hidden">
                  {notebooks.map((nb) => (
                    <Card key={nb.id} className="border-border/50 shadow-sm">
                      <CardContent className="p-4">
                        <div className="flex items-start gap-3">
                          {nb.foto_url ? (
                            <img src={nb.foto_url} alt="Foto" className="h-12 w-12 rounded-lg object-cover border border-border/50 shadow-sm shrink-0" onClick={() => setViewItem(nb)} />
                          ) : (
                            <div className="h-12 w-12 rounded-lg bg-muted/50 flex items-center justify-center shrink-0">
                              <Laptop className="h-5 w-5 text-muted-foreground/30" />
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between mb-1">
                              <span className="font-mono font-semibold text-sm">{nb.patrimonio}</span>
                              <Badge variant={statusColor(nb.status) as any} className="text-[10px] font-medium">{nb.status}</Badge>
                            </div>
                            <p className="text-sm truncate">{nb.modelo}</p>
                            <p className="text-xs text-muted-foreground mt-0.5">{nb.secao} • {nb.militar}</p>
                          </div>
                        </div>
                        <div className="flex justify-end gap-1 mt-3 pt-2 border-t border-border/30">
                          <Button variant="ghost" size="icon" onClick={() => setViewItem(nb)} className="h-8 w-8"><Eye className="h-3.5 w-3.5" /></Button>
                          <Button variant="ghost" size="icon" onClick={() => setQrItem(nb)} className="h-8 w-8"><QrCode className="h-3.5 w-3.5" /></Button>
                          <Button variant="ghost" size="icon" onClick={() => setCautelaDialogItem(nb)} className="h-8 w-8"><Printer className="h-3.5 w-3.5" /></Button>
                          <Button variant="ghost" size="icon" onClick={() => navigate(`/notebooks/${nb.id}/historico`)} className="h-8 w-8"><History className="h-3.5 w-3.5" /></Button>
                          {canEdit && (
                            <>
                              <Button variant="ghost" size="icon" onClick={() => navigate(`/itens/${nb.id}/editar`)} className="h-8 w-8"><Pencil className="h-3.5 w-3.5" /></Button>
                              <Button variant="ghost" size="icon" onClick={() => setDeleteId(nb.id)} className="h-8 w-8 text-destructive/60"><Trash2 className="h-3.5 w-3.5" /></Button>
                            </>
                          )}
                        </div>
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

      {/* View modal */}
      <Dialog open={!!viewItem} onOpenChange={() => setViewItem(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg gradient-primary">
                <Laptop className="h-4 w-4 text-primary-foreground" />
              </div>
              Detalhes do Notebook
            </DialogTitle>
          </DialogHeader>
          {viewItem && (
            <div className="space-y-4">
              {viewItem.foto_url && (
                <div className="rounded-xl overflow-hidden border border-border/50 bg-muted/30">
                  <img src={viewItem.foto_url} alt="Foto" className="w-full h-auto max-h-56 object-contain" />
                </div>
              )}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-0.5 font-medium">Patrimônio</p>
                  <p className="font-mono font-semibold text-sm">{viewItem.patrimonio}</p>
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-0.5 font-medium">Modelo</p>
                  <p className="font-semibold text-sm">{viewItem.modelo}</p>
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-0.5 font-medium">Seção</p>
                  <p className="font-semibold text-sm">{viewItem.secao}</p>
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-0.5 font-medium">Militar</p>
                  <p className="font-semibold text-sm">{viewItem.militar}</p>
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-0.5 font-medium">Status</p>
                  <Badge variant={statusColor(viewItem.status) as any} className="text-[10px]">{viewItem.status}</Badge>
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-0.5 font-medium">Atualizado</p>
                  <p className="text-xs">{new Date(viewItem.updated_at).toLocaleString('pt-BR')}</p>
                </div>
              </div>
              <div className="flex justify-center pt-2">
                <div className="p-3 bg-white rounded-xl shadow-sm">
                  <QRCodeSVG value={`${baseUrl}/consulta/${viewItem.patrimonio}`} size={110} />
                </div>
              </div>
              <p className="text-[10px] text-center text-muted-foreground">Escaneie para consulta rápida</p>
              <div className="flex justify-center">
                <Button variant="outline" size="sm" onClick={() => { setViewItem(null); setCautelaDialogItem(viewItem); }}>
                  <Printer className="h-3.5 w-3.5 mr-1.5" />Imprimir Cautela
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* QR Code modal */}
      <Dialog open={!!qrItem} onOpenChange={() => setQrItem(null)}>
        <DialogContent className="max-w-xs">
          <DialogHeader>
            <DialogTitle className="text-center">QR Code — {qrItem?.patrimonio}</DialogTitle>
          </DialogHeader>
          {qrItem && (
            <div className="flex flex-col items-center gap-4 py-4">
              <div className="p-5 bg-white rounded-2xl shadow-sm">
                <QRCodeSVG value={`${baseUrl}/consulta/${qrItem.patrimonio}`} size={180} />
              </div>
              <p className="text-sm text-muted-foreground text-center">
                Escaneie para abrir a consulta rápida
              </p>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Cautela responsible dialog */}
      <Dialog open={!!cautelaDialogItem} onOpenChange={() => setCautelaDialogItem(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg gradient-primary">
                <Printer className="h-4 w-4 text-primary-foreground" />
              </div>
              Imprimir Cautela
            </DialogTitle>
          </DialogHeader>
          {cautelaDialogItem && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Item: <strong className="text-foreground">{cautelaDialogItem.patrimonio.startsWith('FC-') ? 'FORA DE CARGA' : cautelaDialogItem.patrimonio}</strong> — {cautelaDialogItem.modelo}
              </p>
              <div className="space-y-2">
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Nome do responsável pela cautela</label>
                <Input
                  placeholder="Ex: Sgt Ferreira"
                  value={responsavelCautela}
                  onChange={e => setResponsavelCautela(e.target.value)}
                  className="h-10 bg-muted/30 border-border/60 focus:bg-background transition-all duration-200"
                />
                <p className="text-[10px] text-muted-foreground">Será impresso no campo de assinatura do responsável.</p>
              </div>
              <div className="flex gap-2 justify-end">
                <Button variant="outline" size="sm" onClick={() => setCautelaDialogItem(null)}>Cancelar</Button>
                <Button size="sm" onClick={() => { setCautelaItem(cautelaDialogItem); setCautelaDialogItem(null); }}>
                  <Printer className="h-3.5 w-3.5 mr-1.5" />Gerar Cautela
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>Tem certeza que deseja excluir este notebook? Esta ação não pode ser desfeita.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      </div>
    </PageTransition>
  );
}
