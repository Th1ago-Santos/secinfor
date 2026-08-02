import { useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { QRCodeSVG } from 'qrcode.react';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from '@/hooks/use-toast';
import {
  Ticket as TicketIcon, ArrowLeft, Printer, Pencil, Building, Tag, Layers,
  AlertTriangle, Clock, User, Paperclip, History as HistoryIcon, ExternalLink,
  MessageSquare, Send, Lock, Globe, Eye, UserCheck, Timer, ImageOff, ListChecks, FolderTree,
} from 'lucide-react';
import PageTransition from '@/components/PageTransition';
import {
  formatTicketAge, PRIORITY_COLORS, MESSAGE_TYPES, MESSAGE_TYPE_LABEL,
  CHECKLIST_ITEMS, ATTACHMENT_KIND_LABEL, ATTACHMENT_KINDS, computeSla,
  type Ticket, type TicketHistory, type TicketAttachment, type TicketQueue, type TicketStatus, type TicketPriority, type TicketMessage, type PublicAttachment,
} from '@/types/ticket';
import NotebookPhoto from '@/components/NotebookPhoto';
import { useAuth } from '@/hooks/useAuth';
import { useUserRole } from '@/hooks/useUserRole';
import { useTicketQueues, useTicketStatuses, useTicketSla } from '@/hooks/useTicketMeta';


interface Props { publicMode?: boolean }

interface PublicMsg { created_at: string; message_type: string; content: string; status_name: string | null }

export default function TicketDetail({ publicMode = false }: Props) {
  const params = useParams<{ id?: string; token?: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { canEdit } = useUserRole();
  const { queues } = useTicketQueues();
  const { statuses } = useTicketStatuses();
  const { sla } = useTicketSla();

  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [queue, setQueue] = useState<TicketQueue | null>(null);
  const [status, setStatus] = useState<TicketStatus | null>(null);
  const [history, setHistory] = useState<TicketHistory[]>([]);
  const [attachments, setAttachments] = useState<TicketAttachment[]>([]);
  const [messages, setMessages] = useState<TicketMessage[]>([]);
  const [publicMessages, setPublicMessages] = useState<PublicMsg[]>([]);
  const [equipmentPhoto, setEquipmentPhoto] = useState<string | null>(null);
  const [equipmentInfo, setEquipmentInfo] = useState<{ nome: string; secao: string | null; status: string | null } | null>(null);
  const [checklist, setChecklist] = useState<Record<string, boolean>>({});
  const [savingChecklist, setSavingChecklist] = useState(false);
  const [assigning, setAssigning] = useState(false);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  // Composer
  const [msgContent, setMsgContent] = useState('');
  const [msgVisibility, setMsgVisibility] = useState<'publica' | 'interna'>('publica');
  const [msgType, setMsgType] = useState<string>('atualizacao');
  const [newStatusId, setNewStatusId] = useState<string>('');
  const [newQueueId, setNewQueueId] = useState<string>('');
  const [newPriority, setNewPriority] = useState<string>('');
  const [sending, setSending] = useState(false);
  const [messagesFilter, setMessagesFilter] = useState<'todas' | 'publica' | 'interna'>('todas');

  const loadAuthenticated = async (ticketId: string) => {
    const { data: t } = await (supabase as any).from('tickets').select('*').eq('id', ticketId).is('deleted_at', null).maybeSingle();
    if (!t) { setNotFound(true); setLoading(false); return; }
    setTicket(t as Ticket);
    setChecklist((t.checklist as Record<string, boolean>) || {});
    const [q, s, h, a, m] = await Promise.all([
      t.queue_id ? (supabase as any).from('ticket_queues').select('*').eq('id', t.queue_id).maybeSingle() : Promise.resolve({ data: null }),
      t.status_id ? (supabase as any).from('ticket_statuses').select('*').eq('id', t.status_id).maybeSingle() : Promise.resolve({ data: null }),
      (supabase as any).from('ticket_history').select('*').eq('ticket_id', ticketId).order('created_at', { ascending: false }),
      (supabase as any).from('ticket_attachments').select('*').eq('ticket_id', ticketId).order('created_at'),
      (supabase as any).from('ticket_messages').select('*').eq('ticket_id', ticketId).is('deleted_at', null).order('created_at', { ascending: true }),
    ]);
    setQueue(q.data as TicketQueue | null);
    setStatus(s.data as TicketStatus | null);
    setHistory((h.data as TicketHistory[]) || []);
    const atts = (a.data as TicketAttachment[]) || [];
    setAttachments(atts);
    setMessages((m.data as TicketMessage[]) || []);

    // Equipment card: photo priority 1) patrimônio 2) foto do equipamento anexada 3) foto pública do problema
    let photo: string | null = null;
    if (t.equipment_type === 'notebook' && t.equipment_id) {
      const { data: nb } = await supabase.from('notebooks').select('foto_url,modelo,secao,status').eq('id', t.equipment_id).maybeSingle();
      photo = nb?.foto_url || null;
      if (nb) setEquipmentInfo({ nome: nb.modelo || '—', secao: nb.secao, status: nb.status });
      else setEquipmentInfo(null);
    } else if (t.equipment_type === 'material' && t.equipment_id) {
      const { data: mt } = await supabase.from('materials').select('nome').eq('id', t.equipment_id).maybeSingle();
      setEquipmentInfo(mt ? { nome: mt.nome, secao: null, status: null } : null);
    } else {
      setEquipmentInfo(null);
    }
    if (!photo) {
      const imgAtt =
        atts.find(x => x.kind === 'foto_equipamento' && (x.file_type || '').startsWith('image/')) ||
        atts.find(x => x.kind === 'foto_problema' && x.visibility === 'publica' && (x.file_type || '').startsWith('image/'));
      if (imgAtt) {
        const { data: signed } = await supabase.storage.from('ticket-attachments').createSignedUrl(imgAtt.file_path, 600);
        photo = signed?.signedUrl || null;
      }
    }
    setEquipmentPhoto(photo);
    setLoading(false);
  };

  const assumeTicket = async () => {
    if (!ticket || assigning) return;
    setAssigning(true);
    const { error } = await (supabase as any).rpc('assign_ticket_self', { p_ticket_id: ticket.id });
    if (error) toast({ title: 'Erro ao assumir chamado', description: error.message, variant: 'destructive' });
    else { toast({ title: 'Chamado assumido com sucesso.' }); await loadAuthenticated(ticket.id); }
    setAssigning(false);
  };

  const toggleChecklist = async (key: string, value: boolean) => {
    if (!ticket) return;
    const next = { ...checklist, [key]: value };
    setChecklist(next);
    setSavingChecklist(true);
    const { error } = await (supabase as any).rpc('update_ticket_checklist', { p_ticket_id: ticket.id, p_checklist: next });
    if (error) { toast({ title: 'Erro ao salvar checklist', description: error.message, variant: 'destructive' }); setChecklist(checklist); }
    setSavingChecklist(false);
  };


  useEffect(() => {
    (async () => {
      setLoading(true); setNotFound(false);

      if (publicMode) {
        // Support both /chamado/publico/:token and legacy /chamados/:id/publico
        const token = params.token || params.id;
        if (!token) { setNotFound(true); setLoading(false); return; }
        const [{ data: t }, { data: msgs }] = await Promise.all([
          (supabase as any).rpc('lookup_ticket_public', { p_token: token }),
          (supabase as any).rpc('list_ticket_messages_public', { p_token: token, p_limit: 20 }),
        ]);
        if (!t) { setNotFound(true); setLoading(false); return; }
        const d = t as any;
        setTicket({
          id: d.id,
          public_token: d.public_token,
          ticket_number: d.ticket_number,
          subject: d.subject,
          description: d.description,
          category: d.category,
          priority: d.priority,

          client_section_name: d.client_section_name,
          plate_name: d.plate_name,
          equipment_type: d.equipment_type,
          equipment_patrimonio: d.equipment_patrimonio,
          created_at: d.created_at,
          updated_at: d.updated_at,
          closed_at: d.closed_at,
        } as unknown as Ticket);
        if (d.queue_name) setQueue({ id: '', name: d.queue_name } as TicketQueue);
        if (d.status_name) setStatus({ id: '', name: d.status_name, color: d.status_color } as TicketStatus);
        setPublicMessages(Array.isArray(msgs) ? (msgs as PublicMsg[]) : []);
        setLoading(false);
        return;
      }

      if (!params.id) { setNotFound(true); setLoading(false); return; }
      await loadAuthenticated(params.id);
    })();
  }, [params.id, params.token, publicMode]);

  const filteredMessages = useMemo(() => {
    if (messagesFilter === 'todas') return messages;
    return messages.filter(m => m.visibility === messagesFilter);
  }, [messages, messagesFilter]);

  const submitMessage = async () => {
    if (!ticket || sending) return;
    const content = msgContent.trim();
    if (!content) { toast({ title: 'Escreva uma mensagem', variant: 'destructive' }); return; }
    setSending(true);
    try {
      const { error } = await (supabase as any).rpc('add_ticket_update', {
        p_ticket_id: ticket.id,
        p_content: content,
        p_visibility: msgVisibility,
        p_message_type: msgType,
        p_status_id: newStatusId || null,
        p_queue_id: newQueueId || null,
        p_priority: newPriority || null,
        p_assigned_user_id: null,
        p_assigned_user_name: null,
      });
      if (error) throw error;
      toast({ title: `Atualização adicionada ao chamado ${ticket.ticket_number}.` });
      setMsgContent(''); setNewStatusId(''); setNewQueueId(''); setNewPriority('');
      await loadAuthenticated(ticket.id);
    } catch (e: any) {
      toast({ title: 'Erro ao enviar', description: e.message || 'Tente novamente', variant: 'destructive' });
    } finally {
      setSending(false);
    }
  };

  if (loading) return <div className="p-10 text-center text-muted-foreground">Carregando chamado...</div>;
  if (notFound || !ticket) return (
    <div className="min-h-screen flex items-center justify-center bg-background p-6">
      <Card className="max-w-md w-full"><CardContent className="pt-6 text-center space-y-3">
        <AlertTriangle className="h-10 w-10 mx-auto text-destructive" />
        <h2 className="text-lg font-semibold">Chamado não encontrado ou indisponível</h2>
        <p className="text-sm text-muted-foreground">Este chamado pode ter sido removido ou o link é inválido.</p>
        {!publicMode && <Button variant="outline" onClick={() => navigate('/chamados')}>Voltar</Button>}
      </CardContent></Card>
    </div>
  );

  const publicUrl = ticket.public_token
    ? `${window.location.origin}/chamado/publico/${ticket.public_token}`
    : `${window.location.origin}/chamados/${ticket.id}/publico`;
  const isAuthed = !!user && !publicMode;
  const slaCfg = sla[ticket.priority as string];
  const slaState = slaCfg ? computeSla(ticket.created_at, ticket.closed_at, slaCfg.resolution_minutes) : null;


  return (
    <PageTransition>
      <div className="container mx-auto py-6 px-4 max-w-5xl">
        {isAuthed && (
          <div className="flex items-center justify-between mb-4 no-print">
            <Button variant="ghost" size="sm" onClick={() => navigate('/chamados')}><ArrowLeft className="h-4 w-4 mr-1.5" />Voltar</Button>
            <div className="flex gap-2">
              {canEdit && !ticket.assigned_user_id && (
                <Button size="sm" onClick={assumeTicket} disabled={assigning} className="gradient-primary border-0">
                  <UserCheck className="h-3.5 w-3.5 mr-1.5" />{assigning ? 'Assumindo...' : 'Assumir chamado'}
                </Button>
              )}
              {canEdit && <Button variant="outline" size="sm" onClick={() => navigate(`/chamados/${ticket.id}/editar`)}><Pencil className="h-3.5 w-3.5 mr-1.5" />Editar</Button>}
              <Button variant="outline" size="sm" onClick={() => navigate(`/chamados/${ticket.id}/etiqueta`)}><Printer className="h-3.5 w-3.5 mr-1.5" />Etiqueta e QR</Button>
            </div>

          </div>
        )}

        {publicMode && (
          <div className="mb-4 rounded-lg border border-border/60 bg-muted/40 px-4 py-2.5 text-xs text-muted-foreground flex items-center gap-2">
            <Eye className="h-3.5 w-3.5" />
            <span>Consulta pública do chamado — esta página é somente para acompanhamento. Alterações exigem acesso autenticado.</span>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2 space-y-4">
            {/* Hero */}
            <Card className="shadow-card border-border/50 overflow-hidden">
              <div className="gradient-primary p-5 text-primary-foreground">
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-xl bg-white/15 backdrop-blur"><TicketIcon className="h-5 w-5" /></div>
                    <div>
                      <p className="text-[10px] uppercase tracking-widest opacity-80">Chamado Técnico</p>
                      <h1 className="text-2xl font-bold font-mono tracking-tight">{ticket.ticket_number}</h1>
                    </div>
                  </div>
                  <div className="flex gap-2 flex-wrap">
                    {status && <Badge variant="secondary" className="bg-white/20 text-white border-0 backdrop-blur" style={{ backgroundColor: status.color || undefined }}>{status.name}</Badge>}
                    <Badge variant="secondary" className={`${PRIORITY_COLORS[ticket.priority as TicketPriority]} border`}>{ticket.priority}</Badge>
                    {ticket.category && <Badge variant="secondary" className="bg-white/20 text-white border-0 backdrop-blur">{ticket.category}</Badge>}
                  </div>
                </div>
              </div>
              <CardContent className="pt-5 space-y-3">
                <div>
                  <h2 className="text-lg font-bold">{ticket.subject}</h2>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap mt-2 break-words">{ticket.description}</p>
                </div>
                {slaState && (
                  <div className={`rounded-lg border px-3 py-2 text-xs flex items-center gap-2 ${slaState.overdue ? 'border-destructive/40 bg-destructive/10 text-destructive' : 'border-border/60 bg-muted/40 text-muted-foreground'}`}>
                    <Timer className="h-3.5 w-3.5 shrink-0" />
                    <span>
                      {ticket.closed_at ? 'SLA no encerramento' : 'Prazo de solução'} · {slaState.dueAt.toLocaleString('pt-BR')} — <strong>{slaState.remainingLabel}</strong>
                    </span>
                    {slaState.overdue && <Badge variant="outline" className="ml-auto border-destructive/50 text-destructive text-[10px]">Atrasado</Badge>}
                  </div>
                )}
              </CardContent>

            </Card>

            {/* Tabs */}
            <Tabs defaultValue="geral">
              <TabsList className="flex-wrap h-auto">
                <TabsTrigger value="geral">Visão geral</TabsTrigger>
                <TabsTrigger value="conversas"><MessageSquare className="h-3.5 w-3.5 mr-1.5" />Conversas</TabsTrigger>
                {isAuthed && <TabsTrigger value="historico">Histórico</TabsTrigger>}
                {isAuthed && <TabsTrigger value="anexos">Anexos</TabsTrigger>}
              </TabsList>

              {/* Visão geral */}
              <TabsContent value="geral" className="mt-3">
                <Card className="shadow-card border-border/50"><CardContent className="pt-5 space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <InfoRow icon={Building} label="Seção / Cliente" value={ticket.client_section_name} />
                    <InfoRow icon={FolderTree} label="Categoria" value={ticket.category || '—'} />
                    <InfoRow icon={Tag} label="Placa" value={ticket.plate_name || <span className="italic text-muted-foreground">Sem placa cadastrada</span>} />
                    <InfoRow icon={Layers} label="Fila" value={queue?.name || '—'} />
                    <InfoRow icon={AlertTriangle} label="Prioridade" value={ticket.priority} />
                    <InfoRow icon={Clock} label="Aberto em" value={new Date(ticket.created_at).toLocaleString('pt-BR')} />
                    <InfoRow icon={Clock} label="Última atualização" value={ticket.updated_at ? new Date(ticket.updated_at).toLocaleString('pt-BR') : '—'} />
                    <InfoRow icon={Clock} label="Tempo em aberto" value={formatTicketAge(ticket.created_at, ticket.closed_at)} />
                    {ticket.closed_at && <InfoRow icon={Clock} label="Concluído em" value={new Date(ticket.closed_at).toLocaleString('pt-BR')} />}
                    {isAuthed && <InfoRow icon={User} label="Responsável" value={ticket.assigned_user_name || <span className="italic text-muted-foreground">Não atribuído</span>} />}
                    {isAuthed && ticket.created_by_name && <InfoRow icon={User} label="Aberto por" value={ticket.created_by_name} />}
                  </div>
                  {(ticket.equipment_patrimonio || equipmentPhoto) && (
                    <div className="pt-3 border-t border-border/40">
                      <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-2">Equipamento vinculado</p>
                      <div className="flex items-center gap-3">
                        <div className="w-24 h-24 rounded-lg overflow-hidden bg-muted flex-shrink-0 border border-border/50">
                          {equipmentPhoto ? (
                            <NotebookPhoto value={equipmentPhoto} className="w-full h-full object-cover" fallback={<div className="w-full h-full flex items-center justify-center text-muted-foreground"><ImageOff className="h-6 w-6" /></div>} />
                          ) : (
                            <div className="w-full h-full flex flex-col items-center justify-center gap-1 text-muted-foreground">
                              <ImageOff className="h-6 w-6" />
                              <span className="text-[9px]">Sem foto</span>
                            </div>
                          )}
                        </div>
                        <div className="min-w-0 space-y-0.5">
                          <p className="font-mono text-sm font-semibold">{ticket.equipment_patrimonio || '—'}</p>
                          <p className="text-xs text-muted-foreground capitalize">{ticket.equipment_type || 'Equipamento'}</p>
                          {equipmentInfo && <p className="text-xs text-foreground/80 truncate">{equipmentInfo.nome}</p>}
                          {equipmentInfo?.secao && <p className="text-[11px] text-muted-foreground">Seção: {equipmentInfo.secao}</p>}
                          {equipmentInfo?.status && <Badge variant="outline" className="text-[10px] mt-1">{equipmentInfo.status}</Badge>}
                        </div>
                      </div>
                    </div>
                  )}
                  {isAuthed && canEdit && (
                    <div className="pt-3 border-t border-border/40">
                      <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-2 flex items-center gap-1.5">
                        <ListChecks className="h-3.5 w-3.5" />Checklist de atendimento
                        {savingChecklist && <span className="normal-case tracking-normal text-[10px] italic">salvando...</span>}
                      </p>
                      <div className="space-y-2">
                        {CHECKLIST_ITEMS.map(item => (
                          <label key={item.key} className="flex items-center gap-2 text-sm cursor-pointer">
                            <Checkbox checked={!!checklist[item.key]} onCheckedChange={(v) => toggleChecklist(item.key, !!v)} />
                            <span className={checklist[item.key] ? 'line-through text-muted-foreground' : ''}>{item.label}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent></Card>

              </TabsContent>

              {/* Conversas */}
              <TabsContent value="conversas" className="mt-3 space-y-3">
                {isAuthed && canEdit && (
                  <Card className="shadow-card border-border/50">
                    <CardContent className="pt-5 space-y-3">
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <div className="text-sm font-semibold flex items-center gap-2"><Send className="h-4 w-4" /> Nova atualização</div>
                        <div className="flex gap-2">
                          <Select value={msgVisibility} onValueChange={(v) => setMsgVisibility(v as any)}>
                            <SelectTrigger className="h-8 w-[130px] text-xs"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="publica"><span className="inline-flex items-center gap-1.5"><Globe className="h-3 w-3" />Pública</span></SelectItem>
                              <SelectItem value="interna"><span className="inline-flex items-center gap-1.5"><Lock className="h-3 w-3" />Interna</span></SelectItem>
                            </SelectContent>
                          </Select>
                          <Select value={msgType} onValueChange={setMsgType}>
                            <SelectTrigger className="h-8 w-[180px] text-xs"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              {MESSAGE_TYPES.map(t => <SelectItem key={t} value={t}>{MESSAGE_TYPE_LABEL[t]}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <Textarea
                        placeholder="Descreva a atualização..."
                        value={msgContent}
                        onChange={(e) => setMsgContent(e.target.value.slice(0, 5000))}
                        rows={4}
                        maxLength={5000}
                      />
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                        <Select value={newStatusId} onValueChange={setNewStatusId}>
                          <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Alterar status (opcional)" /></SelectTrigger>
                          <SelectContent>
                            {statuses.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                          </SelectContent>
                        </Select>
                        <Select value={newQueueId} onValueChange={setNewQueueId}>
                          <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Alterar fila (opcional)" /></SelectTrigger>
                          <SelectContent>
                            {queues.map(q => <SelectItem key={q.id} value={q.id}>{q.name}</SelectItem>)}
                          </SelectContent>
                        </Select>
                        <Select value={newPriority} onValueChange={setNewPriority}>
                          <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Alterar prioridade (opcional)" /></SelectTrigger>
                          <SelectContent>
                            {(['Baixa','Normal','Alta','Urgente'] as TicketPriority[]).map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-[10px] text-muted-foreground">{msgContent.length}/5000</span>
                        <Button size="sm" onClick={submitMessage} disabled={sending || !msgContent.trim()} className="gradient-primary border-0">
                          {sending ? 'Enviando...' : (<><Send className="h-3.5 w-3.5 mr-1.5" />Enviar atualização</>)}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {isAuthed && (
                  <div className="flex items-center gap-1 text-xs">
                    <span className="text-muted-foreground mr-1">Filtrar:</span>
                    {(['todas','publica','interna'] as const).map(f => (
                      <button key={f} onClick={() => setMessagesFilter(f)} className={`px-2.5 py-1 rounded-md ${messagesFilter===f?'bg-primary text-primary-foreground':'bg-muted/50 text-muted-foreground hover:bg-muted'}`}>
                        {f === 'todas' ? 'Todas' : f === 'publica' ? 'Públicas' : 'Internas'}
                      </button>
                    ))}
                  </div>
                )}

                {/* Timeline */}
                <Card className="shadow-card border-border/50"><CardContent className="pt-5">
                  {publicMode ? (
                    publicMessages.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-6">Nenhuma atualização pública ainda.</p>
                    ) : (
                      <ul className="space-y-3">
                        {publicMessages.map((m, i) => (
                          <li key={i} className="border-l-2 border-primary/40 pl-3 py-1">
                            <div className="flex justify-between gap-2 items-start flex-wrap">
                              <div className="text-xs font-semibold">Equipe técnica <span className="text-muted-foreground font-normal">· {MESSAGE_TYPE_LABEL[m.message_type] || m.message_type}</span></div>
                              <span className="text-[10px] text-muted-foreground">{new Date(m.created_at).toLocaleString('pt-BR')}</span>
                            </div>
                            <p className="text-sm mt-1 whitespace-pre-wrap break-words">{m.content}</p>
                            {m.status_name && <div className="text-[10px] text-muted-foreground mt-1">Status: {m.status_name}</div>}
                          </li>
                        ))}
                      </ul>
                    )
                  ) : (
                    filteredMessages.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-6">Nenhuma mensagem registrada.</p>
                    ) : (
                      <ul className="space-y-3">
                        {filteredMessages.map(m => (
                          <li key={m.id} className={`border-l-2 pl-3 py-1 ${m.visibility==='interna'?'border-orange-500/60':'border-primary/40'}`}>
                            <div className="flex justify-between gap-2 items-start flex-wrap">
                              <div className="text-xs font-semibold flex items-center gap-1.5">
                                {m.author_name || 'Equipe técnica'}
                                <Badge variant="outline" className={`text-[9px] px-1.5 py-0 ${m.visibility==='interna'?'border-orange-500/50 text-orange-500':'border-emerald-500/50 text-emerald-500'}`}>
                                  {m.visibility==='interna' ? (<><Lock className="h-2.5 w-2.5 mr-0.5" />Interna</>) : (<><Globe className="h-2.5 w-2.5 mr-0.5" />Pública</>)}
                                </Badge>
                                <span className="text-muted-foreground font-normal">· {MESSAGE_TYPE_LABEL[m.message_type] || m.message_type}</span>
                              </div>
                              <span className="text-[10px] text-muted-foreground">{new Date(m.created_at).toLocaleString('pt-BR')}</span>
                            </div>
                            <p className="text-sm mt-1 whitespace-pre-wrap break-words">{m.content}</p>
                          </li>
                        ))}
                      </ul>
                    )
                  )}
                </CardContent></Card>
              </TabsContent>

              {/* Histórico */}
              {isAuthed && (
                <TabsContent value="historico" className="mt-3">
                  <Card className="shadow-card border-border/50"><CardContent className="pt-5">
                    <h3 className="text-sm font-semibold flex items-center gap-2 mb-3"><HistoryIcon className="h-4 w-4" /> Histórico ({history.length})</h3>
                    {history.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-6">Sem registros.</p>
                    ) : (
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
                    )}
                  </CardContent></Card>
                </TabsContent>
              )}

              {/* Anexos */}
              {isAuthed && (
                <TabsContent value="anexos" className="mt-3">
                  <Card className="shadow-card border-border/50"><CardContent className="pt-5">
                    <h3 className="text-sm font-semibold flex items-center gap-2 mb-3"><Paperclip className="h-4 w-4" /> Anexos ({attachments.length})</h3>
                    {attachments.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-6">Nenhum anexo.</p>
                    ) : (
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                        {attachments.map(a => <AttachmentThumb key={a.id} att={a} />)}
                      </div>
                    )}
                  </CardContent></Card>
                </TabsContent>
              )}
            </Tabs>
          </div>

          {/* QR sidebar */}
          <div>
            <Card className="shadow-card border-border/50 sticky top-4">
              <CardContent className="pt-5 text-center space-y-3">
                <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold">Consulta rápida</p>
                <div className="bg-white p-3 rounded-xl inline-block">
                  <QRCodeSVG value={publicUrl} size={180} level="M" />
                </div>
                <p className="text-[10px] text-muted-foreground">Escaneie para consultar</p>
                {publicMode && (
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
      <div className="flex items-center gap-1 flex-wrap p-1.5 border-t border-border/40 bg-muted/30">
        <Badge variant="outline" className="text-[9px] px-1 py-0">{ATTACHMENT_KIND_LABEL[att.kind || 'outro'] || 'Outro'}</Badge>
        <Badge variant="outline" className={`text-[9px] px-1 py-0 ${att.visibility === 'publica' ? 'text-success border-success/40' : 'text-muted-foreground'}`}>
          {att.visibility === 'publica' ? <Globe className="h-2.5 w-2.5 mr-0.5" /> : <Lock className="h-2.5 w-2.5 mr-0.5" />}
          {att.visibility === 'publica' ? 'Público' : 'Interno'}
        </Badge>
      </div>
    </a>
  );

}
