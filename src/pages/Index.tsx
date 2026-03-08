import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Plus, Pencil, Trash2, Search, Eye, History, QrCode, Laptop } from 'lucide-react';
import { toast } from 'sonner';

import { useSections } from '@/hooks/useSections';
import { QRCodeSVG } from 'qrcode.react';

type Notebook = {
  id: string;
  patrimonio: string;
  modelo: string;
  secao: string;
  militar: string;
  status: string;
  foto_url: string | null;
  created_at: string;
  updated_at: string;
};

const statusColor = (s: string) => {
  if (s === 'Em uso') return 'default';
  if (s === 'Em manutenção') return 'destructive';
  if (s === 'Baixado') return 'secondary';
  if (s === 'Em estoque') return 'outline';
  return 'default';
};

export default function Index() {
  const [searchParams] = useSearchParams();
  const [notebooks, setNotebooks] = useState<Notebook[]>([]);
  const [filterSecao, setFilterSecao] = useState(searchParams.get('secao') || 'all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [searchPatrimonio, setSearchPatrimonio] = useState('');
  const [loading, setLoading] = useState(true);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [viewItem, setViewItem] = useState<Notebook | null>(null);
  const [qrItem, setQrItem] = useState<Notebook | null>(null);
  const navigate = useNavigate();
  const { sections } = useSections();

  const fetchNotebooks = async () => {
    setLoading(true);
    let query = supabase.from('notebooks').select('*').order('created_at', { ascending: false });
    if (filterSecao !== 'all') query = query.eq('secao', filterSecao);
    if (filterStatus !== 'all') query = query.eq('status', filterStatus);
    if (searchPatrimonio.trim()) query = query.ilike('patrimonio', `%${searchPatrimonio.trim()}%`);
    const { data, error } = await query;
    if (error) toast.error('Erro ao carregar dados.');
    else setNotebooks((data as Notebook[]) || []);
    setLoading(false);
  };

  useEffect(() => { fetchNotebooks(); }, [filterSecao, filterStatus, searchPatrimonio]);

  const handleDelete = async () => {
    if (!deleteId) return;
    const { error } = await supabase.from('notebooks').delete().eq('id', deleteId);
    if (error) toast.error('Erro ao excluir item.');
    else { toast.success('Item excluído com sucesso.'); fetchNotebooks(); }
    setDeleteId(null);
  };

  const baseUrl = window.location.origin;

  return (
    <div className="container mx-auto py-6 px-4 animate-in-page">
        <Card>
          <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4">
            <CardTitle className="flex items-center gap-2.5 text-lg">
              <div className="p-2 rounded-lg bg-primary/10">
                <Laptop className="h-4 w-4 text-primary" />
              </div>
              Notebooks Cadastrados
            </CardTitle>
            <Button onClick={() => navigate('/itens/novo')} className="shadow-sm transition-all duration-200 hover:shadow-md">
              <Plus className="h-4 w-4 mr-1.5" />
              Novo Notebook
            </Button>
          </CardHeader>
          <CardContent>
            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-3 mb-5">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/60" />
                <Input placeholder="Buscar por patrimônio..." value={searchPatrimonio} onChange={(e) => setSearchPatrimonio(e.target.value)} className="pl-9 h-9 bg-muted/30 border-border/60 focus:bg-background transition-all duration-200" />
              </div>
              <Select value={filterSecao} onValueChange={setFilterSecao}>
                <SelectTrigger className="w-full sm:w-[200px] h-9 bg-muted/30 border-border/60">
                  <SelectValue placeholder="Filtrar por seção" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as seções</SelectItem>
                  {sections.map((s) => (<SelectItem key={s.id} value={s.name}>{s.name}</SelectItem>))}
                </SelectContent>
              </Select>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-full sm:w-[180px] h-9 bg-muted/30 border-border/60">
                  <SelectValue placeholder="Filtrar por status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os status</SelectItem>
                  <SelectItem value="Em uso">Em uso</SelectItem>
                  <SelectItem value="Em manutenção">Em manutenção</SelectItem>
                  <SelectItem value="Baixado">Baixado</SelectItem>
                  <SelectItem value="Em estoque">Em estoque</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {loading ? (
              <div className="space-y-2">
                {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-14 w-full rounded-lg" />)}
              </div>
            ) : notebooks.length === 0 ? (
              <div className="text-center py-20 text-muted-foreground animate-in-card">
                <div className="mx-auto w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mb-4">
                  <Laptop className="h-7 w-7 text-muted-foreground/40" />
                </div>
                <p className="text-base font-semibold">Nenhum item encontrado</p>
                <p className="text-sm mt-1">Cadastre um novo notebook ou altere os filtros.</p>
              </div>
            ) : (
              <div className="rounded-xl border overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50 hover:bg-muted/50 border-b">
                      <TableHead className="font-semibold text-xs uppercase tracking-wider w-12">Foto</TableHead>
                      <TableHead className="font-semibold text-xs uppercase tracking-wider">Patrimônio</TableHead>
                      <TableHead className="font-semibold text-xs uppercase tracking-wider">Modelo</TableHead>
                      <TableHead className="font-semibold text-xs uppercase tracking-wider hidden md:table-cell">Seção</TableHead>
                      <TableHead className="font-semibold text-xs uppercase tracking-wider hidden md:table-cell">Militar</TableHead>
                      <TableHead className="font-semibold text-xs uppercase tracking-wider">Status</TableHead>
                      <TableHead className="font-semibold text-xs uppercase tracking-wider text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {notebooks.map((nb, idx) => (
                      <TableRow key={nb.id} className="hover:bg-muted/30 transition-colors duration-150 group" style={{ animationDelay: `${idx * 20}ms` }}>
                        <TableCell>
                          {nb.foto_url ? (
                            <img src={nb.foto_url} alt="Foto" className="h-9 w-9 rounded-lg object-cover cursor-pointer border hover:scale-110 transition-transform duration-200 shadow-sm" onClick={() => setViewItem(nb)} />
                          ) : (
                            <div className="h-9 w-9 rounded-lg bg-muted flex items-center justify-center">
                              <Laptop className="h-4 w-4 text-muted-foreground/40" />
                            </div>
                          )}
                        </TableCell>
                        <TableCell className="font-mono font-semibold text-sm">{nb.patrimonio}</TableCell>
                        <TableCell className="text-sm">{nb.modelo}</TableCell>
                        <TableCell className="text-sm hidden md:table-cell text-muted-foreground">{nb.secao}</TableCell>
                        <TableCell className="text-sm hidden md:table-cell text-muted-foreground">{nb.militar}</TableCell>
                        <TableCell>
                          <Badge variant={statusColor(nb.status) as any} className="text-[10px] font-medium">{nb.status}</Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-0.5 opacity-70 group-hover:opacity-100 transition-opacity duration-150">
                            <Button variant="ghost" size="icon" onClick={() => setViewItem(nb)} title="Visualizar" className="h-8 w-8 hover:text-primary hover:bg-primary/10 transition-all duration-200">
                              <Eye className="h-3.5 w-3.5" />
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => setQrItem(nb)} title="QR Code" className="h-8 w-8 hover:text-primary hover:bg-primary/10 transition-all duration-200">
                              <QrCode className="h-3.5 w-3.5" />
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => navigate(`/notebooks/${nb.id}/historico`)} title="Histórico" className="h-8 w-8 hover:text-primary hover:bg-primary/10 transition-all duration-200 hidden sm:flex">
                              <History className="h-3.5 w-3.5" />
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => navigate(`/itens/${nb.id}/editar`)} title="Editar" className="h-8 w-8 hover:text-primary hover:bg-primary/10 transition-all duration-200">
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => setDeleteId(nb.id)} title="Excluir" className="h-8 w-8 text-destructive/70 hover:text-destructive hover:bg-destructive/10 transition-all duration-200">
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}

            {!loading && notebooks.length > 0 && (
              <p className="text-xs text-muted-foreground mt-3 font-medium">{notebooks.length} registro(s) encontrado(s)</p>
            )}
          </CardContent>
        </Card>
      </Card>

      {/* View modal */}
      <Dialog open={!!viewItem} onOpenChange={() => setViewItem(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Laptop className="h-5 w-5 text-primary" />
              Detalhes do Notebook
            </DialogTitle>
          </DialogHeader>
          {viewItem && (
            <div className="space-y-4 animate-in-card">
              {viewItem.foto_url && (
                <div className="rounded-xl overflow-hidden border bg-muted">
                  <img src={viewItem.foto_url} alt="Foto" className="w-full h-auto max-h-56 object-contain" />
                </div>
              )}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-0.5 font-medium">Patrimônio</p>
                  <p className="font-mono font-semibold text-sm">{viewItem.patrimonio}</p>
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-0.5 font-medium">Modelo</p>
                  <p className="font-semibold text-sm">{viewItem.modelo}</p>
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-0.5 font-medium">Seção</p>
                  <p className="font-semibold text-sm">{viewItem.secao}</p>
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-0.5 font-medium">Militar</p>
                  <p className="font-semibold text-sm">{viewItem.militar}</p>
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-0.5 font-medium">Status</p>
                  <Badge variant={statusColor(viewItem.status) as any} className="text-[10px]">{viewItem.status}</Badge>
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-0.5 font-medium">Atualizado</p>
                  <p className="text-xs">{new Date(viewItem.updated_at).toLocaleString('pt-BR')}</p>
                </div>
              </div>
              <div className="flex justify-center pt-2">
                <div className="p-3 bg-white rounded-xl shadow-sm">
                  <QRCodeSVG value={`${baseUrl}/consulta/${viewItem.patrimonio}`} size={110} />
                </div>
              </div>
              <p className="text-[10px] text-center text-muted-foreground">Escaneie para consulta rápida</p>
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
            <div className="flex flex-col items-center gap-4 py-4 animate-in-card">
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

      {/* Delete dialog */}
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
  );
}
