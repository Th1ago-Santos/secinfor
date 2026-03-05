import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Monitor, History, Printer, ArrowLeft } from 'lucide-react';

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

export default function QuickLookup() {
  const { patrimonio } = useParams<{ patrimonio: string }>();
  const navigate = useNavigate();
  const [notebook, setNotebook] = useState<Notebook | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    const fetch = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('notebooks')
        .select('*')
        .eq('patrimonio', patrimonio!)
        .single();

      if (error || !data) {
        setNotFound(true);
      } else {
        setNotebook(data as any);
      }
      setLoading(false);
    };
    fetch();
  }, [patrimonio]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="flex items-center justify-center gap-2">
            <Monitor className="h-5 w-5 text-primary" />
            Consulta Rápida
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
            </div>
          ) : notFound ? (
            <div className="text-center py-8 text-muted-foreground">
              <Monitor className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p className="text-lg font-medium">Item não encontrado</p>
              <p className="text-sm">Patrimônio: {patrimonio}</p>
            </div>
          ) : notebook && (
            <div className="space-y-4">
              {notebook.foto_url && (
                <div className="rounded-lg overflow-hidden border">
                  <img src={notebook.foto_url} alt="Foto" className="w-full h-auto max-h-64 object-contain bg-muted" />
                </div>
              )}
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-muted-foreground text-xs">Patrimônio</p>
                  <p className="font-mono font-semibold">{notebook.patrimonio}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Modelo</p>
                  <p className="font-semibold">{notebook.modelo}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Seção</p>
                  <p className="font-semibold">{notebook.secao}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Militar</p>
                  <p className="font-semibold">{notebook.militar}</p>
                </div>
                <div className="col-span-2">
                  <p className="text-muted-foreground text-xs">Status</p>
                  <Badge variant={statusColor(notebook.status) as any}>{notebook.status}</Badge>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Criado em</p>
                  <p className="text-xs">{new Date(notebook.created_at).toLocaleString('pt-BR')}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Atualizado em</p>
                  <p className="text-xs">{new Date(notebook.updated_at).toLocaleString('pt-BR')}</p>
                </div>
              </div>
              <div className="flex gap-2 pt-2">
                <Button size="sm" variant="outline" onClick={() => navigate(`/notebooks/${notebook.id}/historico`)}>
                  <History className="h-4 w-4 mr-1" />
                  Histórico
                </Button>
                <Button size="sm" variant="outline" onClick={() => window.print()}>
                  <Printer className="h-4 w-4 mr-1" />
                  Imprimir
                </Button>
              </div>
            </div>
          )}
          <div className="mt-4 text-center">
            <Button variant="ghost" size="sm" onClick={() => navigate('/')}>
              <ArrowLeft className="h-4 w-4 mr-1" />
              Ir para o sistema
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
