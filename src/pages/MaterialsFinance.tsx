import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Wallet, FileDown, Search, Package, ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';
import PageTransition from '@/components/PageTransition';
import PageHeader from '@/components/PageHeader';
import EmptyState from '@/components/EmptyState';
import { useSections } from '@/hooks/useSections';
import { useUserRole } from '@/hooks/useUserRole';
import { useAuth } from '@/hooks/useAuth';
import {
  formatCurrency, formatCurrencyStrict, totalValue, orNaoInformado, toNumberOrNull, NAO_INFORMADO,
} from '@/lib/currency';
import { MATERIAL_SITUACOES, MATERIAL_SITUACAO_RGB, situacaoBadgeClass } from '@/lib/materialSituacao';
import { generatePDFReport } from '@/lib/pdfExport';
import { logAudit } from '@/lib/audit';
import type { Material } from '@/types';

const ALL = 'all';
const BAIXADOS = ['Baixado', 'Fora de carga'];

type Grupo = { chave: string; registros: number; valor: number; semValor: number };

function agrupar(list: Material[], pick: (m: Material) => string): Grupo[] {
  const map = new Map<string, Grupo>();
  list.forEach((m) => {
    const chave = pick(m);
    const g = map.get(chave) ?? { chave, registros: 0, valor: 0, semValor: 0 };
    g.registros += 1;
    const t = totalValue(m.valor_unitario, m.quantidade);
    if (t === null) g.semValor += 1; else g.valor += t;
    map.set(chave, g);
  });
  return [...map.values()].sort((a, b) => b.valor - a.valor);
}

