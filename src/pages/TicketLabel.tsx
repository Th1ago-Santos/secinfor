import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { QRCodeSVG } from 'qrcode.react';
import { ArrowLeft, Printer, Ticket as TicketIcon } from 'lucide-react';
import PageTransition from '@/components/PageTransition';
import { PRIORITY_COLORS, type Ticket, type TicketQueue, type TicketStatus, type TicketPriority } from '@/types/ticket';

type Format = 'small' | 'a4';

export default function TicketLabel() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [queue, setQueue] = useState<TicketQueue | null>(null);
  const [status, setStatus] = useState<TicketStatus | null>(null);
  const [format, setFormat] = useState<Format>('small');
  const [copies, setCopies] = useState(1);

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
      <div className="min-h-screen bg-background">
        {/* Toolbar */}
        <div className="no-print sticky top-0 z-50 bg-background/95 backdrop-blur border-b border-border/50">
          <div className="container mx-auto py-3 px-4 flex flex-wrap items-center gap-3 justify-between">
            <div className="flex items-center gap-2">
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
                <LabelSmall ticket={ticket} queue={queue} status={status} publicUrl={publicUrl} />
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3 print:gap-2">
                {items.map((_, i) => (
                  <LabelSmall key={i} ticket={ticket} queue={queue} status={status} publicUrl={publicUrl} />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <style>{`
        @media print {
          @page { size: ${format === 'small' ? '90mm 60mm' : 'A4'}; margin: ${format === 'small' ? '2mm' : '10mm'}; }
          body * { visibility: hidden; }
          .print-area, .print-area * { visibility: visible; }
          .print-area { position: absolute; left: 0; top: 0; width: 100%; }
          .no-print { display: none !important; }
        }
      `}</style>
    </PageTransition>
  );
}

function LabelSmall({ ticket, queue, status, publicUrl }: { ticket: Ticket; queue: TicketQueue | null; status: TicketStatus | null; publicUrl: string }) {
  return (
    <div className="border-2 border-foreground/80 rounded-md bg-white text-black p-2.5 w-[340px] print:w-[86mm] print:border print:break-inside-avoid">
      <div className="flex items-center gap-2 border-b border-foreground/40 pb-1.5 mb-1.5">
        <div className="p-1 bg-foreground/90 rounded">
          <TicketIcon className="h-3.5 w-3.5 text-white" />
        </div>
        <div className="leading-tight">
          <p className="text-[8px] uppercase tracking-widest font-bold">14° B Log · Sç Informática</p>
          <p className="text-[9px] font-semibold">Chamado Técnico</p>
        </div>
      </div>

      <div className="flex gap-2">
        <div className="flex-1 min-w-0 space-y-1">
          <p className="font-mono font-bold text-lg leading-none">{ticket.ticket_number}</p>
          <p className="text-[10px] font-semibold truncate">{ticket.client_section_name}</p>
          <p className="text-[9px] leading-tight">
            <span className="opacity-70">Placa:</span> {ticket.plate_name || <span className="italic opacity-60">sem placa</span>}
          </p>
          <p className="text-[9px] leading-tight truncate"><span className="opacity-70">Assunto:</span> {ticket.subject}</p>
          <div className="flex gap-1 flex-wrap pt-0.5">
            {queue && <span className="text-[8px] font-semibold px-1 py-0.5 border border-foreground/60 rounded">{queue.name}</span>}
            <span className="text-[8px] font-semibold px-1 py-0.5 border border-foreground/60 rounded">{ticket.priority}</span>
          </div>
          <p className="text-[8px] opacity-70">Aberto: {new Date(ticket.created_at).toLocaleDateString('pt-BR')}</p>
          {ticket.equipment_patrimonio && <p className="text-[8px] opacity-70">Patr.: <span className="font-mono">{ticket.equipment_patrimonio}</span></p>}
        </div>
        <div className="flex flex-col items-center gap-0.5">
          <QRCodeSVG value={publicUrl} size={80} level="M" bgColor="#ffffff" fgColor="#000000" />
          <p className="text-[7px] text-center leading-tight w-[80px]">Escaneie para consultar</p>
        </div>
      </div>
    </div>
  );
}
