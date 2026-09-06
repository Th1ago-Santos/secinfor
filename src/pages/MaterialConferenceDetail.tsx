import { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { ClipboardCheck, ArrowLeft, FileDown, CheckCircle2, RotateCcw, Ban, Search } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import PageTransition from '@/components/PageTransition';
import PageHeader from '@/components/PageHeader';
import EmptyState from '@/components/EmptyState';
import { useUserRole } from '@/hooks/useUserRole';
import { useAuth } from '@/hooks/useAuth';
import { logAudit } from '@/lib/audit';
import { formatCurrency, formatCurrencyStrict, orNaoInformado, totalValue, toNumberOrNull } from '@/lib/currency';
import { situacaoBadgeClass, MATERIAL_SITUACOES } from '@/lib/materialSituacao';
import { generatePDFReport } from '@/lib/pdfExport';
import {
  CONFERENCE_STATUS_LABELS, conferenceBadgeClass, isEditableStatus,
  ITEM_STATUSES, ITEM_STATUS_LABELS, ITEM_STATUS_RGB, itemBadgeClass,
  type ConferenceItemRow, type ConferenceRow,
} from '@/lib/conferenceStatus';

const ALL = 'all';

export default function MaterialConferenceDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { canEdit } = useUserRole();
  const { user } = useAuth();

  const [busca, setBusca] = useState('');
  const [fStatus, setFStatus] = useState(ALL);
  const [fSituacao, setFSituacao] = useState(ALL);
  const [fSecao, setFSecao] = useState(ALL);
  const [fResponsavel, setFResponsavel] = useState('');
  const [savingId, setSavingId] = useState<string | null>(null);
  const [obsDraft, setObsDraft] = useState<Record<string, string>>({});
  const [confirmAction, setConfirmAction] = useState<null | 'concluir' | 'reabrir' | 'cancelar'>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['material-conference', id],
    enabled: !!id,
    queryFn: async () => {
      const { data: conf, error } = await supabase
        .from('material_conferences').select('*').eq('id', id!).maybeSingle();
      if (error) throw error;
      const { data: items, error: itErr } = await supabase
        .from('material_conference_items').select('*').eq('conference_id', id!)
        .order('numero_ficha', { ascending: true });
      if (itErr) throw itErr;
      return {
        conf: (conf as unknown as ConferenceRow | null),
        items: (items || []) as unknown as ConferenceItemRow[],
      };
    },
  });

  const conf = data?.conf ?? null;
  const items = useMemo(() => data?.items ?? [], [data]);
  const editable = !!conf && isEditableStatus(conf.status) && canEdit;

  const secoes = useMemo(
    () => Array.from(new Set(items.map((i) => i.section_name).filter(Boolean) as string[])).sort(),
    [items],
  );

  const filtered = useMemo(() => items.filter((i) => {
    const q = busca.trim().toLowerCase();
    if (q) {
      const hay = `${i.numero_ficha ?? ''} ${i.patrimonio ?? ''} ${i.codigo_material ?? ''} ${i.nome_material ?? ''}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    if (fStatus !== ALL && i.status !== fStatus) return false;
    if (fSituacao !== ALL && (i.situacao_material ?? '') !== fSituacao) return false;
    if (fSecao !== ALL && (i.section_name ?? '') !== fSecao) return false;
    if (fResponsavel.trim() && !(i.responsavel ?? '').toLowerCase().includes(fResponsavel.trim().toLowerCase())) return false;
    return true;
  }), [items, busca, fStatus, fSituacao, fSecao, fResponsavel]);

  const kpi = useMemo(() => {
    const by = (s: string) => items.filter((i) => i.status === s);
    const val = (list: ConferenceItemRow[]) =>
      list.reduce((acc, i) => acc + (totalValue(i.valor_unitario, i.quantidade) ?? 0), 0);
    const total = items.length;
    const conferido = by('conferido').length;
    return {
      total,
      conferido,
      faltando: by('faltando').length,
      divergente: by('divergente').length,
      fora: by('fora_da_secao').length,
      semResp: by('sem_responsavel').length,
      incompleto: by('cadastro_incompleto').length,
      pendente: by('pendente').length,
      pct: total === 0 ? 0 : Math.round((conferido / total) * 100),
      valorTotal: val(items),
      valorConferido: val(by('conferido')),
      valorFaltante: val(by('faltando')),
      valorDivergente: val(by('divergente')),
      semValor: items.filter((i) => toNumberOrNull(i.valor_unitario) === null).length,
    };
  }, [items]);

  const refresh = () => qc.invalidateQueries({ queryKey: ['material-conference', id] });

  const salvarItem = async (item: ConferenceItemRow, patch: { status?: string; observation?: string }) => {
    if (!editable) { toast.error('Conferência bloqueada para edição.'); return; }
    setSavingId(item.id);
    const payload: Record<string, unknown> = {
      ...patch,
      checked_by: user?.id ?? null,
      checked_at: new Date().toISOString(),
    };
    const { error } = await supabase.from('material_conference_items').update(payload).eq('id', item.id);
    setSavingId(null);
    if (error) { toast.error('Não foi possível salvar o item.'); return; }
    await logAudit({
      action: patch.status ? 'status de item de conferência alterado' : 'observação de item de conferência alterada',
      entityType: 'material_conference_items',
      entityId: item.id,
      entityLabel: item.patrimonio ?? item.nome_material ?? null,
      eventType: 'inventario',
      severity: 'medio',
      oldValue: patch.status ? item.status : (item.observation ?? null),
      newValue: patch.status ?? (patch.observation ?? null),
      details: { conferencia_id: item.conference_id, secao: item.section_name },
    });
    toast.success(patch.status ? 'Status do item atualizado.' : 'Observação salva.');
    refresh();
  };

  const mudarStatusConferencia = async (acao: 'concluir' | 'reabrir' | 'cancelar') => {
    if (!conf || !canEdit) return;
    const now = new Date().toISOString();
    const map = {
      concluir: { status: 'concluida', completed_at: now },
      reabrir: { status: 'reaberta', reopened_at: now },
      cancelar: { status: 'cancelada', cancelled_at: now },
    } as const;
    const { error } = await supabase.from('material_conferences').update(map[acao]).eq('id', conf.id);
    if (error) { toast.error('Não foi possível atualizar a conferência.'); return; }
    await logAudit({
      action: `conferência de carga ${acao === 'concluir' ? 'concluída' : acao === 'reabrir' ? 'reaberta' : 'cancelada'}`,
      entityType: 'material_conferences',
      entityId: conf.id,
      entityLabel: conf.title ?? null,
      eventType: 'inventario',
      severity: acao === 'reabrir' ? 'medio' : 'alto',
      oldValue: conf.status,
      newValue: map[acao].status,
      details: { secao: conf.section_name, pendentes: kpi.pendente },
    });
    toast.success('Conferência atualizada.');
    setConfirmAction(null);
    refresh();
    qc.invalidateQueries({ queryKey: ['material-conferences'] });
  };

  const exportarPDF = () => {
    if (!conf) return;
    const filtros: string[] = [];
    if (busca.trim()) filtros.push(`Busca: ${busca.trim()}`);
    if (fStatus !== ALL) filtros.push(`Status do item: ${ITEM_STATUS_LABELS[fStatus]}`);
    if (fSituacao !== ALL) filtros.push(`Situação: ${fSituacao}`);
    if (fSecao !== ALL) filtros.push(`Seção: ${fSecao}`);
    if (fResponsavel.trim()) filtros.push(`Responsável: ${fResponsavel.trim()}`);
    if (filtros.length === 0) filtros.push('Todos os itens da conferência');

    generatePDFReport({
      title: 'Relatório Final de Conferência de Carga',
      subtitle: `${orNaoInformado(conf.title)} · ${CONFERENCE_STATUS_LABELS[conf.status] ?? conf.status}`,
      section: conf.section_name,
      emitter: user?.email ?? null,
      filters: [
        ...filtros,
        `Abertura: ${format(new Date(conf.started_at), 'dd/MM/yyyy HH:mm')}`,
        conf.completed_at ? `Conclusão: ${format(new Date(conf.completed_at), 'dd/MM/yyyy HH:mm')}` : 'Conclusão: Não informado',
        `Responsável: ${orNaoInformado(conf.responsible_name)}`,
      ],
      summary: [
        { label: 'Total esperado', value: kpi.total },
        { label: 'Conferidos', value: kpi.conferido },
        { label: 'Faltando', value: kpi.faltando },
        { label: 'Divergentes', value: kpi.divergente },
        { label: 'Fora da seção', value: kpi.fora },
        { label: 'Sem responsável', value: kpi.semResp },
        { label: 'Cadastro incompleto', value: kpi.incompleto },
        { label: '% conferido', value: `${kpi.pct}%` },
        { label: 'Valor total', value: formatCurrencyStrict(kpi.valorTotal) },
        { label: 'Valor conferido', value: formatCurrencyStrict(kpi.valorConferido) },
        { label: 'Valor faltante', value: formatCurrencyStrict(kpi.valorFaltante) },
        { label: 'Valor divergente', value: formatCurrencyStrict(kpi.valorDivergente) },
      ],
      columns: ['Nº Ficha', 'Patrimônio', 'Código', 'Nome', 'Responsável', 'Situação Material', 'Status Conferência', 'Valor', 'Observação'],
      rows: filtered.map((i) => [
        orNaoInformado(i.numero_ficha),
        orNaoInformado(i.patrimonio),
        orNaoInformado(i.codigo_material),
        orNaoInformado(i.nome_material),
        orNaoInformado(i.responsavel),
        orNaoInformado(i.situacao_material),
        ITEM_STATUS_LABELS[i.status] ?? i.status,
        formatCurrency(totalValue(i.valor_unitario, i.quantidade)),
        orNaoInformado(i.observation),
      ]),
      colorColumnIndex: 6,
      colorMap: ITEM_STATUS_RGB,
      columnWidths: { 3: 45, 8: 45 },
      orientation: 'landscape',
      filename: `conferencia_carga_${(conf.section_name ?? 'geral').replace(/\s+/g, '_')}`,
    });

    logAudit({
      action: 'relatório final de conferência exportado',
      entityType: 'material_conferences',
      entityId: conf.id,
      entityLabel: conf.title ?? null,
      eventType: 'inventario',
      severity: 'medio',
      details: { secao: conf.section_name, itens: filtered.length },
    });
  };

  const inputCls = 'h-9 bg-muted/30 border-border/50 focus:bg-background transition-all duration-300';

  if (isLoading) {
    return (
      <PageTransition>
        <div className="container mx-auto py-6 px-4 space-y-3">
          <Skeleton className="h-20 rounded-xl" />
          {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-14 rounded-xl" />)}
        </div>
      </PageTransition>
    );
  }

  if (!conf) {
    return (
      <PageTransition>
        <div className="container mx-auto py-6 px-4">
          <Card className="shadow-card border-border/50">
            <CardContent className="p-0">
              <EmptyState
                icon={ClipboardCheck}
                title="Conferência não encontrada"
                description="Ela pode ter sido removida ou está fora do seu escopo de acesso."
                action={<Button onClick={() => navigate('/materiais/conferencias')}>Voltar</Button>}
              />
            </CardContent>
          </Card>
        </div>
      </PageTransition>
    );
  }

  const kpiCards: { label: string; value: string | number; tone?: string }[] = [
    { label: 'Total esperado', value: kpi.total },
    { label: 'Conferidos', value: kpi.conferido, tone: 'text-emerald-600 dark:text-emerald-400' },
    { label: 'Pendentes', value: kpi.pendente },
    { label: 'Faltando', value: kpi.faltando, tone: 'text-destructive' },
    { label: 'Divergentes', value: kpi.divergente, tone: 'text-orange-600 dark:text-orange-400' },
    { label: 'Fora da seção', value: kpi.fora, tone: 'text-purple-600 dark:text-purple-400' },
    { label: 'Sem responsável', value: kpi.semResp, tone: 'text-amber-600 dark:text-amber-400' },
    { label: 'Cadastro incompleto', value: kpi.incompleto, tone: 'text-yellow-600 dark:text-yellow-500' },
    { label: 'Valor patrimonial', value: formatCurrencyStrict(kpi.valorTotal) },
    { label: 'Valor conferido', value: formatCurrencyStrict(kpi.valorConferido) },
    { label: 'Valor faltante', value: formatCurrencyStrict(kpi.valorFaltante) },
    { label: 'Sem valor informado', value: kpi.semValor },
  ];

  return (
    <PageTransition>
      <div className="container mx-auto py-6 px-4">
        <PageHeader
          icon={ClipboardCheck}
          title={orNaoInformado(conf.title)}
          description={`${orNaoInformado(conf.section_name)} · Responsável: ${orNaoInformado(conf.responsible_name)}`}
          actions={
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" onClick={() => navigate('/materiais/conferencias')}>
                <ArrowLeft className="h-4 w-4 mr-1.5" /> Voltar
              </Button>
              <Button variant="outline" onClick={exportarPDF}>
                <FileDown className="h-4 w-4 mr-1.5" /> Exportar PDF
              </Button>
              {canEdit && isEditableStatus(conf.status) && (
                <>
                  <Button onClick={() => setConfirmAction('concluir')}>
                    <CheckCircle2 className="h-4 w-4 mr-1.5" /> Concluir
                  </Button>
                  <Button variant="ghost" onClick={() => setConfirmAction('cancelar')}>
                    <Ban className="h-4 w-4 mr-1.5" /> Cancelar
                  </Button>
                </>
              )}
              {canEdit && (conf.status === 'concluida' || conf.status === 'cancelada') && (
                <Button variant="outline" onClick={() => setConfirmAction('reabrir')}>
                  <RotateCcw className="h-4 w-4 mr-1.5" /> Reabrir
                </Button>
              )}
            </div>
          }
        />

        <Card className="shadow-card border-border/50 mb-5">
          <CardContent className="pt-5 space-y-4">
            <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
              <Badge variant="outline" className={conferenceBadgeClass(conf.status)}>
                {CONFERENCE_STATUS_LABELS[conf.status] ?? conf.status}
              </Badge>
              <span className="font-mono">Abertura: {format(new Date(conf.started_at), 'dd/MM/yyyy HH:mm')}</span>
              {conf.completed_at && (
                <span className="font-mono">Conclusão: {format(new Date(conf.completed_at), 'dd/MM/yyyy HH:mm')}</span>
              )}
              {conf.reopened_at && (
                <span className="font-mono">Reabertura: {format(new Date(conf.reopened_at), 'dd/MM/yyyy HH:mm')}</span>
              )}
              {!editable && <span>Edição bloqueada</span>}
            </div>
            <div className="space-y-1">
              <Progress value={kpi.pct} className="h-2" />
              <p className="text-[11px] text-muted-foreground font-mono">
                {kpi.conferido}/{kpi.total} conferidos · {kpi.pct}%
              </p>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              {kpiCards.map((c) => (
                <div key={c.label} className="rounded-xl border border-border/50 bg-muted/20 p-3">
                  <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{c.label}</p>
                  <p className={`text-base font-bold ${c.tone ?? ''}`}>{c.value}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-card border-border/50 mb-5">
          <CardContent className="pt-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/50" />
                <Input placeholder="Ficha, patrimônio, código ou nome..." value={busca} onChange={(e) => setBusca(e.target.value)} className={`pl-9 ${inputCls}`} />
              </div>
              <Select value={fStatus} onValueChange={setFStatus}>
                <SelectTrigger className={inputCls}><SelectValue placeholder="Status do item" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL}>Todos os status</SelectItem>
                  {ITEM_STATUSES.map((s) => <SelectItem key={s} value={s}>{ITEM_STATUS_LABELS[s]}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={fSituacao} onValueChange={setFSituacao}>
                <SelectTrigger className={inputCls}><SelectValue placeholder="Situação do material" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL}>Todas as situações</SelectItem>
                  {MATERIAL_SITUACOES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={fSecao} onValueChange={setFSecao}>
                <SelectTrigger className={inputCls}><SelectValue placeholder="Seção" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL}>Todas as seções</SelectItem>
                  {secoes.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
              <Input placeholder="Responsável" value={fResponsavel} onChange={(e) => setFResponsavel(e.target.value)} className={inputCls} />
            </div>
          </CardContent>
        </Card>

        {filtered.length === 0 ? (
          <Card className="shadow-card border-border/50">
            <CardContent className="p-0">
              <EmptyState
                icon={ClipboardCheck}
                title="Nenhum item encontrado"
                description="Ajuste os filtros para visualizar os materiais desta conferência."
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
                      <TableHead>Nº Ficha</TableHead>
                      <TableHead>Patrimônio</TableHead>
                      <TableHead>Código</TableHead>
                      <TableHead>Material</TableHead>
                      <TableHead>Seção</TableHead>
                      <TableHead>Responsável</TableHead>
                      <TableHead>Situação</TableHead>
                      <TableHead className="text-right">Qtd</TableHead>
                      <TableHead className="text-right">Valor unit.</TableHead>
                      <TableHead className="min-w-[170px]">Status conferência</TableHead>
                      <TableHead className="min-w-[220px]">Observação</TableHead>
                      <TableHead>Conferido em</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.map((i) => {
                      const critico = ['faltando', 'divergente', 'fora_da_secao'].includes(i.status);
                      const obs = obsDraft[i.id] ?? i.observation ?? '';
                      const precisaObs = i.status === 'divergente' && !obs.trim();
                      return (
                        <TableRow key={i.id} className={critico ? 'bg-destructive/[0.04]' : 'hover:bg-muted/40'}>
                          <TableCell className="text-xs font-mono">{orNaoInformado(i.numero_ficha)}</TableCell>
                          <TableCell className="text-xs font-mono">{orNaoInformado(i.patrimonio)}</TableCell>
                          <TableCell className="text-xs font-mono">{orNaoInformado(i.codigo_material)}</TableCell>
                          <TableCell className="text-sm max-w-[220px] truncate">{orNaoInformado(i.nome_material)}</TableCell>
                          <TableCell className="text-xs">{orNaoInformado(i.section_name)}</TableCell>
                          <TableCell className="text-xs">{orNaoInformado(i.responsavel)}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className={situacaoBadgeClass(i.situacao_material)}>
                              {orNaoInformado(i.situacao_material)}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-xs text-right font-mono">{i.quantidade ?? 1}</TableCell>
                          <TableCell className="text-xs text-right font-mono">{formatCurrency(i.valor_unitario)}</TableCell>
                          <TableCell>
                            {editable ? (
                              <Select
                                value={i.status}
                                onValueChange={(v) => salvarItem(i, { status: v })}
                                disabled={savingId === i.id}
                              >
                                <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                  {ITEM_STATUSES.map((s) => (
                                    <SelectItem key={s} value={s}>{ITEM_STATUS_LABELS[s]}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            ) : (
                              <Badge variant="outline" className={itemBadgeClass(i.status)}>
                                {ITEM_STATUS_LABELS[i.status] ?? i.status}
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            {editable ? (
                              <div className="space-y-1">
                                <Input
                                  value={obs}
                                  placeholder={precisaObs ? 'Descreva a divergência (obrigatório)' : 'Observação'}
                                  onChange={(e) => setObsDraft((d) => ({ ...d, [i.id]: e.target.value }))}
                                  onBlur={() => {
                                    const v = (obsDraft[i.id] ?? '').trim();
                                    if (obsDraft[i.id] === undefined || v === (i.observation ?? '')) return;
                                    salvarItem(i, { observation: v || null as unknown as string });
                                  }}
                                  className={`h-8 text-xs ${precisaObs ? 'border-orange-500/60' : ''}`}
                                />
                                {precisaObs && (
                                  <p className="text-[10px] text-orange-600 dark:text-orange-400">
                                    Item divergente exige observação.
                                  </p>
                                )}
                              </div>
                            ) : (
                              <span className="text-xs text-muted-foreground">{orNaoInformado(i.observation)}</span>
                            )}
                          </TableCell>
                          <TableCell className="text-[11px] font-mono text-muted-foreground">
                            {i.checked_at ? format(new Date(i.checked_at), 'dd/MM/yyyy HH:mm') : '—'}
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

      <AlertDialog open={!!confirmAction} onOpenChange={(o) => !o && setConfirmAction(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirmAction === 'concluir' && 'Concluir conferência?'}
              {confirmAction === 'reabrir' && 'Reabrir conferência?'}
              {confirmAction === 'cancelar' && 'Cancelar conferência?'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirmAction === 'concluir' && (kpi.pendente > 0
                ? `Ainda existem ${kpi.pendente} item(ns) pendente(s). Após concluir, a edição fica bloqueada.`
                : 'Após concluir, a edição dos itens fica bloqueada até uma reabertura.')}
              {confirmAction === 'reabrir' && 'A conferência volta a permitir edição dos itens. O histórico é preservado.'}
              {confirmAction === 'cancelar' && 'Os itens são preservados, mas a conferência fica bloqueada para edição.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Voltar</AlertDialogCancel>
            <AlertDialogAction onClick={() => confirmAction && mudarStatusConferencia(confirmAction)}>
              Confirmar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </PageTransition>
  );
}
