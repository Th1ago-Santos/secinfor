import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { History, Printer, ArrowLeft, CheckCircle, Wrench, Archive, Package as PackageIcon, XCircle, Laptop, QrCode } from 'lucide-react';
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

const statusConfig: Record<string, { icon: React.ElementType; bgClass: string; textClass: string }> = {
  'Em uso': { icon: CheckCircle, bgClass: 'bg-success/10', textClass: 'text-success' },
  'Em manutenção': { icon: Wrench, bgClass: 'bg-warning/10', textClass: 'text-warning' },
  'Baixado': { icon: Archive, bgClass: 'bg-destructive/10', textClass: 'text-destructive' },
  'Em estoque': { icon: PackageIcon, bgClass: 'bg-info/10', textClass: 'text-info' },
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

      const { data: nb } = await supabase
        .from('notebooks')
        .select('*')
        .eq('patrimonio', patrimonio!)
        .single();

      if (nb) {
        const d = nb as any;
        setItem({
          id: d.id, patrimonio: d.patrimonio, tipo: 'notebook',
          modelo: d.modelo, secao: d.secao, militar: d.militar,
          status: d.status, foto_url: d.foto_url,
          created_at: d.created_at, updated_at: d.updated_at,
        });
        setLoading(false);
        return;
      }

      const { data: mat } = await supabase
        .from('materials')
        .select('*')
        .eq('patrimonio', patrimonio!)
        .single();

      if (mat) {
        const d = mat as any;
        setItem({
          id: d.id, patrimonio: d.patrimonio, tipo: 'material',
          nome: d.nome, codigo_material: d.codigo_material,
          numero_ficha: d.numero_ficha,
          created_at: d.created_at, updated_at: d.updated_at,
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
            <CardContent className="flex justify-center py-20">
              <div className="animate-spin h-10 w-10 border-4 border-primary border-t-transparent rounded-full" />
            </CardContent>
          </Card>
        ) : notFound ? (
          <Card className="border-destructive/30 shadow-lg">
            <CardContent className="text-center py-14">
              <div className="mx-auto w-16 h-16 rounded-2xl bg-destructive/10 flex items-center justify-center mb-5">
                <XCircle className="h-8 w-8 text-destructive" />
              </div>
              <p className="text-xl font-bold mb-1">Item não encontrado</p>
              <p className="text-sm text-muted-foreground mb-1">Patrimônio: <span className="font-mono font-semibold">{patrimonio}</span></p>
              <p className="text-xs text-muted-foreground">Este patrimônio não está cadastrado no sistema.</p>
            </CardContent>
          </Card>
        ) : item && (
          <Card className="overflow-hidden shadow-lg">
            {/* Status banner */}
            {item.tipo === 'notebook' && item.status && statusInfo && (
              <div className={`px-4 py-3 flex items-center justify-center gap-2 text-sm font-semibold ${statusInfo.bgClass} ${statusInfo.textClass}`}>
                <StatusIcon className="h-4 w-4" />
                {item.status}
              </div>
            )}

            {item.tipo === 'material' && (
              <div className="px-4 py-3 flex items-center justify-center gap-2 text-sm font-semibold bg-success/10 text-success">
                <CheckCircle className="h-4 w-4" />
                Item Encontrado
              </div>
            )}

            <CardHeader className="text-center pb-3">
              <CardTitle className="flex items-center justify-center gap-2 text-lg">
                {item.tipo === 'notebook' ? <Laptop className="h-5 w-5 text-primary" /> : <PackageIcon className="h-5 w-5 text-primary" />}
                {item.tipo === 'notebook' ? 'Notebook' : 'Material Carga'}
              </CardTitle>
            </CardHeader>

            <CardContent className="space-y-5">
              {item.foto_url && (
                <div className="rounded-xl overflow-hidden border bg-muted">
                  <img src={item.foto_url} alt="Foto" className="w-full h-auto max-h-56 object-contain" />
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
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

              <div className="flex justify-center pt-1">
                <div className="p-3 bg-white rounded-xl shadow-sm">
                  <QRCodeSVG value={`${baseUrl}/consulta/${item.patrimonio}`} size={100} />
                </div>
              </div>

              <div className="flex gap-2 pt-1">
                {item.tipo === 'notebook' && (
                  <Button size="sm" variant="outline" className="flex-1 transition-all duration-200" onClick={() => navigate(`/notebooks/${item.id}/historico`)}>
                    <History className="h-4 w-4 mr-1.5" />
                    Histórico
                  </Button>
                )}
                <Button size="sm" variant="outline" className="flex-1 transition-all duration-200" onClick={() => window.print()}>
                  <Printer className="h-4 w-4 mr-1.5" />
                  Imprimir
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="mt-4 text-center">
          <Button variant="ghost" size="sm" onClick={() => navigate('/')} className="text-muted-foreground hover:text-foreground transition-all duration-200">
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
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-0.5 font-medium">{label}</p>
      <p className={`text-sm font-semibold ${mono ? 'font-mono' : ''}`}>{value || '—'}</p>
    </div>
  );
}
