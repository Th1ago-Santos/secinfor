import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { QRCodeSVG } from 'qrcode.react';
import { ArrowLeft, Printer, Ticket as TicketIcon, ShieldCheck } from 'lucide-react';
import PageTransition from '@/components/PageTransition';
import { type Ticket, type TicketQueue, type TicketStatus } from '@/types/ticket';

type Format = 'small' | 'a4';

export default function TicketLabel() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [queue, setQueue] = useState<TicketQueue | null>(null);
  const [status, setStatus] = useState<TicketStatus | null>(null);
  const [format, setFormat] = useState<Format>('small');
  const [copies, setCopies] = useState(6);

  useEffect(() => {
    if (!id) return;
    (async () => {
      const { data: t } = await (supabase as any).from('tickets').select('*').eq('id', id).is('deleted_at', null).maybeSingle();
      if (!t) return;
      setTicket(t as Ticket);
      const [q, s] = await Promise.all([
        t.queue_id ? (supabase as any).from('ticket_queues').select('*').eq('id', t.queue_id).maybeSingle() : Promise.resolve({ data: null }),
        t.status_id ? (supabase as any).from('ticket_statuses').select('*').eq('id', t.status_id).maybeSingle() : Promise.resolve({ data: null }),
      ]);
      setQueue(q.data as TicketQueue | null);
      setStatus(s.data as TicketStatus | null);
    })();
  }, [id]);

  if (!ticket) return <div className="p-8 text-center text-muted-foreground">Carregando...</div>;

  const publicUrl = `${window.location.origin}/chamados/${ticket.id}`;
  const items = Array.from({ length: copies });

  return (
    <PageTransition>
      <div className="min-h-screen bg-muted/20">
        {/* Toolbar */}
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

        {/* Preview */}
        <div className="container mx-auto py-6 px-4">
          <div className="print-area">
            {format === 'small' ? (
              <div className="flex justify-center print:block">
                <LabelCard ticket={ticket} queue={queue} status={status} publicUrl={publicUrl} />
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3 print:gap-2">
                {items.map((_, i) => (
                  <LabelCard key={i} ticket={ticket} queue={queue} status={status} publicUrl={publicUrl} />
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

function LabelCard({ ticket, queue, status, publicUrl }: { ticket: Ticket; queue: TicketQueue | null; status: TicketStatus | null; publicUrl: string }) {
  const priorityColor: Record<string, string> = {
    Baixa: '#059669',
    Normal: '#2563eb',
    Alta: '#d97706',
    Urgente: '#dc2626',
  };
  const pColor = priorityColor[ticket.priority] || '#111827';

  return (
    <div
      className="relative bg-white text-black w-[340px] print:w-[86mm] print:break-inside-avoid rounded-md overflow-hidden shadow-sm"
      style={{ border: '1.5px solid #111827' }}
    >
      {/* Priority side stripe */}
      <div className="absolute left-0 top-0 bottom-0 w-1.5" style={{ backgroundColor: pColor }} />

      {/* Header */}
      <div className="pl-3 pr-2 py-1.5 flex items-center gap-2 border-b border-black/70" style={{ background: '#111827', color: '#fff' }}>
        <div className="p-1 rounded bg-white/15">
          <ShieldCheck className="h-3.5 w-3.5" />
        </div>
        <div className="leading-tight flex-1 min-w-0">
          <p className="text-[7.5px] uppercase tracking-[0.18em] font-bold opacity-90">Exército Brasileiro · 14º B Log</p>
          <p className="text-[9px] font-semibold">Seção de Informática — Chamado Técnico</p>
        </div>
        <TicketIcon className="h-3.5 w-3.5 opacity-80" />
      </div>

      {/* Body */}
      <div className="pl-3 pr-2.5 py-2 flex gap-2.5">
        <div className="flex-1 min-w-0 space-y-1">
          <div>
            <p className="text-[7px] uppercase tracking-widest text-black/50 font-semibold">Nº do Chamado</p>
            <p className="font-mono font-extrabold text-lg leading-none tracking-tight">{ticket.ticket_number}</p>
          </div>

          <div className="pt-0.5">
            <p className="text-[7px] uppercase tracking-widest text-black/50 font-semibold">Seção Solicitante</p>
            <p className="text-[10px] font-semibold leading-tight truncate">{ticket.client_section_name}</p>
          </div>

          <div>
            <p className="text-[7px] uppercase tracking-widest text-black/50 font-semibold">Assunto</p>
            <p className="text-[9.5px] leading-tight line-clamp-2">{ticket.subject}</p>
          </div>

          <div className="flex gap-1 flex-wrap pt-0.5">
            {queue && (
              <span className="text-[7.5px] font-semibold px-1.5 py-0.5 rounded border border-black/60">
                {queue.name}
              </span>
            )}
            <span
              className="text-[7.5px] font-bold px-1.5 py-0.5 rounded text-white"
              style={{ backgroundColor: pColor }}
            >
              {ticket.priority.toUpperCase()}
            </span>
            {status && (
              <span className="text-[7.5px] font-semibold px-1.5 py-0.5 rounded border border-black/60">
                {status.name}
              </span>
            )}
          </div>

          <div className="pt-1 grid grid-cols-2 gap-x-2 gap-y-0.5 text-[7.5px] text-black/70">
            <span>Aberto: <span className="font-semibold text-black">{new Date(ticket.created_at).toLocaleDateString('pt-BR')}</span></span>
            {ticket.plate_name && <span>Placa: <span className="font-semibold text-black">{ticket.plate_name}</span></span>}
            {ticket.equipment_patrimonio && <span className="col-span-2">Patr.: <span className="font-mono font-semibold text-black">{ticket.equipment_patrimonio}</span></span>}
          </div>
        </div>

        {/* QR */}
        <div className="flex flex-col items-center gap-0.5 pt-0.5">
          <div className="p-1 bg-white border border-black/70 rounded">
            <QRCodeSVG value={publicUrl} size={82} level="M" bgColor="#ffffff" fgColor="#000000" />
          </div>
          <p className="text-[6.5px] text-center leading-tight w-[90px] font-medium">
            Escaneie para acompanhar
          </p>
        </div>
      </div>

      {/* Footer */}
      <div className="px-3 py-1 border-t border-black/20 flex items-center justify-between text-[7px] text-black/60">
        <span className="font-semibold tracking-wider uppercase">SECINFOR</span>
        <span className="font-mono truncate max-w-[60%]">{publicUrl.replace(/^https?:\/\//, '')}</span>
      </div>
    </div>
  );
}
