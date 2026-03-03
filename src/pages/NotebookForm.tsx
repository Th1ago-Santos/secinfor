import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ArrowLeft, Save, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import AppHeader from '@/components/AppHeader';
import { z } from 'zod';

const notebookSchema = z.object({
  modelo: z.string().trim().min(1, 'Modelo é obrigatório').max(200),
  patrimonio: z.string().trim().min(1, 'Número de patrimônio é obrigatório').max(100),
  secao: z.string().trim().min(1, 'Seção é obrigatória').max(200),
  militar: z.string().trim().min(1, 'Militar é obrigatório').max(200),
});

export default function NotebookForm() {
  const { id } = useParams();
  const isEdit = !!id;
  const navigate = useNavigate();

  const [modelo, setModelo] = useState('');
  const [patrimonio, setPatrimonio] = useState('');
  const [secao, setSecao] = useState('');
  const [militar, setMilitar] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [loadingData, setLoadingData] = useState(isEdit);

  useEffect(() => {
    if (isEdit) {
      supabase.from('notebooks').select('*').eq('id', id).single().then(({ data, error }) => {
        if (error || !data) {
          toast.error('Item não encontrado.');
          navigate('/');
        } else {
          setModelo(data.modelo);
          setPatrimonio(data.patrimonio);
          setSecao(data.secao);
          setMilitar(data.militar);
        }
        setLoadingData(false);
      });
    }
  }, [id, isEdit, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const result = notebookSchema.safeParse({ modelo, patrimonio, secao, militar });
    if (!result.success) {
      setError(result.error.errors[0].message);
      return;
    }

    setSaving(true);
    const values = result.data;

    if (isEdit) {
      const { error } = await supabase.from('notebooks').update(values).eq('id', id);
      if (error) {
        if (error.code === '23505') {
          setError('Já existe um item com este número de patrimônio.');
        } else {
          setError('Erro ao atualizar item.');
        }
      } else {
        toast.success('Item atualizado com sucesso.');
        navigate('/');
      }
    } else {
      const { error } = await supabase.from('notebooks').insert([{
        modelo: values.modelo,
        patrimonio: values.patrimonio,
        secao: values.secao,
        militar: values.militar,
      }]);
      if (error) {
        if (error.code === '23505') {
          setError('Já existe um item com este número de patrimônio.');
        } else {
          setError('Erro ao cadastrar item.');
        }
      } else {
        toast.success('Item cadastrado com sucesso.');
        navigate('/');
      }
    }
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
      <main className="container mx-auto py-6 px-4 max-w-2xl">
        <Button variant="ghost" onClick={() => navigate('/')} className="mb-4">
          <ArrowLeft className="h-4 w-4 mr-1" />
          Voltar
        </Button>

        <Card>
          <CardHeader>
            <CardTitle>{isEdit ? 'Editar Notebook' : 'Novo Notebook'}</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <div className="space-y-2">
                <Label htmlFor="patrimonio">Número de Patrimônio *</Label>
                <Input
                  id="patrimonio"
                  placeholder="Ex: NB-2024-001"
                  value={patrimonio}
                  onChange={(e) => setPatrimonio(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="modelo">Modelo *</Label>
                <Input
                  id="modelo"
                  placeholder="Ex: Dell Latitude 5540"
                  value={modelo}
                  onChange={(e) => setModelo(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="secao">Seção *</Label>
                <Input
                  id="secao"
                  placeholder="Ex: S2, S3, Comunicações"
                  value={secao}
                  onChange={(e) => setSecao(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="militar">Militar *</Label>
                <Input
                  id="militar"
                  placeholder="Ex: Sgt Silva"
                  value={militar}
                  onChange={(e) => setMilitar(e.target.value)}
                  required
                />
              </div>

              <div className="flex gap-3 pt-2">
                <Button type="submit" disabled={saving}>
                  <Save className="h-4 w-4 mr-1" />
                  {saving ? 'Salvando...' : 'Salvar'}
                </Button>
                <Button type="button" variant="outline" onClick={() => navigate('/')}>
                  Cancelar
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
