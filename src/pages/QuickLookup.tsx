import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Monitor, History, Printer, ArrowLeft, CheckCircle, Wrench, Archive, Package as PackageIcon, XCircle, Laptop, QrCode } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';

type ItemData = {
  id: string;
  patrimonio: string;
  tipo: 'notebook' | 'material';
  modelo?: string;
  nome?: string;
  secao?: string;
  militar?: string;
  status?: string;
  foto_url?: string | null;
  codigo_material?: string;
  numero_ficha?: string;
  created_at?: string;
  updated_at?: string;
};

const statusConfig: Record<string, { icon: React.ElementType; color: string; variant: string }> = {
  'Em uso': { icon: CheckCircle, color: 'text-emerald-500', variant: 'default' },
  'Em manutenção': { icon: Wrench, color: 'text-amber-500', variant: 'destructive' },
  'Baixado': { icon: Archive, color: 'text-red-400', variant: 'secondary' },
  'Em estoque': { icon: PackageIcon, color: 'text-blue-400', variant: 'outline' },
};

export default function QuickLookup() {
  const { patrimonio } = useParams<{ patrimonio: string }>();
  const navigate = useNavigate();
  const [item, setItem] = useState<ItemData | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    const fetchItem = async () => {
      setLoading(true);
      setNotFound(false);

      // Search notebooks first
      const { data: nb } = await supabase
        .from('notebooks')
        .select('*')
        .eq('patrimonio', patrimonio!)
        .single();

      if (nb) {
        const d = nb as any;
        setItem({
          id: d.id,
          patrimonio: d.patrimonio,
          tipo: 'notebook',
          modelo: d.modelo,
          secao: d.secao,
          militar: d.militar,
          status: d.status,
          foto_url: d.foto_url,
          created_at: d.created_at,
          updated_at: d.updated_at,
        });
        setLoading(false);
        return;
      }

      // Search materials
      const { data: mat } = await supabase
        .from('materials')
        .select('*')
        .eq('patrimonio', patrimonio!)
        .single();

      if (mat) {
        const d = mat as any;
        setItem({
          id: d.id,
          patrimonio: d.patrimonio,
          tipo: 'material',
          nome: d.nome,
          codigo_material: d.codigo_material,
          numero_ficha: d.numero_ficha,
          created_at: d.created_at,
          updated_at: d.updated_at,
        });
        setLoading(false);
        return;
      }

      setNotFound(true);
      setLoading(false);
    };
    fetchItem();
  }, [patrimonio]);

  const baseUrl = window.location.origin;
  const statusInfo = item?.status ? statusConfig[item.status] || statusConfig['Em uso'] : null;
  const StatusIcon = statusInfo?.icon || CheckCircle;

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md animate-in-page">
        {loading ? (
          <Card>
            <CardContent className="flex justify-center py-16">
              <div className="animate-spin h-10 w-10 border-4 border-primary border-t-transparent rounded-full" />
            </CardContent>
          </Card>
        ) : notFound ? (
          <Card className="border-destructive/30">
            <CardContent className="text-center py-12">
              <div className="mx-auto w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mb-4">
                <XCircle className="h-8 w-8 text-destructive" />
              </div>
              <p className="text-xl font-semibold mb-1">Item não encontrado</p>
              <p className="text-sm text-muted-foreground mb-1">Patrimônio: <span className="font-mono font-medium">{patrimonio}</span></p>
              <p className="text-xs text-muted-foreground">Este patrimônio não está cadastrado no sistema.</p>
            </CardContent>
          </Card>
        ) : item && (
          <Card className="overflow-hidden">
            {/* Status banner */}
            {item.tipo === 'notebook' && item.status && (
              <div className={`px-4 py-2.5 flex items-center justify-center gap-2 text-sm font-medium ${
                item.status === 'Em uso' ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400' :
                item.status === 'Em manutenção' ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400' :
                item.status === 'Baixado' ? 'bg-red-500/15 text-red-600 dark:text-red-400' :
                'bg-blue-500/15 text-blue-600 dark:text-blue-400'
              }`}>
                <StatusIcon className="h-4 w-4" />
                {item.status}
              </div>
            )}

            <CardHeader className="text-center pb-3">
              <CardTitle className="flex items-center justify-center gap-2 text-lg">
                {item.tipo === 'notebook' ? <Laptop className="h-5 w-5 text-primary" /> : <PackageIcon className="h-5 w-5 text-primary" />}
                {item.tipo === 'notebook' ? 'Notebook' : 'Material Carga'}
              </CardTitle>
            </CardHeader>

            <CardContent className="space-y-4">
              {/* Photo */}
              {item.foto_url && (
                <div className="rounded-lg overflow-hidden border bg-muted">
                  <img src={item.foto_url} alt="Foto" className="w-full h-auto max-h-56 object-contain" />
                </div>
              )}

              {/* Details grid */}
              <div className="grid grid-cols-2 gap-3">
                <InfoField label="Patrimônio" value={item.patrimonio} mono />
                {item.tipo === 'notebook' && (
                  <>
                    <InfoField label="Modelo" value={item.modelo} />
                    <InfoField label="Seção" value={item.secao} />
                    <InfoField label="Militar" value={item.militar} />
                  </>
                )}
                {item.tipo === 'material' && (
                  <>
                    <InfoField label="Nome" value={item.nome} />
                    <InfoField label="Código" value={item.codigo_material} mono />
                    <InfoField label="Nº Ficha" value={item.numero_ficha} mono />
                  </>
                )}
                {item.created_at && (
                  <InfoField label="Cadastrado em" value={new Date(item.created_at).toLocaleDateString('pt-BR')} />
                )}
                {item.updated_at && (
                  <InfoField label="Atualizado em" value={new Date(item.updated_at).toLocaleDateString('pt-BR')} />
                )}
              </div>

              {/* QR Code */}
              <div className="flex justify-center pt-1">
                <div className="p-3 bg-white rounded-lg">
                  <QRCodeSVG value={`${baseUrl}/consulta/${item.patrimonio}`} size={100} />
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-2 pt-1">
                {item.tipo === 'notebook' && (
                  <Button size="sm" variant="outline" className="flex-1 transition-hover" onClick={() => navigate(`/notebooks/${item.id}/historico`)}>
                    <History className="h-4 w-4 mr-1.5" />
                    Histórico
                  </Button>
                )}
                <Button size="sm" variant="outline" className="flex-1 transition-hover" onClick={() => window.print()}>
                  <Printer className="h-4 w-4 mr-1.5" />
                  Imprimir
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="mt-4 text-center">
          <Button variant="ghost" size="sm" onClick={() => navigate('/')} className="text-muted-foreground hover:text-foreground transition-hover">
            <ArrowLeft className="h-4 w-4 mr-1" />
            Ir para o sistema
          </Button>
        </div>
      </div>
    </div>
  );
}

function InfoField({ label, value, mono }: { label: string; value?: string; mono?: boolean }) {
  return (
    <div>
      <p className="text-[11px] uppercase tracking-wider text-muted-foreground mb-0.5">{label}</p>
      <p className={`text-sm font-semibold ${mono ? 'font-mono' : ''}`}>{value || '—'}</p>
    </div>
  );
}
