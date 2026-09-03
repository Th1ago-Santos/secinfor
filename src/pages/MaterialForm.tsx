import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ArrowLeft, Save, AlertCircle, Package } from 'lucide-react';
import { toast } from 'sonner';
import { z } from 'zod';
import { useSections } from '@/hooks/useSections';
import { useUserRole } from '@/hooks/useUserRole';
import { MATERIAL_SITUACOES } from '@/lib/materialSituacao';
import { logAudit } from '@/lib/audit';
import AccessDenied from '@/components/AccessDenied';

const ESTADOS = ['Novo', 'Bom', 'Regular', 'Ruim', 'Inservível'];
const UNIDADES = ['UN', 'PC', 'CX', 'PAR', 'KG', 'M', 'L'];
const NONE = '__none__';

const materialSchema = z.object({
  patrimonio: z.string().trim().min(1, 'Patrimônio é obrigatório').max(100),
  codigo_material: z.string().trim().min(1, 'Código do material é obrigatório').max(100),
  numero_ficha: z.string().trim().min(1, 'Número da ficha é obrigatório').max(100),
  nome: z.string().trim().min(1, 'Nome é obrigatório').max(200),
  quantidade: z.number().int().min(1, 'Quantidade deve ser maior ou igual a 1'),
  valor_unitario: z.number().min(0, 'Valor unitário não pode ser negativo').nullable(),
});

