import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  History,
  Printer,
  ArrowLeft,
  CheckCircle,
  Wrench,
  Archive,
  Package as PackageIcon,
  XCircle,
  Laptop,
  ImageOff,
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';

function PublicNotebookPhoto({ patrimonio, fallback, className, alt }: { patrimonio: string; fallback: React.ReactNode; className?: string; alt?: string }) {
  const [url, setUrl] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    let cancelled = false;
    supabase.functions.invoke('public-notebook-photo', { body: { patrimonio } }).then(({ data }) => {
      if (cancelled) return;
      setUrl((data as any)?.url ?? null);
      setReady(true);
    }).catch(() => { if (!cancelled) { setUrl(null); setReady(true); } });
    return () => { cancelled = true; };
  }, [patrimonio]);
  if (!ready) return null;
  if (!url) return <>{fallback}</>;
  return <img src={url} alt={alt} className={className} />;
}

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

const statusConfig: Record<
  string,
  { icon: React.ElementType; dot: string; badge: string; ring: string }
> = {
  'Em uso': {
    icon: CheckCircle,
    dot: 'bg-emerald-400',
    badge: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
    ring: 'ring-emerald-500/20',
  },
  'Em manutenção': {
    icon: Wrench,
    dot: 'bg-amber-400',
    badge: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
    ring: 'ring-amber-500/20',
  },
  Baixado: {
    icon: Archive,
    dot: 'bg-rose-400',
    badge: 'bg-rose-500/15 text-rose-300 border-rose-500/30',
    ring: 'ring-rose-500/20',
  },
  'Em estoque': {
    icon: PackageIcon,
    dot: 'bg-sky-400',
    badge: 'bg-sky-500/15 text-sky-300 border-sky-500/30',
    ring: 'ring-sky-500/20',
  },
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
      const { data, error } = await supabase.rpc('lookup_patrimonio', {
        p_patrimonio: patrimonio!,
      });
      if (error || !data) {
        setNotFound(true);
        setLoading(false);
        return;
      }
      const d = data as any;
      setItem({
        id: d.id,
        patrimonio: d.patrimonio,
        tipo: d.tipo,
        modelo: d.modelo,
        nome: d.nome,
        secao: d.secao,
        militar: d.militar,
        status: d.status,
        foto_url: d.foto_url,
        codigo_material: d.codigo_material,
        numero_ficha: d.numero_ficha,
        created_at: d.created_at,
        updated_at: d.updated_at,
      });
      setLoading(false);
    };
    fetchItem();
  }, [patrimonio]);

  const baseUrl = window.location.origin;
  const statusInfo = item?.status ? statusConfig[item.status] || statusConfig['Em uso'] : null;
  const StatusIcon = statusInfo?.icon || CheckCircle;
  const patrimonioDisplay = item?.patrimonio?.startsWith('FC-')
    ? 'FORA DE CARGA'
    : item?.patrimonio;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-slate-100 flex items-center justify-center p-3 sm:p-6">
      <div className="w-full max-w-md animate-in-page">
        {loading ? (
          <Card className="bg-slate-900/60 border-slate-800 backdrop-blur">
            <CardContent className="flex flex-col items-center justify-center py-16 gap-3">
              <div className="animate-spin h-10 w-10 border-4 border-primary border-t-transparent rounded-full" />
              <p className="text-sm text-slate-400">Carregando ficha...</p>
            </CardContent>
          </Card>
        ) : notFound ? (
          <Card className="bg-slate-900/70 border-rose-500/30 backdrop-blur shadow-2xl">
            <CardContent className="text-center py-12">
              <div className="mx-auto w-16 h-16 rounded-2xl bg-rose-500/15 flex items-center justify-center mb-4 ring-4 ring-rose-500/10">
                <XCircle className="h-8 w-8 text-rose-400" />
              </div>
              <p className="text-xl font-bold mb-1">Item não encontrado</p>
              <p className="text-sm text-slate-400 mb-1">
                Patrimônio:{' '}
                <span className="font-mono font-semibold text-slate-200">{patrimonio}</span>
              </p>
              <p className="text-xs text-slate-500">
                Este patrimônio não está cadastrado no sistema.
              </p>
            </CardContent>
          </Card>
        ) : (
          item && (
            <Card className="overflow-hidden bg-slate-900/70 border-slate-800 backdrop-blur shadow-2xl">
              {/* Header with gradient + status */}
              <div className="relative px-5 pt-5 pb-4 bg-gradient-to-br from-slate-800/80 via-slate-900/50 to-transparent border-b border-slate-800">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <div className="h-9 w-9 rounded-xl bg-primary/15 border border-primary/30 flex items-center justify-center">
                      {item.tipo === 'notebook' ? (
                        <Laptop className="h-4.5 w-4.5 text-primary" />
                      ) : (
                        <PackageIcon className="h-4.5 w-4.5 text-primary" />
                      )}
                    </div>
                    <div>
                      <p className="text-[10px] uppercase tracking-widest text-slate-500 font-medium">
                        {item.tipo === 'notebook' ? 'Notebook' : 'Material Carga'}
                      </p>
                      <p className="text-sm font-semibold text-slate-100">Ficha Patrimonial</p>
                    </div>
                  </div>
                  {item.tipo === 'notebook' && item.status && statusInfo && (
                    <div
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[11px] font-semibold ${statusInfo.badge}`}
                    >
                      <span className={`h-1.5 w-1.5 rounded-full ${statusInfo.dot} animate-pulse`} />
                      <StatusIcon className="h-3 w-3" />
                      {item.status}
                    </div>
                  )}
                </div>
              </div>

              <CardContent className="p-5 space-y-5">
                {/* Photo */}
                {item.tipo === 'notebook' && (
                  <div
                    className={`relative rounded-2xl overflow-hidden border border-slate-800 bg-slate-950 aspect-[4/3] flex items-center justify-center ring-1 ${statusInfo?.ring ?? 'ring-slate-700/30'}`}
                  >
                    <NotebookPhoto
                      value={item.foto_url}
                      alt={`Foto do notebook ${item.patrimonio}`}
                      className="w-full h-full object-contain"
                      fallback={
                        <div className="flex flex-col items-center justify-center text-slate-500 gap-2 p-6">
                          <div className="h-14 w-14 rounded-2xl bg-slate-800/70 flex items-center justify-center">
                            <ImageOff className="h-6 w-6" />
                          </div>
                          <p className="text-xs font-medium text-slate-400">
                            Sem foto cadastrada
                          </p>
                        </div>
                      }
                    />
                  </div>
                )}

                {/* Patrimonio big */}
                <div className="text-center py-2">
                  <p className="text-[10px] uppercase tracking-widest text-slate-500 mb-1 font-medium">
                    Patrimônio
                  </p>
                  <p className="text-2xl font-bold font-mono tracking-wide text-slate-50">
                    {patrimonioDisplay}
                  </p>
                </div>

                {/* Info grid */}
                <div className="grid grid-cols-2 gap-x-4 gap-y-3 rounded-xl bg-slate-950/40 border border-slate-800 p-4">
                  {item.tipo === 'notebook' && (
                    <>
                      <InfoField label="Modelo" value={item.modelo} />
                      <InfoField label="Seção" value={item.secao} />
                      <InfoField label="Militar" value={item.militar} full />
                    </>
                  )}
                  {item.tipo === 'material' && (
                    <>
                      <InfoField label="Nome" value={item.nome} full />
                      <InfoField label="Código" value={item.codigo_material} mono />
                      <InfoField label="Nº Ficha" value={item.numero_ficha} mono />
                    </>
                  )}
                  {item.created_at && (
                    <InfoField
                      label="Cadastrado"
                      value={new Date(item.created_at).toLocaleDateString('pt-BR')}
                    />
                  )}
                  {item.updated_at && (
                    <InfoField
                      label="Atualizado"
                      value={new Date(item.updated_at).toLocaleDateString('pt-BR')}
                    />
                  )}
                </div>

                {/* QR */}
                <div className="flex flex-col items-center gap-2 pt-1">
                  <div className="p-2.5 bg-white rounded-xl shadow-lg">
                    <QRCodeSVG value={`${baseUrl}/consulta/${item.patrimonio}`} size={92} />
                  </div>
                  <p className="text-[10px] uppercase tracking-widest text-slate-500">
                    Consulta rápida
                  </p>
                </div>

                {/* Actions */}
                <div className="grid grid-cols-2 gap-2 pt-1">
                  {item.tipo === 'notebook' && (
                    <Button
                      size="sm"
                      variant="secondary"
                      className="bg-slate-800 hover:bg-slate-700 text-slate-100 border border-slate-700"
                      onClick={() => navigate(`/notebooks/${item.id}/historico`)}
                    >
                      <History className="h-4 w-4 mr-1.5" />
                      Histórico
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="secondary"
                    className={`bg-slate-800 hover:bg-slate-700 text-slate-100 border border-slate-700 ${item.tipo !== 'notebook' ? 'col-span-2' : ''}`}
                    onClick={() => window.print()}
                  >
                    <Printer className="h-4 w-4 mr-1.5" />
                    Imprimir
                  </Button>
                </div>
              </CardContent>
            </Card>
          )
        )}

        <div className="mt-4 text-center">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/')}
            className="text-slate-400 hover:text-slate-100 hover:bg-slate-800/60"
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            Ir para o sistema
          </Button>
        </div>
      </div>
    </div>
  );
}

function InfoField({
  label,
  value,
  mono,
  full,
}: {
  label: string;
  value?: string;
  mono?: boolean;
  full?: boolean;
}) {
  return (
    <div className={full ? 'col-span-2' : ''}>
      <p className="text-[10px] uppercase tracking-widest text-slate-500 mb-0.5 font-medium">
        {label}
      </p>
      <p
        className={`text-sm font-semibold text-slate-100 break-words ${mono ? 'font-mono' : ''}`}
      >
        {value || '—'}
      </p>
    </div>
  );
}
