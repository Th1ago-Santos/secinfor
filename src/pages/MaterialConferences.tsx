import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { ClipboardList, Plus, Search, ArrowLeft, Ban } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import PageTransition from '@/components/PageTransition';
import PageHeader from '@/components/PageHeader';
import EmptyState from '@/components/EmptyState';
import { useSections } from '@/hooks/useSections';
import { useUserRole } from '@/hooks/useUserRole';
import { useAuth } from '@/hooks/useAuth';
import { logAudit } from '@/lib/audit';
import { orNaoInformado } from '@/lib/currency';
import {
  CONFERENCE_STATUSES, CONFERENCE_STATUS_LABELS, conferenceBadgeClass,
  type ConferenceRow,
} from '@/lib/conferenceStatus';

const ALL = 'all';

type Counts = { total: number; conferido: number; pendente: number };

export default function MaterialConferences() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { sections } = useSections();
  const { canEdit, sectionScope, isAdmin } = useUserRole();
  const { user } = useAuth();

  const [busca, setBusca] = useState('');
  const [secao, setSecao] = useState(ALL);
  const [status, setStatus] = useState(ALL);
  const [responsavel, setResponsavel] = useState('');
  const [de, setDe] = useState('');
  const [ate, setAte] = useState('');

  const [novaOpen, setNovaOpen] = useState(false);
  const [novaSecao, setNovaSecao] = useState('');
  const [novoTitulo, setNovoTitulo] = useState('');
  const [novaObs, setNovaObs] = useState('');
  const [criando, setCriando] = useState(false);
  const [cancelId, setCancelId] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['material-conferences'],
    queryFn: async () => {
      const { data: confs, error } = await supabase
        .from('material_conferences').select('*').order('started_at', { ascending: false });
      if (error) { toast.error('Erro ao carregar conferências.'); throw error; }
      const { data: items } = await supabase
        .from('material_conference_items').select('conference_id, status');
      const counts = new Map<string, Counts>();
      (items || []).forEach((it: { conference_id: string; status: string }) => {
        const c = counts.get(it.conference_id) ?? { total: 0, conferido: 0, pendente: 0 };
        c.total += 1;
        if (it.status === 'conferido') c.conferido += 1;
        if (it.status === 'pendente') c.pendente += 1;
        counts.set(it.conference_id, c);
      });
      return { confs: (confs || []) as unknown as ConferenceRow[], counts };
    },
    staleTime: 10_000,
  });

  const confs = data?.confs ?? [];
  const counts = data?.counts ?? new Map<string, Counts>();

  const filtered = useMemo(() => confs.filter((c) => {
    const q = busca.trim().toLowerCase();
    if (q && !`${c.title ?? ''} ${c.notes ?? ''}`.toLowerCase().includes(q)) return false;
    if (secao !== ALL && (c.section_name ?? '') !== secao) return false;
    if (status !== ALL && c.status !== status) return false;
    if (responsavel.trim() && !(c.responsible_name ?? '').toLowerCase().includes(responsavel.trim().toLowerCase())) return false;
    if (de && new Date(c.started_at) < new Date(`${de}T00:00:00`)) return false;
    if (ate && new Date(c.started_at) > new Date(`${ate}T23:59:59`)) return false;
    return true;
  }), [confs, busca, secao, status, responsavel, de, ate]);

  const criarConferencia = async () => {
    if (!novaSecao) { toast.error('Escolha a seção da conferência.'); return; }
    setCriando(true);
    try {
      const { data: materiais, error: matErr } = await supabase
        .from('materials').select('*').eq('section_name', novaSecao);
      if (matErr) throw matErr;
      if (!materiais || materiais.length === 0) {
        toast.error('Nenhum material vinculado a esta seção.');
        setCriando(false);
        return;
      }

      const secId = sections.find((s) => s.name === novaSecao)?.id ?? null;
      const titulo = novoTitulo.trim() || `Conferência ${novaSecao} — ${format(new Date(), 'dd/MM/yyyy')}`;

      const { data: conf, error } = await supabase.from('material_conferences').insert({
        section_id: secId,
        section_name: novaSecao,
        title: titulo,
        status: 'em_andamento',
        responsible_user_id: user?.id ?? null,
        responsible_name: user?.email ?? null,
        notes: novaObs.trim() || null,
      }).select().single();
      if (error) throw error;

      const snapshot = (materiais as Record<string, unknown>[]).map((m) => ({
        conference_id: conf.id,
        material_id: m.id as string,
        numero_ficha: (m.numero_ficha as string) ?? null,
        patrimonio: (m.patrimonio as string) ?? null,
        codigo_material: (m.codigo_material as string) ?? null,
        nome_material: (m.nome as string) ?? null,
        section_id: (m.section_id as string) ?? secId,
        section_name: (m.section_name as string) ?? novaSecao,
        responsavel: (m.responsavel as string) ?? null,
        situacao_material: (m.situacao as string) ?? null,
        quantidade: (m.quantidade as number) ?? 1,
        valor_unitario: (m.valor_unitario as number) ?? null,
        status: 'pendente',
      }));
      const { error: itemsErr } = await supabase.from('material_conference_items').insert(snapshot);
      if (itemsErr) throw itemsErr;

      await logAudit({
        action: 'conferência de carga criada',
        entityType: 'material_conferences',
        entityId: conf.id,
        entityLabel: titulo,
        eventType: 'inventario',
        severity: 'medio',
        newValue: 'em_andamento',
        details: { secao: novaSecao, itens_esperados: snapshot.length },
      });

      toast.success(`Conferência criada com ${snapshot.length} itens esperados.`);
      setNovaOpen(false);
      setNovaSecao(''); setNovoTitulo(''); setNovaObs('');
      qc.invalidateQueries({ queryKey: ['material-conferences'] });
      navigate(`/materiais/conferencias/${conf.id}`);
    } catch {
      toast.error('Não foi possível criar a conferência.');
    } finally {
      setCriando(false);
    }
  };

  const cancelar = async () => {
    if (!cancelId) return;
    const alvo = confs.find((c) => c.id === cancelId);
    const { error } = await supabase.from('material_conferences')
      .update({ status: 'cancelada', cancelled_at: new Date().toISOString() })
      .eq('id', cancelId);
    if (error) { toast.error('Não foi possível cancelar.'); return; }
    await logAudit({
      action: 'conferência de carga cancelada',
      entityType: 'material_conferences',
      entityId: cancelId,
      entityLabel: alvo?.title ?? null,
      eventType: 'inventario',
      severity: 'alto',
      oldValue: alvo?.status ?? null,
      newValue: 'cancelada',
      details: { secao: alvo?.section_name ?? null },
    });
    toast.success('Conferência cancelada.');
    setCancelId(null);
    qc.invalidateQueries({ queryKey: ['material-conferences'] });
  };

  const inputCls = 'h-9 bg-muted/30 border-border/50 focus:bg-background transition-all duration-300';

  return (
    <PageTransition>
      <div className="container mx-auto py-6 px-4">
        <PageHeader
          icon={ClipboardList}
          title="Conferência de Carga"
          description={sectionScope ? `Escopo da seção ${sectionScope}` : 'Histórico de conferências de material por seção'}
          actions={
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" onClick={() => navigate('/materiais')}>
                <ArrowLeft className="h-4 w-4 mr-1.5" /> Materiais
              </Button>
              {canEdit && (
                <Button onClick={() => setNovaOpen(true)}>
                  <Plus className="h-4 w-4 mr-1.5" /> Nova Conferência
                </Button>
              )}
            </div>
          }
        />

        <Card className="shadow-card border-border/50 mb-5">
          <CardContent className="pt-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/50" />
                <Input placeholder="Título ou observação..." value={busca} onChange={(e) => setBusca(e.target.value)} className={`pl-9 ${inputCls}`} />
              </div>
              <Select value={secao} onValueChange={setSecao}>
                <SelectTrigger className={inputCls}><SelectValue placeholder="Seção" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL}>Todas as seções</SelectItem>
                  {sections.map((s) => <SelectItem key={s.id} value={s.name}>{s.name}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger className={inputCls}><SelectValue placeholder="Status" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL}>Todos os status</SelectItem>
                  {CONFERENCE_STATUSES.map((s) => (
                    <SelectItem key={s} value={s}>{CONFERENCE_STATUS_LABELS[s]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input placeholder="Responsável" value={responsavel} onChange={(e) => setResponsavel(e.target.value)} className={inputCls} />
              <div className="grid grid-cols-2 gap-3">
                <Input type="date" value={de} onChange={(e) => setDe(e.target.value)} className={inputCls} />
                <Input type="date" value={ate} onChange={(e) => setAte(e.target.value)} className={inputCls} />
              </div>
            </div>
          </CardContent>
        </Card>

        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-16 rounded-xl" />)}
          </div>
        ) : filtered.length === 0 ? (
          <Card className="shadow-card border-border/50">
            <CardContent className="p-0">
              <EmptyState
                icon={ClipboardList}
                title="Nenhuma conferência encontrada"
                description={canEdit ? 'Crie uma nova conferência para iniciar a checagem dos materiais de uma seção.' : 'Ainda não há conferências no seu escopo.'}
                action={canEdit ? <Button onClick={() => setNovaOpen(true)}><Plus className="h-4 w-4 mr-1.5" /> Nova Conferência</Button> : undefined}
              />
            </CardContent>
          </Card>
        ) : (
          <Card className="shadow-card border-border/50">
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Conferência</TableHead>
                      <TableHead>Seção</TableHead>
                      <TableHead>Responsável</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Abertura</TableHead>
                      <TableHead>Conclusão</TableHead>
                      <TableHead className="min-w-[160px]">Progresso</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.map((c) => {
                      const ct = counts.get(c.id) ?? { total: 0, conferido: 0, pendente: 0 };
                      const pct = ct.total === 0 ? 0 : Math.round((ct.conferido / ct.total) * 100);
                      return (
                        <TableRow key={c.id} className="hover:bg-muted/40">
                          <TableCell className="text-sm font-medium max-w-[240px] truncate">
                            {orNaoInformado(c.title)}
                          </TableCell>
                          <TableCell className="text-sm">{orNaoInformado(c.section_name)}</TableCell>
                          <TableCell className="text-xs text-muted-foreground">{orNaoInformado(c.responsible_name)}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className={conferenceBadgeClass(c.status)}>
                              {CONFERENCE_STATUS_LABELS[c.status] ?? c.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-xs font-mono">{format(new Date(c.started_at), 'dd/MM/yyyy HH:mm')}</TableCell>
                          <TableCell className="text-xs font-mono">
                            {c.completed_at ? format(new Date(c.completed_at), 'dd/MM/yyyy HH:mm') : '—'}
                          </TableCell>
                          <TableCell>
                            <div className="space-y-1">
                              <Progress value={pct} className="h-1.5" />
                              <p className="text-[10px] text-muted-foreground font-mono">
                                {ct.conferido}/{ct.total} · {pct}% · {ct.pendente} pendente(s)
                              </p>
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-1.5">
                              <Button size="sm" variant="outline" onClick={() => navigate(`/materiais/conferencias/${c.id}`)}>
                                Abrir
                              </Button>
                              {isAdmin && c.status !== 'cancelada' && c.status !== 'concluida' && (
                                <Button size="sm" variant="ghost" onClick={() => setCancelId(c.id)} title="Cancelar">
                                  <Ban className="h-3.5 w-3.5" />
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
            </CardContent>
          </Card>
        )}
      </div>

      <Dialog open={novaOpen} onOpenChange={setNovaOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nova Conferência de Carga</DialogTitle>
            <DialogDescription>
              Os materiais vinculados à seção escolhida serão copiados para a conferência.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>Seção</Label>
              <Select value={novaSecao} onValueChange={setNovaSecao}>
                <SelectTrigger><SelectValue placeholder="Escolha a seção" /></SelectTrigger>
                <SelectContent>
                  {sections.map((s) => <SelectItem key={s.id} value={s.name}>{s.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Título (opcional)</Label>
              <Input value={novoTitulo} onChange={(e) => setNovoTitulo(e.target.value)} placeholder="Gerado automaticamente se vazio" />
            </div>
            <div className="space-y-1.5">
              <Label>Observação (opcional)</Label>
              <Textarea value={novaObs} onChange={(e) => setNovaObs(e.target.value)} rows={3} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNovaOpen(false)}>Cancelar</Button>
            <Button onClick={criarConferencia} disabled={criando}>
              {criando ? 'Criando...' : 'Criar conferência'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!cancelId} onOpenChange={(o) => !o && setCancelId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancelar conferência?</AlertDialogTitle>
            <AlertDialogDescription>
              Os itens já conferidos são preservados, mas a conferência ficará bloqueada para edição.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Voltar</AlertDialogCancel>
            <AlertDialogAction onClick={cancelar}>Cancelar conferência</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </PageTransition>
  );
}
