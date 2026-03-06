import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ArrowLeft, Save, AlertCircle, Package } from 'lucide-react';
import { toast } from 'sonner';
import AppHeader from '@/components/AppHeader';
import { z } from 'zod';

const materialSchema = z.object({
  patrimonio: z.string().trim().min(1, 'Patrimônio é obrigatório').max(100),
  codigo_material: z.string().trim().min(1, 'Código do material é obrigatório').max(100),
  numero_ficha: z.string().trim().min(1, 'Número da ficha é obrigatório').max(100),
  nome: z.string().trim().min(1, 'Nome é obrigatório').max(200),
});

export default function MaterialForm() {
  const { id } = useParams();
  const isEdit = !!id;
  const navigate = useNavigate();

  const [patrimonio, setPatrimonio] = useState('');
  const [codigoMaterial, setCodigoMaterial] = useState('');
  const [numeroFicha, setNumeroFicha] = useState('');
  const [nome, setNome] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [loadingData, setLoadingData] = useState(isEdit);

  useEffect(() => {
    if (isEdit) {
      supabase.from('materials').select('*').eq('id', id).single().then(({ data, error }) => {
        if (error || !data) { toast.error('Material não encontrado.'); navigate('/materiais'); }
        else { const d = data as any; setPatrimonio(d.patrimonio); setCodigoMaterial(d.codigo_material); setNumeroFicha(d.numero_ficha); setNome(d.nome); }
        setLoadingData(false);
      });
    }
  }, [id, isEdit, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setError('');
    const result = materialSchema.safeParse({ patrimonio, codigo_material: codigoMaterial, numero_ficha: numeroFicha, nome });
    if (!result.success) { setError(result.error.errors[0].message); return; }

    setSaving(true);
    const values = result.data;
    try {
      if (isEdit) {
        const { error } = await supabase.from('materials').update(values as any).eq('id', id);
        if (error) setError(error.code === '23505' ? 'Já existe um material com este patrimônio e código.' : 'Erro ao atualizar material.');
        else { toast.success('Material atualizado com sucesso.'); navigate('/materiais'); }
      } else {
        const { error } = await supabase.from('materials').insert([values] as any);
        if (error) setError(error.code === '23505' ? 'Já existe um material com este patrimônio e código.' : 'Erro ao cadastrar material.');
        else { toast.success('Material cadastrado com sucesso.'); navigate('/materiais'); }
      }
    } catch { setError('Erro inesperado ao salvar.'); }
    setSaving(false);
  };

  if (loadingData) {
    return (
      <div className="min-h-screen bg-background">
        <AppHeader />
        <div className="flex justify-center py-20">
          <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <main className="container mx-auto py-6 px-4 max-w-2xl animate-in-page">
        <Button variant="ghost" onClick={() => navigate('/materiais')} className="mb-4 transition-hover">
          <ArrowLeft className="h-4 w-4 mr-1" />
          Voltar
        </Button>

        <Card className="animate-in-card">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2 text-xl">
              <Package className="h-5 w-5 text-primary" />
              {isEdit ? 'Editar Material' : 'Novo Material'}
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
                  <Label htmlFor="patrimonio">Número do Patrimônio *</Label>
                  <Input id="patrimonio" placeholder="Ex: 123456" value={patrimonio} onChange={(e) => setPatrimonio(e.target.value)} className="h-9 font-mono" required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="codigo_material">Código do Material *</Label>
                  <Input id="codigo_material" placeholder="Ex: MAT-001" value={codigoMaterial} onChange={(e) => setCodigoMaterial(e.target.value)} className="h-9 font-mono" required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="numero_ficha">Número da Ficha *</Label>
                  <Input id="numero_ficha" placeholder="Ex: F-0001" value={numeroFicha} onChange={(e) => setNumeroFicha(e.target.value)} className="h-9 font-mono" required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="nome">Nome *</Label>
                  <Input id="nome" placeholder="Ex: Mesa de escritório" value={nome} onChange={(e) => setNome(e.target.value)} className="h-9" required />
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <Button type="submit" disabled={saving} className="transition-hover">
                  <Save className="h-4 w-4 mr-1.5" />
                  {saving ? 'Salvando...' : 'Salvar'}
                </Button>
                <Button type="button" variant="outline" onClick={() => navigate('/materiais')} className="transition-hover">Cancelar</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
