import { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Checkbox } from '@/components/ui/checkbox';
import { ArrowLeft, Save, AlertCircle, Upload, X, Laptop } from 'lucide-react';
import { toast } from 'sonner';

import { useSections } from '@/hooks/useSections';
import { z } from 'zod';

const notebookSchema = z.object({
  modelo: z.string().trim().min(1, 'Modelo é obrigatório').max(200),
  patrimonio: z.string().trim().min(1, 'Número de patrimônio é obrigatório').max(100),
  secao: z.string().trim().min(1, 'Seção é obrigatória').max(200),
  militar: z.string().trim().min(1, 'Militar é obrigatório').max(200),
  status: z.string().min(1, 'Status é obrigatório'),
});

const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_FILE_SIZE = 5 * 1024 * 1024;
const STATUS_OPTIONS = ['Em uso', 'Em manutenção', 'Baixado', 'Em estoque', 'Fora de Carga'];

export default function NotebookForm() {
  const { id } = useParams();
  const isEdit = !!id;
  const navigate = useNavigate();
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [modelo, setModelo] = useState('');
  const [patrimonio, setPatrimonio] = useState('');
  const [secao, setSecao] = useState('');
  const [militar, setMilitar] = useState('');
  const [status, setStatus] = useState('Em uso');
  const [foraDeCarga, setForaDeCarga] = useState(false);
  const [motivoManutencao, setMotivoManutencao] = useState('');
  const [observacoesManutencao, setObservacoesManutencao] = useState('');
  const [fotoFile, setFotoFile] = useState<File | null>(null);
  const [fotoPreview, setFotoPreview] = useState<string | null>(null);
  const [existingFotoUrl, setExistingFotoUrl] = useState<string | null>(null);
  const [removeFoto, setRemoveFoto] = useState(false);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [loadingData, setLoadingData] = useState(isEdit);
  const [origSecao, setOrigSecao] = useState('');
  const [origMilitar, setOrigMilitar] = useState('');
  const [origStatus, setOrigStatus] = useState('');
  const { sections, loading: loadingSections } = useSections();

  useEffect(() => {
    if (isEdit) {
      supabase.from('notebooks').select('*').eq('id', id).single().then(({ data, error }) => {
        if (error || !data) { toast.error('Item não encontrado.'); navigate('/notebooks'); }
        else {
          const d = data as any;
          setModelo(d.modelo); setPatrimonio(d.patrimonio); setSecao(d.secao); setMilitar(d.militar);
          setStatus(d.status || 'Em uso'); setMotivoManutencao(d.motivo_manutencao || '');
          setObservacoesManutencao(d.observacoes_manutencao || '');
          if (d.patrimonio === 'FORA DE CARGA') setForaDeCarga(true);
          if (d.foto_url) setExistingFotoUrl(d.foto_url);
          setOrigSecao(d.secao); setOrigMilitar(d.militar); setOrigStatus(d.status || 'Em uso');
        }
        setLoadingData(false);
      });
    }
  }, [id, isEdit, navigate]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!ACCEPTED_TYPES.includes(file.type)) { setError('Formato inválido. Aceitos: JPG, PNG, WebP.'); return; }
    if (file.size > MAX_FILE_SIZE) { setError('Arquivo muito grande. Máximo: 5 MB.'); return; }
    setError(''); setFotoFile(file); setRemoveFoto(false);
    const reader = new FileReader();
    reader.onload = () => setFotoPreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  const clearFoto = () => { setFotoFile(null); setFotoPreview(null); setRemoveFoto(true); if (fileInputRef.current) fileInputRef.current.value = ''; };

  const uploadPhoto = async (notebookId: string): Promise<string | null> => {
    if (!fotoFile) return null;
    const ext = fotoFile.name.split('.').pop();
    const path = `${notebookId}.${ext}`;
    const { error } = await supabase.storage.from('notebook-photos').upload(path, fotoFile, { upsert: true });
    if (error) return null;
    const { data } = supabase.storage.from('notebook-photos').getPublicUrl(path);
    return data.publicUrl;
  };

  const registerMovement = async (itemId: string, tipoEvento: string, opts: {
    secaoOrigem?: string; secaoDestino?: string; responsavelAnterior?: string; responsavelNovo?: string; observacao?: string;
  } = {}) => {
    await supabase.from('movements').insert([{
      item_tipo: 'notebook', item_id: itemId, tipo_evento: tipoEvento,
      secao_origem: opts.secaoOrigem || null, secao_destino: opts.secaoDestino || null,
      responsavel_anterior: opts.responsavelAnterior || null, responsavel_novo: opts.responsavelNovo || null,
      usuario_sistema: user?.id, observacao: opts.observacao || null,
    }] as any);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setError('');
    const result = notebookSchema.safeParse({ modelo, patrimonio, secao, militar, status });
    if (!result.success) { setError(result.error.errors[0].message); return; }

    setSaving(true);
    const values = result.data;
    const maintenanceFields: any = {
      motivo_manutencao: status === 'Em manutenção' ? motivoManutencao : null,
      observacoes_manutencao: status === 'Em manutenção' ? observacoesManutencao : null,
      data_entrada_manutencao: (status === 'Em manutenção' && origStatus !== 'Em manutenção') ? new Date().toISOString() : undefined,
      data_saida_manutencao: (origStatus === 'Em manutenção' && status !== 'Em manutenção') ? new Date().toISOString() : undefined,
    };
    Object.keys(maintenanceFields).forEach(k => maintenanceFields[k] === undefined && delete maintenanceFields[k]);

    try {
      if (isEdit) {
        let fotoUrl = existingFotoUrl;
        if (fotoFile) fotoUrl = await uploadPhoto(id!);
        else if (removeFoto) fotoUrl = null;

        const { error } = await supabase.from('notebooks').update({ ...values, foto_url: fotoUrl, ...maintenanceFields } as any).eq('id', id);
        if (error) { setError(error.code === '23505' ? 'Já existe um item com este número de patrimônio.' : 'Erro ao atualizar item.'); }
        else {
          if (values.secao !== origSecao) await registerMovement(id!, 'Transferência', { secaoOrigem: origSecao, secaoDestino: values.secao });
          if (values.militar !== origMilitar) await registerMovement(id!, 'Alteração de responsável', { responsavelAnterior: origMilitar, responsavelNovo: values.militar });
          if (status === 'Em manutenção' && origStatus !== 'Em manutenção') await registerMovement(id!, 'Manutenção iniciada', { observacao: motivoManutencao });
          if (origStatus === 'Em manutenção' && status !== 'Em manutenção') await registerMovement(id!, 'Manutenção finalizada');
          if (status === 'Baixado' && origStatus !== 'Baixado') await registerMovement(id!, 'Baixa');
          toast.success('Item atualizado com sucesso.'); navigate('/notebooks');
        }
      } else {
        const { data: inserted, error } = await supabase.from('notebooks').insert([{ ...values, ...maintenanceFields }] as any).select().single();
        if (error) { setError(error.code === '23505' ? 'Já existe um item com este número de patrimônio.' : 'Erro ao cadastrar item.'); }
        else if (inserted) {
          if (fotoFile) { const fotoUrl = await uploadPhoto((inserted as any).id); if (fotoUrl) await supabase.from('notebooks').update({ foto_url: fotoUrl } as any).eq('id', (inserted as any).id); }
          toast.success('Item cadastrado com sucesso.'); navigate('/notebooks');
        }
      }
    } catch { setError('Erro inesperado ao salvar.'); }
    setSaving(false);
  };

  if (loadingData) {
    return (
      <div className="flex justify-center py-20">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  const currentPreview = fotoPreview || (!removeFoto ? existingFotoUrl : null);

  return (
    <div className="container mx-auto py-6 px-4 max-w-2xl animate-in-page">
        <Button variant="ghost" onClick={() => navigate('/notebooks')} className="mb-4 transition-all duration-200 hover:bg-muted/50">
          <ArrowLeft className="h-4 w-4 mr-1" />
          Voltar
        </Button>

        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2.5 text-lg">
              <div className="p-2 rounded-lg bg-primary/10">
                <Laptop className="h-4 w-4 text-primary" />
              </div>
              {isEdit ? 'Editar Notebook' : 'Novo Notebook'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-5">
              {error && (
                <Alert variant="destructive" className="animate-in-card">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="patrimonio" className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Número de Patrimônio *</Label>
                  <Input id="patrimonio" placeholder="Ex: NB-2024-001" value={patrimonio} onChange={(e) => setPatrimonio(e.target.value)} className="h-10 font-mono bg-muted/30 border-border/60 focus:bg-background transition-all duration-200" required disabled={foraDeCarga} />
                  <div className="flex items-center gap-2 mt-1">
                    <Checkbox id="fora-carga" checked={foraDeCarga} onCheckedChange={(v) => {
                      const checked = !!v;
                      setForaDeCarga(checked);
                      if (checked) { setPatrimonio(`FC-${Date.now()}`); setStatus('Fora de Carga'); }
                      else { setPatrimonio(''); setStatus('Em uso'); }
                    }} />
                    <label htmlFor="fora-carga" className="text-xs cursor-pointer text-muted-foreground">Fora de Carga</label>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="modelo" className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Modelo *</Label>
                  <Input id="modelo" placeholder="Ex: Dell Latitude 5540" value={modelo} onChange={(e) => setModelo(e.target.value)} className="h-10 bg-muted/30 border-border/60 focus:bg-background transition-all duration-200" required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="secao" className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Seção *</Label>
                  <Select value={secao} onValueChange={setSecao}>
                    <SelectTrigger className="h-10 bg-muted/30 border-border/60"><SelectValue placeholder="Selecione a seção" /></SelectTrigger>
                    <SelectContent>
                      {loadingSections ? (<SelectItem value="_loading" disabled>Carregando...</SelectItem>) : sections.map((s) => (<SelectItem key={s.id} value={s.name}>{s.name}</SelectItem>))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="militar" className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Militar *</Label>
                  <Input id="militar" placeholder="Ex: Sgt Silva" value={militar} onChange={(e) => setMilitar(e.target.value)} className="h-10 bg-muted/30 border-border/60 focus:bg-background transition-all duration-200" required />
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Status *</Label>
                <Select value={status} onValueChange={setStatus}>
                  <SelectTrigger className="h-10 bg-muted/30 border-border/60"><SelectValue /></SelectTrigger>
                  <SelectContent>{STATUS_OPTIONS.map((s) => (<SelectItem key={s} value={s}>{s}</SelectItem>))}</SelectContent>
                </Select>
              </div>

              {status === 'Em manutenção' && (
                <div className="space-y-3 p-4 rounded-xl border border-warning/20 bg-warning/5 animate-in-card">
                  <div className="space-y-2">
                    <Label htmlFor="motivo" className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Motivo da Manutenção</Label>
                    <Input id="motivo" placeholder="Ex: Tela quebrada" value={motivoManutencao} onChange={(e) => setMotivoManutencao(e.target.value)} className="h-10 bg-background border-border/60" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="obs-manutencao" className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Observações</Label>
                    <Textarea id="obs-manutencao" placeholder="Detalhes adicionais..." value={observacoesManutencao} onChange={(e) => setObservacoesManutencao(e.target.value)} rows={3} className="bg-background border-border/60" />
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Foto do Notebook (opcional)</Label>
                <div className="flex items-center gap-3">
                  <Button type="button" variant="outline" size="sm" onClick={() => fileInputRef.current?.click()} className="transition-all duration-200">
                    <Upload className="h-3.5 w-3.5 mr-1.5" />
                    {currentPreview ? 'Trocar foto' : 'Anexar foto'}
                  </Button>
                  {currentPreview && (
                    <Button type="button" variant="ghost" size="sm" onClick={clearFoto} className="text-destructive transition-all duration-200">
                      <X className="h-3.5 w-3.5 mr-1" />Remover
                    </Button>
                  )}
                </div>
                <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={handleFileChange} />
                <p className="text-[10px] text-muted-foreground">JPG, PNG ou WebP. Máximo 5 MB.</p>
                {currentPreview && (
                  <div className="mt-2 rounded-xl border overflow-hidden w-48 animate-in-card shadow-sm">
                    <img src={currentPreview} alt="Preview" className="w-full h-auto object-cover" />
                  </div>
                )}
              </div>

              <div className="flex gap-3 pt-3">
                <Button type="submit" disabled={saving} className="shadow-sm transition-all duration-200">
                  <Save className="h-4 w-4 mr-1.5" />
                  {saving ? 'Salvando...' : 'Salvar'}
                </Button>
                <Button type="button" variant="outline" onClick={() => navigate('/notebooks')} className="transition-all duration-200">Cancelar</Button>
              </div>
            </form>
          </CardContent>
        </Card>
    </div>
  );
}
