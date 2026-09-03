import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent } from '@/components/ui/card';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { Plus, Pencil, Trash2, Search, Package, History, ChevronLeft, ChevronRight, FileDown, Wallet } from 'lucide-react';
import { toast } from 'sonner';
import PageTransition from '@/components/PageTransition';
import PageHeader from '@/components/PageHeader';
import EmptyState from '@/components/EmptyState';
import { useSections } from '@/hooks/useSections';
import { useUserRole } from '@/hooks/useUserRole';
import { useAuth } from '@/hooks/useAuth';
import { formatCurrency, formatCurrencyStrict, totalValue, orNaoInformado, toNumberOrNull } from '@/lib/currency';
import { MATERIAL_SITUACOES, MATERIAL_SITUACAO_RGB, situacaoBadgeClass } from '@/lib/materialSituacao';
import { generatePDFReport } from '@/lib/pdfExport';
import { logAudit } from '@/lib/audit';
import type { Material } from '@/types';

const ALL = 'all';
const PAGE_SIZE = 50;

export default function Materials() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { sections } = useSections();
  const { canEdit, isAdmin, sectionScope } = useUserRole();
  const { user } = useAuth();

  const [nome, setNome] = useState('');
  const [patrimonio, setPatrimonio] = useState('');
  const [ficha, setFicha] = useState('');
  const [codigo, setCodigo] = useState('');
  const [responsavel, setResponsavel] = useState('');
  const [secao, setSecao] = useState(ALL);
  const [situacao, setSituacao] = useState(ALL);
  const [valorMin, setValorMin] = useState('');
  const [valorMax, setValorMax] = useState('');
  const [flag, setFlag] = useState(ALL); // sem_valor | sem_secao | sem_responsavel
  const [page, setPage] = useState(0);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const { data, isLoading: loading } = useQuery({
    queryKey: ['materials-all'],
    queryFn: async () => {
      const { data, error } = await supabase.from('materials').select('*').order('created_at', { ascending: false });
      if (error) { toast.error('Erro ao carregar materiais.'); throw error; }
      return (data as unknown as Material[]) || [];
    },
    staleTime: 15_000,
  });

  const all = useMemo(() => data || [], [data]);

  const filtered = useMemo(() => {
    const min = valorMin.trim() === '' ? null : Number(valorMin.replace(',', '.'));
    const max = valorMax.trim() === '' ? null : Number(valorMax.replace(',', '.'));
    const has = (v: string | null | undefined, q: string) => (v ?? '').toLowerCase().includes(q.trim().toLowerCase());

    return all.filter((m) => {
      if (nome.trim() && !has(m.nome, nome)) return false;
      if (patrimonio.trim() && !has(m.patrimonio, patrimonio)) return false;
      if (ficha.trim() && !has(m.numero_ficha, ficha)) return false;
      if (codigo.trim() && !has(m.codigo_material, codigo)) return false;
      if (responsavel.trim() && !has(m.responsavel, responsavel)) return false;
      if (secao !== ALL && (m.section_name ?? '') !== secao) return false;
      if (situacao !== ALL && (m.situacao ?? '') !== situacao) return false;
      if (flag === 'sem_valor' && toNumberOrNull(m.valor_unitario) !== null) return false;
      if (flag === 'sem_secao' && (m.section_id || m.section_name)) return false;
      if (flag === 'sem_responsavel' && (m.responsavel ?? '').trim() !== '') return false;
      const tot = totalValue(m.valor_unitario, m.quantidade);
      if (min !== null && Number.isFinite(min) && (tot === null || tot < min)) return false;
      if (max !== null && Number.isFinite(max) && (tot === null || tot > max)) return false;
      return true;
    });
  }, [all, nome, patrimonio, ficha, codigo, responsavel, secao, situacao, valorMin, valorMax, flag]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageSafe = Math.min(page, totalPages - 1);
  const rows = filtered.slice(pageSafe * PAGE_SIZE, (pageSafe + 1) * PAGE_SIZE);

  const valorTotal = filtered.reduce((acc, m) => acc + (totalValue(m.valor_unitario, m.quantidade) ?? 0), 0);
  const semValor = filtered.filter((m) => toNumberOrNull(m.valor_unitario) === null).length;
  const semSecao = filtered.filter((m) => !m.section_id && !m.section_name).length;

  const activeFilters = () => {
    const f: string[] = [];
    if (nome.trim()) f.push(`Nome: ${nome}`);
    if (patrimonio.trim()) f.push(`Patrimônio: ${patrimonio}`);
    if (ficha.trim()) f.push(`Ficha: ${ficha}`);
    if (codigo.trim()) f.push(`Código: ${codigo}`);
    if (responsavel.trim()) f.push(`Responsável: ${responsavel}`);
    if (secao !== ALL) f.push(`Seção: ${secao}`);
    if (situacao !== ALL) f.push(`Situação: ${situacao}`);
    if (valorMin.trim()) f.push(`Valor mín.: ${valorMin}`);
    if (valorMax.trim()) f.push(`Valor máx.: ${valorMax}`);
    if (flag === 'sem_valor') f.push('Somente sem valor');
    if (flag === 'sem_secao') f.push('Somente sem seção');
    if (flag === 'sem_responsavel') f.push('Somente sem responsável');
    return f.length ? f : ['Nenhum'];
  };

  const exportPDF = async () => {
    generatePDFReport({
      title: 'Relatório de Material Carga',
      subtitle: 'Material carga da seção — situação patrimonial',
      section: sectionScope,
      emitter: user?.email ?? null,
      filters: activeFilters(),
      orientation: 'landscape',
      summary: [
        { label: 'Registros', value: filtered.length },
        { label: 'Valor patrimonial', value: formatCurrencyStrict(valorTotal) },
        { label: 'Sem valor informado', value: semValor },
        { label: 'Sem seção', value: semSecao },
      ],
      columns: ['Ficha', 'Patrimônio', 'Código', 'Nome', 'Seção', 'Responsável', 'Situação', 'Qtd', 'Vlr Unitário', 'Vlr Total'],
      colorColumnIndex: 6,
      colorMap: MATERIAL_SITUACAO_RGB,
      columnWidths: { 3: 45, 4: 30, 5: 30 },
      rows: filtered.map((m) => [
        orNaoInformado(m.numero_ficha), orNaoInformado(m.patrimonio), orNaoInformado(m.codigo_material),
        orNaoInformado(m.nome), orNaoInformado(m.section_name), orNaoInformado(m.responsavel),
        orNaoInformado(m.situacao), `${m.quantidade ?? 1} ${m.unidade ?? 'UN'}`,
        formatCurrency(m.valor_unitario), formatCurrency(totalValue(m.valor_unitario, m.quantidade)),
      ]),
      filename: `material-carga-${new Date().toISOString().slice(0, 10)}.pdf`,
    });
    await logAudit({
      action: 'relatório de material carga emitido', entityType: 'materials',
      eventType: 'material', severity: 'baixo', details: { registros: filtered.length },
    });
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    const alvo = all.find((m) => m.id === deleteId);
    const { error } = await supabase.from('materials').delete().eq('id', deleteId);
    if (error) toast.error('Erro ao excluir material.');
    else {
      toast.success('Material excluído com sucesso.');
      await logAudit({
        action: 'material excluído', entityType: 'materials', entityId: deleteId,
        entityLabel: alvo?.patrimonio, eventType: 'material', severity: 'alto', oldValue: alvo?.nome,
      });
      queryClient.invalidateQueries({ queryKey: ['materials-all'] });
    }
    setDeleteId(null);
  };

  const resetPage = () => setPage(0);
  const inputCls = 'h-9 bg-muted/30 border-border/50 focus:bg-background transition-all duration-300';

  return (
    <PageTransition>
      <div className="container mx-auto py-6 px-4">
        <PageHeader
          icon={Package}
          title="Material Carga da Seção"
          description={`${filtered.length} de ${all.length} registro(s) · ${formatCurrencyStrict(valorTotal)}`}
          actions={
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" onClick={() => navigate('/materiais/financeiro')}>
                <Wallet className="h-4 w-4 mr-1.5" /> Controle Financeiro
              </Button>
              <Button variant="outline" onClick={exportPDF} disabled={filtered.length === 0}>
                <FileDown className="h-4 w-4 mr-1.5" /> PDF
              </Button>
              {canEdit && (
                <Button onClick={() => navigate('/materiais/novo')} className="gradient-primary border-0 shadow-glow hover:opacity-90 transition-all duration-300">
                  <Plus className="h-4 w-4 mr-1.5" /> Novo Material
                </Button>
              )}
            </div>
          }
        />

        <Card className="shadow-card border-border/50">
          <CardContent className="pt-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
              <div className="relative sm:col-span-2 lg:col-span-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/50" />
                <Input placeholder="Nome do material..." value={nome} onChange={(e) => { setNome(e.target.value); resetPage(); }} className={`pl-9 ${inputCls}`} />
              </div>
              <Input placeholder="Patrimônio" value={patrimonio} onChange={(e) => { setPatrimonio(e.target.value); resetPage(); }} className={`font-mono ${inputCls}`} />
              <Input placeholder="Nr Ficha" value={ficha} onChange={(e) => { setFicha(e.target.value); resetPage(); }} className={`font-mono ${inputCls}`} />
              <Input placeholder="Cod Material" value={codigo} onChange={(e) => { setCodigo(e.target.value); resetPage(); }} className={`font-mono ${inputCls}`} />

              <Select value={secao} onValueChange={(v) => { setSecao(v); resetPage(); }}>
                <SelectTrigger className={inputCls}><SelectValue placeholder="Seção" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL}>Todas as seções</SelectItem>
                  {sections.map((s) => <SelectItem key={s.id} value={s.name}>{s.name}</SelectItem>)}
                </SelectContent>
              </Select>
              <Input placeholder="Responsável" value={responsavel} onChange={(e) => { setResponsavel(e.target.value); resetPage(); }} className={inputCls} />
              <Select value={situacao} onValueChange={(v) => { setSituacao(v); resetPage(); }}>
                <SelectTrigger className={inputCls}><SelectValue placeholder="Situação" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL}>Todas as situações</SelectItem>
                  {MATERIAL_SITUACOES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={flag} onValueChange={(v) => { setFlag(v); resetPage(); }}>
                <SelectTrigger className={inputCls}><SelectValue placeholder="Pendências" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL}>Sem filtro de pendência</SelectItem>
                  <SelectItem value="sem_valor">Sem valor patrimonial</SelectItem>
                  <SelectItem value="sem_secao">Sem seção</SelectItem>
                  <SelectItem value="sem_responsavel">Sem responsável</SelectItem>
                </SelectContent>
              </Select>
              <Input placeholder="Valor total mín. (R$)" inputMode="decimal" value={valorMin} onChange={(e) => { setValorMin(e.target.value); resetPage(); }} className={`font-mono ${inputCls}`} />
              <Input placeholder="Valor total máx. (R$)" inputMode="decimal" value={valorMax} onChange={(e) => { setValorMax(e.target.value); resetPage(); }} className={`font-mono ${inputCls}`} />
            </div>

            {loading ? (
              <div className="space-y-2">
                {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-14 w-full rounded-xl" />)}
              </div>
            ) : filtered.length === 0 ? (
              <EmptyState
                icon={Package}
                title="Nenhum material encontrado"
                description="Ajuste os filtros ou cadastre um novo material de carga."
                action={canEdit ? <Button onClick={() => navigate('/materiais/novo')}><Plus className="h-4 w-4 mr-1.5" />Novo Material</Button> : undefined}
              />
            ) : (
              <>
                <div className="rounded-xl border border-border/50 overflow-x-auto hidden sm:block">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/40 hover:bg-muted/40 border-b border-border/50">
                        {['Ficha', 'Patrimônio', 'Código', 'Nome', 'Seção', 'Responsável', 'Situação', 'Qtd', 'Vlr Unit.', 'Vlr Total'].map((h) => (
                          <TableHead key={h} className="font-semibold text-[10px] uppercase tracking-widest text-muted-foreground whitespace-nowrap">{h}</TableHead>
                        ))}
                        <TableHead className="font-semibold text-[10px] uppercase tracking-widest text-muted-foreground text-right">Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {rows.map((m) => (
                        <TableRow key={m.id} className="hover:bg-muted/30 transition-colors duration-200 group border-b border-border/30 last:border-0">
                          <TableCell className="font-mono text-sm text-muted-foreground">{orNaoInformado(m.numero_ficha)}</TableCell>
                          <TableCell className="font-mono font-semibold text-sm">{orNaoInformado(m.patrimonio)}</TableCell>
                          <TableCell className="font-mono text-sm text-muted-foreground">{orNaoInformado(m.codigo_material)}</TableCell>
                          <TableCell className="text-sm">{m.nome}</TableCell>
                          <TableCell className="text-sm">
                            {m.section_name || <span className="text-xs text-amber-600 dark:text-amber-400">Sem seção</span>}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">{orNaoInformado(m.responsavel)}</TableCell>
                          <TableCell>
                            <span className={`inline-flex items-center rounded-md border px-2 py-0.5 text-[11px] font-medium ${situacaoBadgeClass(m.situacao)}`}>
                              {orNaoInformado(m.situacao)}
                            </span>
                          </TableCell>
                          <TableCell className="font-mono text-sm whitespace-nowrap">{m.quantidade ?? 1} {m.unidade ?? 'UN'}</TableCell>
                          <TableCell className="font-mono text-sm whitespace-nowrap">{formatCurrency(m.valor_unitario)}</TableCell>
                          <TableCell className="font-mono text-sm font-semibold whitespace-nowrap">{formatCurrency(totalValue(m.valor_unitario, m.quantidade))}</TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-0.5 opacity-60 group-hover:opacity-100 transition-opacity duration-200">
                              <Button variant="ghost" size="icon" onClick={() => navigate(`/materiais/${m.id}/historico`)} title="Histórico" className="h-8 w-8 hover:text-primary hover:bg-primary/10 rounded-lg"><History className="h-3.5 w-3.5" /></Button>
                              {canEdit && <Button variant="ghost" size="icon" onClick={() => navigate(`/materiais/${m.id}/editar`)} title="Editar" className="h-8 w-8 hover:text-primary hover:bg-primary/10 rounded-lg"><Pencil className="h-3.5 w-3.5" /></Button>}
                              {isAdmin && <Button variant="ghost" size="icon" onClick={() => setDeleteId(m.id)} title="Excluir" className="h-8 w-8 text-destructive/60 hover:text-destructive hover:bg-destructive/10 rounded-lg"><Trash2 className="h-3.5 w-3.5" /></Button>}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                <div className="space-y-3 sm:hidden">
                  {rows.map((m) => (
                    <Card key={m.id} className="border-border/50 shadow-sm">
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-mono font-semibold text-sm">{orNaoInformado(m.patrimonio)}</span>
                          <span className={`inline-flex items-center rounded-md border px-2 py-0.5 text-[10px] font-medium ${situacaoBadgeClass(m.situacao)}`}>
                            {orNaoInformado(m.situacao)}
                          </span>
                        </div>
                        <p className="text-sm truncate">{m.nome}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          Ficha: {orNaoInformado(m.numero_ficha)} · {m.section_name || 'Sem seção'}
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5">Responsável: {orNaoInformado(m.responsavel)}</p>
                        <p className="text-xs mt-1 font-mono">
                          {m.quantidade ?? 1} {m.unidade ?? 'UN'} · {formatCurrency(m.valor_unitario)} · Total {formatCurrency(totalValue(m.valor_unitario, m.quantidade))}
                        </p>
                        <div className="flex justify-end gap-1 mt-3 pt-2 border-t border-border/30">
                          <Button variant="ghost" size="icon" onClick={() => navigate(`/materiais/${m.id}/historico`)} className="h-8 w-8"><History className="h-3.5 w-3.5" /></Button>
                          {canEdit && <Button variant="ghost" size="icon" onClick={() => navigate(`/materiais/${m.id}/editar`)} className="h-8 w-8"><Pencil className="h-3.5 w-3.5" /></Button>}
                          {isAdmin && <Button variant="ghost" size="icon" onClick={() => setDeleteId(m.id)} className="h-8 w-8 text-destructive/60"><Trash2 className="h-3.5 w-3.5" /></Button>}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </>
            )}

            {totalPages > 1 && (
              <div className="flex items-center justify-between mt-4 pt-3 border-t border-border/50">
                <p className="text-xs text-muted-foreground">
                  Página {pageSafe + 1} de {totalPages} ({filtered.length} registros)
                </p>
                <div className="flex gap-1">
                  <Button variant="outline" size="icon" className="h-8 w-8" disabled={pageSafe === 0} onClick={() => setPage((p) => p - 1)}>
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button variant="outline" size="icon" className="h-8 w-8" disabled={pageSafe >= totalPages - 1} onClick={() => setPage((p) => p + 1)}>
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
              <AlertDialogDescription>Tem certeza que deseja excluir este material? Esta ação não pode ser desfeita.</AlertDialogDescription>
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