export default function MaterialsFinance() {
  const navigate = useNavigate();
  const { sections } = useSections();
  const { sectionScope } = useUserRole();
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

  const { data, isLoading } = useQuery({
    queryKey: ['materials-finance'],
    queryFn: async () => {
      // RLS já limita chefe_secao à própria seção e bloqueia anon.
      const { data, error } = await supabase.from('materials').select('*').order('created_at', { ascending: false });
      if (error) { toast.error('Erro ao carregar dados financeiros.'); throw error; }
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
      const tot = totalValue(m.valor_unitario, m.quantidade);
      if (min !== null && Number.isFinite(min) && (tot === null || tot < min)) return false;
      if (max !== null && Number.isFinite(max) && (tot === null || tot > max)) return false;
      return true;
    });
  }, [all, nome, patrimonio, ficha, codigo, responsavel, secao, situacao, valorMin, valorMax]);

  const kpis = useMemo(() => {
    const comValor = filtered.filter((m) => toNumberOrNull(m.valor_unitario) !== null);
    const valorTotal = filtered.reduce((acc, m) => acc + (totalValue(m.valor_unitario, m.quantidade) ?? 0), 0);
    const valorBaixados = filtered
      .filter((m) => BAIXADOS.includes((m.situacao ?? '').trim()))
      .reduce((acc, m) => acc + (totalValue(m.valor_unitario, m.quantidade) ?? 0), 0);
    return {
      valorTotal,
      registros: filtered.length,
      semValor: filtered.length - comValor.length,
      semResponsavel: filtered.filter((m) => (m.responsavel ?? '').trim() === '').length,
      semSecao: filtered.filter((m) => !m.section_id && !m.section_name).length,
      valorBaixados,
      valorMedio: comValor.length === 0 ? 0 : valorTotal / comValor.length,
    };
  }, [filtered]);

  const porSecao = useMemo(() => agrupar(filtered, (m) => orNaoInformado(m.section_name)), [filtered]);
  const porResponsavel = useMemo(() => agrupar(filtered, (m) => orNaoInformado(m.responsavel)), [filtered]);
  const porSituacao = useMemo(() => agrupar(filtered, (m) => orNaoInformado(m.situacao)), [filtered]);

  const maioresValores = useMemo(
    () => [...filtered]
      .map((m) => ({ m, total: totalValue(m.valor_unitario, m.quantidade) }))
      .filter((x) => x.total !== null)
      .sort((a, b) => (b.total as number) - (a.total as number))
      .slice(0, 10),
    [filtered],
  );

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
    return f.length ? f : ['Nenhum'];
  };

  const summaryCards = () => ([
    { label: 'Valor patrimonial', value: formatCurrencyStrict(kpis.valorTotal) },
    { label: 'Registros', value: kpis.registros },
    { label: 'Valor médio/item', value: formatCurrencyStrict(kpis.valorMedio) },
    { label: 'Sem valor', value: kpis.semValor },
  ]);

  const audit = async (relatorio: string, registros: number) => {
    await logAudit({
      action: `relatório financeiro emitido: ${relatorio}`,
      entityType: 'materials',
      eventType: 'material',
      severity: 'medio',
      details: { relatorio, registros, escopo_secao: sectionScope ?? 'global' },
    });
  };

  const exportGeral = async () => {
    generatePDFReport({
      title: 'Relatório Financeiro de Material Carga',
      subtitle: 'Valor patrimonial consolidado por item',
      section: sectionScope,
      emitter: user?.email ?? null,
      filters: activeFilters(),
      orientation: 'landscape',
      summary: summaryCards(),
      columns: ['Ficha', 'Patrimônio', 'Nome', 'Seção', 'Responsável', 'Situação', 'Qtd', 'Vlr Unitário', 'Vlr Total'],
      colorColumnIndex: 5,
      colorMap: MATERIAL_SITUACAO_RGB,
      columnWidths: { 2: 50, 3: 32, 4: 32 },
      rows: filtered.map((m) => [
        orNaoInformado(m.numero_ficha), orNaoInformado(m.patrimonio), orNaoInformado(m.nome),
        orNaoInformado(m.section_name), orNaoInformado(m.responsavel), orNaoInformado(m.situacao),
        `${m.quantidade ?? 1} ${m.unidade ?? 'UN'}`,
        formatCurrency(m.valor_unitario), formatCurrency(totalValue(m.valor_unitario, m.quantidade)),
      ]),
      filename: 'relatorio-financeiro-material-carga',
    });
    await audit('financeiro geral', filtered.length);
  };

  const exportAgrupado = async (
    titulo: string, coluna: string, grupos: Grupo[], nomeArquivo: string,
  ) => {
    generatePDFReport({
      title: titulo,
      subtitle: 'Consolidação de valor patrimonial',
      section: sectionScope,
      emitter: user?.email ?? null,
      filters: activeFilters(),
      summary: summaryCards(),
      columns: [coluna, 'Registros', 'Sem valor', 'Valor patrimonial', 'Participação'],
      columnWidths: { 0: 70 },
      rows: grupos.map((g) => [
        g.chave, g.registros, g.semValor, formatCurrencyStrict(g.valor),
        kpis.valorTotal > 0 ? `${((g.valor / kpis.valorTotal) * 100).toFixed(1)}%` : '0,0%',
      ]),
      filename: nomeArquivo,
    });
    await audit(titulo, grupos.length);
  };

  const inputCls = 'h-9 bg-muted/30 border-border/50 focus:bg-background transition-all duration-300';

  const kpiCards = [
    { label: 'Valor patrimonial total', value: formatCurrencyStrict(kpis.valorTotal) },
    { label: 'Materiais cadastrados', value: String(kpis.registros) },
    { label: 'Valor médio por item', value: formatCurrencyStrict(kpis.valorMedio) },
    { label: 'Baixados / fora de carga', value: formatCurrencyStrict(kpis.valorBaixados) },
    { label: 'Sem valor patrimonial', value: String(kpis.semValor) },
    { label: 'Sem responsável', value: String(kpis.semResponsavel) },
    { label: 'Sem seção', value: String(kpis.semSecao) },
    { label: 'Seções envolvidas', value: String(porSecao.length) },
  ];

  const grupoTabela = (titulo: string, coluna: string, grupos: Grupo[], onPdf?: () => void) => (
    <Card className="shadow-card border-border/50">
      <CardHeader className="flex flex-row items-center justify-between gap-2 pb-3">
        <CardTitle className="text-sm font-semibold">{titulo}</CardTitle>
        {onPdf && (
          <Button variant="outline" size="sm" onClick={onPdf} disabled={grupos.length === 0}>
            <FileDown className="h-3.5 w-3.5 mr-1.5" /> PDF
          </Button>
        )}
      </CardHeader>
      <CardContent className="pt-0">
        {grupos.length === 0 ? (
          <EmptyState compact icon={Package} title="Sem dados" description="Nenhum material atende aos filtros atuais." />
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{coluna}</TableHead>
                  <TableHead className="text-right">Itens</TableHead>
                  <TableHead className="text-right">Valor</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {grupos.map((g) => (
                  <TableRow key={g.chave}>
                    <TableCell className="text-sm">
                      {coluna === 'Situação' ? (
                        <Badge variant="outline" className={situacaoBadgeClass(g.chave)}>{g.chave}</Badge>
                      ) : g.chave}
                    </TableCell>
                    <TableCell className="text-right font-mono text-xs">{g.registros}</TableCell>
                    <TableCell className="text-right font-mono text-xs">
                      {g.valor === 0 && g.semValor === g.registros ? NAO_INFORMADO : formatCurrencyStrict(g.valor)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );

  return (
    <PageTransition>
      <div className="container mx-auto py-6 px-4">
        <PageHeader
          icon={Wallet}
          title="Controle Financeiro — Material Carga"
          description={
            sectionScope
              ? `Escopo da seção ${sectionScope} · ${formatCurrencyStrict(kpis.valorTotal)}`
              : `Visão global · ${formatCurrencyStrict(kpis.valorTotal)}`
          }
          actions={
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" onClick={() => navigate('/materiais')}>
                <ArrowLeft className="h-4 w-4 mr-1.5" /> Materiais
              </Button>
              <Button variant="outline" onClick={exportGeral} disabled={filtered.length === 0}>
                <FileDown className="h-4 w-4 mr-1.5" /> Relatório Financeiro
              </Button>
            </div>
          }
        />

        {/* Filtros */}
        <Card className="shadow-card border-border/50 mb-5">
          <CardContent className="pt-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <div className="relative sm:col-span-2 lg:col-span-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/50" />
                <Input placeholder="Nome do material..." value={nome} onChange={(e) => setNome(e.target.value)} className={`pl-9 ${inputCls}`} />
              </div>
              <Input placeholder="Patrimônio" value={patrimonio} onChange={(e) => setPatrimonio(e.target.value)} className={`font-mono ${inputCls}`} />
              <Input placeholder="Nr Ficha" value={ficha} onChange={(e) => setFicha(e.target.value)} className={`font-mono ${inputCls}`} />
              <Input placeholder="Cod Material" value={codigo} onChange={(e) => setCodigo(e.target.value)} className={`font-mono ${inputCls}`} />
              <Select value={secao} onValueChange={setSecao}>
                <SelectTrigger className={inputCls}><SelectValue placeholder="Seção" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL}>Todas as seções</SelectItem>
                  {sections.map((s) => <SelectItem key={s.id} value={s.name}>{s.name}</SelectItem>)}
                </SelectContent>
              </Select>
              <Input placeholder="Responsável" value={responsavel} onChange={(e) => setResponsavel(e.target.value)} className={inputCls} />
              <Select value={situacao} onValueChange={setSituacao}>
                <SelectTrigger className={inputCls}><SelectValue placeholder="Situação" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL}>Todas as situações</SelectItem>
                  {MATERIAL_SITUACOES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
              <div className="grid grid-cols-2 gap-3">
                <Input placeholder="Vlr mín." inputMode="decimal" value={valorMin} onChange={(e) => setValorMin(e.target.value)} className={`font-mono ${inputCls}`} />
                <Input placeholder="Vlr máx." inputMode="decimal" value={valorMax} onChange={(e) => setValorMax(e.target.value)} className={`font-mono ${inputCls}`} />
              </div>
            </div>
          </CardContent>
        </Card>

        {isLoading ? (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-20 rounded-xl" />)}
          </div>
        ) : all.length === 0 ? (
          <Card className="shadow-card border-border/50">
            <CardContent className="pt-6">
              <EmptyState
                icon={Wallet}
                title="Nenhum material disponível"
                description="Não há materiais no seu escopo de acesso para consolidar valores."
              />
            </CardContent>
          </Card>
        ) : (
          <>
            {/* KPIs */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
              {kpiCards.map((k) => (
                <Card key={k.label} className="shadow-card border-border/50">
                  <CardContent className="p-4">
                    <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{k.label}</p>
                    <p className="mt-1 text-lg font-bold font-mono leading-tight break-words">{k.value}</p>
                  </CardContent>
                </Card>
              ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
              {grupoTabela('Valor por seção', 'Seção', porSecao, () =>
                exportAgrupado('Material por Seção', 'Seção', porSecao, 'material-por-secao'))}
              {grupoTabela('Valor por responsável', 'Responsável', porResponsavel, () =>
                exportAgrupado('Material por Responsável', 'Responsável', porResponsavel, 'material-por-responsavel'))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {grupoTabela('Valor por situação', 'Situação', porSituacao)}

              <Card className="shadow-card border-border/50">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-semibold">Materiais de maior valor</CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  {maioresValores.length === 0 ? (
                    <EmptyState compact icon={Package} title="Sem valores informados" description="Nenhum material possui valor patrimonial cadastrado." />
                  ) : (
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Material</TableHead>
                            <TableHead>Seção</TableHead>
                            <TableHead className="text-right">Valor total</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {maioresValores.map(({ m, total }) => (
                            <TableRow key={m.id} className="cursor-pointer" onClick={() => navigate(`/materiais/${m.id}/editar`)}>
                              <TableCell className="text-sm">
                                <span className="font-medium">{orNaoInformado(m.nome)}</span>
                                <span className="block font-mono text-[11px] text-muted-foreground">{orNaoInformado(m.patrimonio)}</span>
                              </TableCell>
                              <TableCell className="text-xs">{orNaoInformado(m.section_name)}</TableCell>
                              <TableCell className="text-right font-mono text-xs">{formatCurrencyStrict(total as number)}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </>
        )}
      </div>
    </PageTransition>
  );
}
