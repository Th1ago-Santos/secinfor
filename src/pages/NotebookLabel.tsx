import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { QRCodeSVG } from 'qrcode.react';
import { ArrowLeft, Printer, Laptop, ShieldCheck } from 'lucide-react';
import PageTransition from '@/components/PageTransition';
import NotebookPhoto from '@/components/NotebookPhoto';
import type { Notebook } from '@/types';

type Format = 'small' | 'a4';

const STATUS_COLOR: Record<string, string> = {
  'Em estoque': '#059669',
  'Em uso': '#2563eb',
  'Em manutenção': '#d97706',
  'Baixado': '#dc2626',
  'Fora de Carga': '#dc2626',
};

export default function NotebookLabel() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [nb, setNb] = useState<Notebook | null>(null);
  const [format, setFormat] = useState<Format>('small');
  const [copies, setCopies] = useState(6);

  useEffect(() => {
    if (!id) return;
    supabase.from('notebooks').select('*').eq('id', id).maybeSingle().then(({ data }) => {
      setNb((data as Notebook) || null);
    });
  }, [id]);

  if (!nb) return <div className="p-8 text-center text-muted-foreground">Carregando...</div>;

  const publicUrl = `${window.location.origin}/consulta/${encodeURIComponent(nb.patrimonio)}`;
  const items = Array.from({ length: copies });

  return (
    <PageTransition>
      <div className="min-h-screen bg-muted/20">
        <div className="no-print sticky top-0 z-50 bg-background/95 backdrop-blur border-b border-border/50">
          <div className="container mx-auto py-3 px-4 flex flex-wrap items-center gap-3 justify-between">
            <div className="flex items-center gap-2 flex-wrap">
              <Button variant="ghost" size="sm" onClick={() => navigate(-1)}><ArrowLeft className="h-4 w-4 mr-1.5" />Voltar</Button>
              <div className="flex bg-muted/50 rounded-lg p-1">
                <button className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${format === 'small' ? 'bg-background shadow' : 'text-muted-foreground'}`} onClick={() => setFormat('small')}>Térmica (90mm)</button>
                <button className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${format === 'a4' ? 'bg-background shadow' : 'text-muted-foreground'}`} onClick={() => setFormat('a4')}>A4 (várias)</button>
              </div>
              {format === 'a4' && (
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-muted-foreground">Cópias:</span>
                  <input type="number" min={1} max={24} value={copies} onChange={(e) => setCopies(Math.max(1, Math.min(24, parseInt(e.target.value) || 1)))} className="w-16 h-8 rounded border border-border/60 bg-background px-2 text-center" />
                </div>
              )}
            </div>
            <Button size="sm" onClick={() => window.print()} className="gradient-primary border-0">
              <Printer className="h-4 w-4 mr-1.5" />Imprimir
            </Button>
          </div>
        </div>

        <div className="container mx-auto py-6 px-4">
          <div className="print-area">
            {format === 'small' ? (
              <div className="flex justify-center print:block">
                <FichaCard notebook={nb} publicUrl={publicUrl} />
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3 print:gap-2">
                {items.map((_, i) => (
                  <FichaCard key={i} notebook={nb} publicUrl={publicUrl} />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <style>{`
        @media print {
          @page { size: ${format === 'small' ? '90mm 60mm' : 'A4'}; margin: ${format === 'small' ? '2mm' : '8mm'}; }
          body * { visibility: hidden; }
          .print-area, .print-area * { visibility: visible; }
          .print-area { position: absolute; left: 0; top: 0; width: 100%; }
          .no-print { display: none !important; }
        }
      `}</style>
    </PageTransition>
  );
}

function FichaCard({ notebook, publicUrl }: { notebook: Notebook; publicUrl: string }) {
  const statusColor = STATUS_COLOR[notebook.status] || '#6b7280';
  const patLabel = notebook.patrimonio?.startsWith('FC-') ? 'FORA DE CARGA' : notebook.patrimonio;
  const shortUrl = publicUrl.replace(/^https?:\/\//, '');

  return (
    <div
      className="relative bg-white text-black w-[340px] print:w-[86mm] print:break-inside-avoid rounded-md overflow-hidden shadow-sm"
      style={{ border: '1.5px solid #111827' }}
    >
      {/* Side stripe */}
      <div className="absolute left-0 top-0 bottom-0 w-1.5" style={{ backgroundColor: statusColor }} />

      {/* Header */}
      <div className="pl-3 pr-2 py-1.5 flex items-center gap-2 border-b border-black/70" style={{ background: '#111827', color: '#fff' }}>
        <div className="p-1 rounded bg-white/15">
          <ShieldCheck className="h-3.5 w-3.5" />
        </div>
        <div className="leading-tight flex-1 min-w-0">
          <p className="text-[7.5px] uppercase tracking-[0.18em] font-bold opacity-90">Exército Brasileiro · 14º B Log</p>
          <p className="text-[9px] font-semibold">Seção de Informática — Ficha de Identificação</p>
        </div>
        <Laptop className="h-3.5 w-3.5 opacity-80" />
      </div>

      {/* Body */}
      <div className="pl-3 pr-2.5 py-2 flex gap-2.5">
        <div className="flex-1 min-w-0 space-y-1">
          <div>
            <p className="text-[7px] uppercase tracking-widest text-black/50 font-semibold">Patrimônio</p>
            <p className="font-mono font-extrabold text-lg leading-none tracking-tight">{patLabel}</p>
          </div>

          <div className="pt-0.5">
            <p className="text-[7px] uppercase tracking-widest text-black/50 font-semibold">Modelo</p>
            <p className="text-[10px] font-semibold leading-tight truncate">{notebook.modelo || '—'}</p>
          </div>

          <div className="flex gap-1 flex-wrap pt-0.5">
            <span
              className="text-[7.5px] font-bold px-1.5 py-0.5 rounded text-white"
              style={{ backgroundColor: statusColor }}
            >
              {(notebook.status || 'Sem status').toUpperCase()}
            </span>
            {notebook.secao && (
              <span className="text-[7.5px] font-semibold px-1.5 py-0.5 rounded border border-black/60">
                {notebook.secao}
              </span>
            )}
          </div>

          <div className="pt-1 grid grid-cols-1 gap-y-0.5 text-[7.5px] text-black/70">
            {notebook.militar && <span>Responsável: <span className="font-semibold text-black">{notebook.militar}</span></span>}
            <span>Emitido: <span className="font-semibold text-black">{new Date().toLocaleDateString('pt-BR')} {new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span></span>
          </div>
        </div>

        {/* Photo + QR */}
        <div className="flex flex-col items-center gap-1 pt-0.5">
          <NotebookPhoto
            value={notebook.foto_url}
            alt="Foto"
            className="w-[70px] h-[52px] object-cover rounded border border-black/40"
            fallback={null}
          />
          <div className="p-1 bg-white border border-black/70 rounded">
            <QRCodeSVG value={publicUrl} size={72} level="M" bgColor="#ffffff" fgColor="#000000" />
          </div>
          <p className="text-[6.5px] text-center leading-tight w-[86px] font-medium">
            Escaneie para consultar
          </p>
        </div>
      </div>

      {/* Footer */}
      <div className="px-3 py-1 border-t border-black/20 flex items-center justify-between text-[7px] text-black/60">
        <span className="font-semibold tracking-wider uppercase">SECINFOR</span>
        <span className="font-mono truncate max-w-[60%]">{shortUrl}</span>
      </div>
    </div>
  );
}