export default function MaterialForm() {
  const { id } = useParams();
  const isEdit = !!id;
  const navigate = useNavigate();
  const { sections } = useSections();
  const { canEdit, loading: roleLoading } = useUserRole();

  const [patrimonio, setPatrimonio] = useState('');
  const [codigoMaterial, setCodigoMaterial] = useState('');
  const [numeroFicha, setNumeroFicha] = useState('');
  const [nome, setNome] = useState('');
  const [sectionId, setSectionId] = useState<string>(NONE);
  const [responsavel, setResponsavel] = useState('');
  const [situacao, setSituacao] = useState<string>(NONE);
  const [quantidade, setQuantidade] = useState('1');
  const [unidade, setUnidade] = useState('UN');
  const [valorUnitario, setValorUnitario] = useState('');
  const [dataAquisicao, setDataAquisicao] = useState('');
  const [notaFiscal, setNotaFiscal] = useState('');
  const [estado, setEstado] = useState<string>(NONE);
  const [observacoes, setObservacoes] = useState('');
  const [prev, setPrev] = useState<any>(null);

  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [loadingData, setLoadingData] = useState(isEdit);

  useEffect(() => {
    if (!isEdit) return;
    supabase.from('materials').select('*').eq('id', id).single().then(({ data, error }) => {
      if (error || !data) { toast.error('Material não encontrado.'); navigate('/materiais'); }
      else {
        const d = data as any;
        setPrev(d);
        setPatrimonio(d.patrimonio ?? '');
        setCodigoMaterial(d.codigo_material ?? '');
        setNumeroFicha(d.numero_ficha ?? '');
        setNome(d.nome ?? '');
        setSectionId(d.section_id ?? NONE);
        setResponsavel(d.responsavel ?? '');
        setSituacao(d.situacao ?? NONE);
        setQuantidade(String(d.quantidade ?? 1));
        setUnidade(d.unidade ?? 'UN');
        setValorUnitario(d.valor_unitario === null || d.valor_unitario === undefined ? '' : String(d.valor_unitario));
        setDataAquisicao(d.data_aquisicao ?? '');
        setNotaFiscal(d.nota_fiscal ?? '');
        setEstado(d.estado_conservacao ?? NONE);
        setObservacoes(d.observacoes ?? '');
      }
      setLoadingData(false);
    });
  }, [id, isEdit, navigate]);

  if (!roleLoading && !canEdit) {
    return <AccessDenied />;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setError('');

    const valorNum = valorUnitario.trim() === '' ? null : Number(valorUnitario.replace(',', '.'));
    if (valorNum !== null && !Number.isFinite(valorNum)) { setError('Valor unitário inválido.'); return; }

    const result = materialSchema.safeParse({
      patrimonio, codigo_material: codigoMaterial, numero_ficha: numeroFicha, nome,
      quantidade: Number(quantidade), valor_unitario: valorNum,
    });
    if (!result.success) { setError(result.error.errors[0].message); return; }

    const section = sections.find((s) => s.id === sectionId);
    const values = {
      patrimonio: result.data.patrimonio,
      codigo_material: result.data.codigo_material,
      numero_ficha: result.data.numero_ficha,
      nome: result.data.nome,
      section_id: section?.id ?? null,
      section_name: section?.name ?? null,
      responsavel: responsavel.trim() || null,
      situacao: situacao === NONE ? null : situacao,
      quantidade: result.data.quantidade,
      unidade: unidade || 'UN',
      valor_unitario: result.data.valor_unitario,
      data_aquisicao: dataAquisicao || null,
      nota_fiscal: notaFiscal.trim() || null,
      estado_conservacao: estado === NONE ? null : estado,
      observacoes: observacoes.trim() || null,
    };

    setSaving(true);
    try {
      if (isEdit) {
        const { error } = await supabase.from('materials').update(values as any).eq('id', id);
        if (error) {
          setError(error.code === '23505' ? 'Já existe um material com este patrimônio e código.' : 'Erro ao atualizar material.');
        } else {
          await auditChanges(id!, prev, values);
          toast.success('Material atualizado com sucesso.');
          navigate('/materiais');
        }
      } else {
        const { data, error } = await supabase.from('materials').insert([values] as any).select('id').single();
        if (error) {
          setError(error.code === '23505' ? 'Já existe um material com este patrimônio e código.' : 'Erro ao cadastrar material.');
        } else {
          await logAudit({
            action: 'material cadastrado', entityType: 'materials', entityId: (data as any)?.id,
            entityLabel: values.patrimonio, eventType: 'material', severity: 'baixo',
            newValue: values.nome, details: { section_name: values.section_name, situacao: values.situacao },
          });
          toast.success('Material cadastrado com sucesso.');
          navigate('/materiais');
        }
      }
    } catch { setError('Erro inesperado ao salvar.'); }
    setSaving(false);
  };

  if (loadingData || roleLoading) {
    return (
      <div className="flex justify-center py-20">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  const labelCls = 'text-xs font-medium text-muted-foreground uppercase tracking-wider';
  const inputCls = 'h-10 bg-muted/30 border-border/60 focus:bg-background transition-all duration-200';

  return (
    <div className="container mx-auto py-6 px-4 max-w-4xl animate-in-page">
      <Button variant="ghost" onClick={() => navigate('/materiais')} className="mb-4 transition-all duration-200 hover:bg-muted/50">
        <ArrowLeft className="h-4 w-4 mr-1" />
        Voltar
      </Button>

      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2.5 text-lg">
            <div className="p-2 rounded-lg bg-primary/10">
              <Package className="h-4 w-4 text-primary" />
            </div>
            {isEdit ? 'Editar Material' : 'Novo Material'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <Alert variant="destructive" className="animate-in-card">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <section className="space-y-4">
              <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">Identificação</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="numero_ficha" className={labelCls}>Nr Ficha *</Label>
                  <Input id="numero_ficha" placeholder="Ex: F-0001" value={numeroFicha} onChange={(e) => setNumeroFicha(e.target.value)} className={`${inputCls} font-mono`} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="patrimonio" className={labelCls}>Nr Patrimônio *</Label>
                  <Input id="patrimonio" placeholder="Ex: 123456" value={patrimonio} onChange={(e) => setPatrimonio(e.target.value)} className={`${inputCls} font-mono`} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="codigo_material" className={labelCls}>Cod Material *</Label>
                  <Input id="codigo_material" placeholder="Ex: MAT-001" value={codigoMaterial} onChange={(e) => setCodigoMaterial(e.target.value)} className={`${inputCls} font-mono`} required />
                </div>
                <div className="space-y-2 sm:col-span-2 lg:col-span-3">
                  <Label htmlFor="nome" className={labelCls}>Nome do Material *</Label>
                  <Input id="nome" placeholder="Ex: Mesa de escritório" value={nome} onChange={(e) => setNome(e.target.value)} className={inputCls} required />
                </div>
              </div>
            </section>

            <section className="space-y-4">
              <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">Carga e situação</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label className={labelCls}>Seção</Label>
                  <Select value={sectionId} onValueChange={setSectionId}>
                    <SelectTrigger className={inputCls}><SelectValue placeholder="Sem seção" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value={NONE}>Sem seção</SelectItem>
                      {sections.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="responsavel" className={labelCls}>Responsável</Label>
                  <Input id="responsavel" placeholder="Ex: 3º Sgt Silva" value={responsavel} onChange={(e) => setResponsavel(e.target.value)} className={inputCls} />
                </div>
                <div className="space-y-2">
                  <Label className={labelCls}>Situação</Label>
                  <Select value={situacao} onValueChange={setSituacao}>
                    <SelectTrigger className={inputCls}><SelectValue placeholder="Não informado" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value={NONE}>Não informado</SelectItem>
                      {MATERIAL_SITUACOES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="quantidade" className={labelCls}>Quantidade *</Label>
                  <Input id="quantidade" type="number" min={1} step={1} value={quantidade} onChange={(e) => setQuantidade(e.target.value)} className={`${inputCls} font-mono`} required />
                </div>
                <div className="space-y-2">
                  <Label className={labelCls}>Unidade</Label>
                  <Select value={unidade} onValueChange={setUnidade}>
                    <SelectTrigger className={inputCls}><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {UNIDADES.map((u) => <SelectItem key={u} value={u}>{u}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className={labelCls}>Estado de Conservação</Label>
                  <Select value={estado} onValueChange={setEstado}>
                    <SelectTrigger className={inputCls}><SelectValue placeholder="Não informado" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value={NONE}>Não informado</SelectItem>
                      {ESTADOS.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </section>

            <section className="space-y-4">
              <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">Valor patrimonial</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="valor_unitario" className={labelCls}>Valor Unitário (R$)</Label>
                  <Input id="valor_unitario" inputMode="decimal" placeholder="Não informado" value={valorUnitario} onChange={(e) => setValorUnitario(e.target.value)} className={`${inputCls} font-mono`} />
                  <p className="text-[11px] text-muted-foreground">Deixe em branco para “Não informado”.</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="data_aquisicao" className={labelCls}>Data de Aquisição</Label>
                  <Input id="data_aquisicao" type="date" value={dataAquisicao} onChange={(e) => setDataAquisicao(e.target.value)} className={inputCls} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="nota_fiscal" className={labelCls}>Nota Fiscal</Label>
                  <Input id="nota_fiscal" placeholder="Ex: NF 12345" value={notaFiscal} onChange={(e) => setNotaFiscal(e.target.value)} className={inputCls} />
                </div>
              </div>
            </section>

            <div className="space-y-2">
              <Label htmlFor="observacoes" className={labelCls}>Observações</Label>
              <Textarea id="observacoes" rows={3} value={observacoes} onChange={(e) => setObservacoes(e.target.value)} className="bg-muted/30 border-border/60 focus:bg-background" />
            </div>

            <div className="flex gap-3 pt-1">
              <Button type="submit" disabled={saving} className="shadow-sm transition-all duration-200">
                <Save className="h-4 w-4 mr-1.5" />
                {saving ? 'Salvando...' : 'Salvar'}
              </Button>
              <Button type="button" variant="outline" onClick={() => navigate('/materiais')} className="transition-all duration-200">Cancelar</Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

/** Auditoria granular das alterações relevantes de patrimônio. */
async function auditChanges(id: string, prev: any, next: any) {
  const label = next.patrimonio;
  const base = { entityType: 'materials', entityId: id, entityLabel: label, eventType: 'material' as const };

  if (!prev) {
    await logAudit({ ...base, action: 'material atualizado', severity: 'baixo' });
    return;
  }

  const num = (v: any) => (v === null || v === undefined || v === '' ? null : Number(v));
  if (num(prev.valor_unitario) !== num(next.valor_unitario)) {
    await logAudit({
      ...base, action: 'valor patrimonial alterado', severity: 'alto',
      oldValue: prev.valor_unitario === null ? 'Não informado' : String(prev.valor_unitario),
      newValue: next.valor_unitario === null ? 'Não informado' : String(next.valor_unitario),
    });
  }
  if ((prev.section_name ?? null) !== (next.section_name ?? null)) {
    await logAudit({ ...base, action: 'seção do material alterada', severity: 'alto', oldValue: prev.section_name, newValue: next.section_name });
  }
  if ((prev.responsavel ?? null) !== (next.responsavel ?? null)) {
    await logAudit({ ...base, action: 'responsável do material alterado', severity: 'medio', oldValue: prev.responsavel, newValue: next.responsavel });
  }
  if ((prev.situacao ?? null) !== (next.situacao ?? null)) {
    await logAudit({ ...base, action: 'situação do material alterada', severity: 'medio', oldValue: prev.situacao, newValue: next.situacao });
  }
}
