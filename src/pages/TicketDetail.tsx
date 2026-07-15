import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { QRCodeSVG } from 'qrcode.react';
import {
  Ticket as TicketIcon, ArrowLeft, Printer, Pencil, Building, Tag, Layers,
  AlertTriangle, Clock, User, Paperclip, History as HistoryIcon, ExternalLink,
} from 'lucide-react';
import PageTransition from '@/components/PageTransition';
import { formatTicketAge, PRIORITY_COLORS, type Ticket, type TicketHistory, type TicketAttachment, type TicketQueue, type TicketStatus, type TicketPriority } from '@/types/ticket';
import NotebookPhoto from '@/components/NotebookPhoto';
import { useAuth } from '@/hooks/useAuth';
import { useUserRole } from '@/hooks/useUserRole';

interface Props { publicMode?: boolean }

export default function TicketDetail({ publicMode = false }: Props) {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { canEdit } = useUserRole();

  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [queue, setQueue] = useState<TicketQueue | null>(null);
  const [status, setStatus] = useState<TicketStatus | null>(null);
  const [history, setHistory] = useState<TicketHistory[]>([]);
  const [attachments, setAttachments] = useState<TicketAttachment[]>([]);
  const [equipmentPhoto, setEquipmentPhoto] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    (async () => {
      setLoading(true);
      const { data: t } = await (supabase as any).from('tickets').select('*').eq('id', id).is('deleted_at', null).maybeSingle();
      if (!t) { setLoading(false); return; }
      setTicket(t as Ticket);

      const [q, s, h, a] = await Promise.all([
        t.queue_id ? (supabase as any).from('ticket_queues').select('*').eq('id', t.queue_id).maybeSingle() : Promise.resolve({ data: null }),
        t.status_id ? (supabase as any).from('ticket_statuses').select('*').eq('id', t.status_id).maybeSingle() : Promise.resolve({ data: null }),
        (supabase as any).from('ticket_history').select('*').eq('ticket_id', id).order('created_at', { ascending: false }),
        (supabase as any).from('ticket_attachments').select('*').eq('ticket_id', id).order('created_at'),
      ]);
      setQueue(q.data as TicketQueue | null);
      setStatus(s.data as TicketStatus | null);
      setHistory((h.data as TicketHistory[]) || []);
      setAttachments((a.data as TicketAttachment[]) || []);

      // Fetch equipment photo
      if (t.equipment_type === 'notebook' && t.equipment_id) {
        const { data: nb } = await supabase.from('notebooks').select('foto_url').eq('id', t.equipment_id).maybeSingle();
        setEquipmentPhoto(nb?.foto_url || null);
      }
      setLoading(false);
    })();
  }, [id]);

  if (loading) return <div className="p-10 text-center text-muted-foreground">Carregando chamado...</div>;
  if (!ticket) return (
    <div className="min-h-screen flex items-center justify-center bg-background p-6">
      <Card className="max-w-md w-full"><CardContent className="pt-6 text-center space-y-3">
        <AlertTriangle className="h-10 w-10 mx-auto text-destructive" />
        <h2 className="text-lg font-semibold">Chamado não encontrado</h2>
        <p className="text-sm text-muted-foreground">Este chamado pode ter sido removido ou o link é inválido.</p>
        {!publicMode && <Button variant="outline" onClick={() => navigate('/chamados')}>Voltar</Button>}
      </CardContent></Card>
    </div>
  );

  const publicUrl = `${window.location.origin}/chamados/${ticket.id}`;
  const isAuthed = !!user;

  return (
    <PageTransition>
      <div className="container mx-auto py-6 px-4 max-w-5xl">
        {isAuthed && !publicMode && (
          <div className="flex items-center justify-between mb-4 no-print">
            <Button variant="ghost" size="sm" onClick={() => navigate('/chamados')}><ArrowLeft className="h-4 w-4 mr-1.5" />Voltar</Button>
            <div className="flex gap-2">
              {canEdit && <Button variant="outline" size="sm" onClick={() => navigate(`/chamados/${ticket.id}/editar`)}><Pencil className="h-3.5 w-3.5 mr-1.5" />Editar</Button>}
              <Button variant="outline" size="sm" onClick={() => navigate(`/chamados/${ticket.id}/etiqueta`)}><Printer className="h-3.5 w-3.5 mr-1.5" />Imprimir etiqueta</Button>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Main info */}
          <div className="lg:col-span-2 space-y-4">
            <Card className="shadow-card border-border/50 overflow-hidden">
              <div className="gradient-primary p-5 text-primary-foreground">
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-xl bg-white/15 backdrop-blur">
                      <TicketIcon className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-[10px] uppercase tracking-widest opacity-80">Chamado Técnico</p>
                      <h1 className="text-2xl font-bold font-mono tracking-tight">{ticket.ticket_number}</h1>
                    </div>
                  </div>
                  <div className="flex gap-2 flex-wrap">
                    {status && <Badge variant="secondary" className="bg-white/20 text-white border-0 backdrop-blur" style={{ backgroundColor: status.color || undefined }}>{status.name}</Badge>}
                    <Badge variant="secondary" className={`${PRIORITY_COLORS[ticket.priority as TicketPriority]} border`}>{ticket.priority}</Badge>
                  </div>
                </div>
              </div>
              <CardContent className="pt-5 space-y-4">
                <div>
                  <h2 className="text-lg font-bold">{ticket.subject}</h2>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap mt-2">{ticket.description}</p>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-3 border-t border-border/40">
                  <InfoRow icon={Building} label="Seção / Cliente" value={ticket.client_section_name} />
                  <InfoRow icon={Tag} label="Placa" value={ticket.plate_name || <span className="italic text-muted-foreground">Sem placa cadastrada</span>} />
                  <InfoRow icon={Layers} label="Fila" value={queue?.name || '—'} />
                  <InfoRow icon={AlertTriangle} label="Prioridade" value={ticket.priority} />
                  <InfoRow icon={Clock} label="Aberto em" value={new Date(ticket.created_at).toLocaleString('pt-BR')} />
                  <InfoRow icon={Clock} label="Tempo em aberto" value={formatTicketAge(ticket.created_at, ticket.closed_at)} />
                  {isAuthed && ticket.assigned_user_name && <InfoRow icon={User} label="Responsável" value={ticket.assigned_user_name} />}
                  {isAuthed && ticket.created_by_name && <InfoRow icon={User} label="Aberto por" value={ticket.created_by_name} />}
                </div>

                {ticket.equipment_patrimonio && (
                  <div className="pt-3 border-t border-border/40">
                    <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-2">Equipamento vinculado</p>
                    <div className="flex items-center gap-3">
                      {equipmentPhoto && (
                        <div className="w-20 h-20 rounded-lg overflow-hidden bg-muted flex-shrink-0">
                          <NotebookPhoto value={equipmentPhoto} className="w-full h-full object-cover" fallback={<div className="w-full h-full bg-muted" />} />
                        </div>
                      )}
                      <div>
                        <p className="font-mono text-sm font-semibold">{ticket.equipment_patrimonio}</p>
                        <p className="text-xs text-muted-foreground capitalize">{ticket.equipment_type}</p>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {isAuthed && attachments.length > 0 && (
              <Card className="shadow-card border-border/50">
                <CardContent className="pt-5">
                  <h3 className="text-sm font-semibold flex items-center gap-2 mb-3"><Paperclip className="h-4 w-4" /> Anexos ({attachments.length})</h3>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                    {attachments.map(a => <AttachmentThumb key={a.id} att={a} />)}
                  </div>
                </CardContent>
              </Card>
            )}

            {isAuthed && history.length > 0 && (
              <Card className="shadow-card border-border/50">
                <CardContent className="pt-5">
                  <h3 className="text-sm font-semibold flex items-center gap-2 mb-3"><HistoryIcon className="h-4 w-4" /> Histórico</h3>
                  <ul className="space-y-2">
                    {history.map(h => (
                      <li key={h.id} className="text-xs border-l-2 border-primary/40 pl-3 py-1">
                        <div className="flex justify-between gap-2">
                          <span className="font-medium">{h.action}</span>
                          <span className="text-muted-foreground text-[10px]">{new Date(h.created_at).toLocaleString('pt-BR')}</span>
                        </div>
                        {h.description && <p className="text-muted-foreground mt-0.5">{h.description}</p>}
                        {h.user_name && <p className="text-[10px] text-muted-foreground/70 mt-0.5">por {h.user_name}</p>}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}
          </div>

          {/* QR Code sidebar */}
          <div>
            <Card className="shadow-card border-border/50 sticky top-4">
              <CardContent className="pt-5 text-center space-y-3">
                <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold">Consulta rápida</p>
                <div className="bg-white p-3 rounded-xl inline-block">
                  <QRCodeSVG value={publicUrl} size={180} level="M" />
                </div>
                <p className="text-[10px] text-muted-foreground">Escaneie para consultar</p>
                {!isAuthed && (
                  <Button variant="outline" size="sm" className="w-full" onClick={() => navigate('/login')}>
                    <ExternalLink className="h-3.5 w-3.5 mr-1.5" />Acessar sistema
                  </Button>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </PageTransition>
  );
}

function InfoRow({ icon: Icon, label, value }: { icon: any; label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2">
      <Icon className="h-3.5 w-3.5 mt-0.5 text-muted-foreground shrink-0" />
      <div className="min-w-0">
        <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold">{label}</p>
        <p className="text-sm font-medium truncate">{value}</p>
      </div>
    </div>
  );
}

function AttachmentThumb({ att }: { att: TicketAttachment }) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    supabase.storage.from('ticket-attachments').createSignedUrl(att.file_path, 300).then(({ data }) => {
      setUrl(data?.signedUrl || null);
    });
  }, [att.file_path]);
  const isImg = (att.file_type || '').startsWith('image/');
  return (
    <a href={url || '#'} target="_blank" rel="noreferrer" className="border border-border/60 rounded-lg overflow-hidden hover:border-primary/50 transition-colors block">
      {isImg && url ? (
        <img src={url} alt={att.file_name} className="w-full h-24 object-cover" />
      ) : (
        <div className="flex flex-col items-center justify-center h-24 gap-1 text-muted-foreground p-2">
          <Paperclip className="h-5 w-5" />
          <span className="text-[10px] text-center truncate max-w-full">{att.file_name}</span>
        </div>
      )}
    </a>
  );
}
