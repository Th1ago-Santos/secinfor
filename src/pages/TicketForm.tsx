import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { toast } from 'sonner';
import { Ticket as TicketIcon, Save, X, Upload, FileText, Image as ImageIcon, ChevronsUpDown, Check } from 'lucide-react';
import PageTransition from '@/components/PageTransition';
import PageHeader from '@/components/PageHeader';
import { useSections } from '@/hooks/useSections';
import { useTicketQueues, useTicketStatuses } from '@/hooks/useTicketMeta';
import { useAuth } from '@/hooks/useAuth';
import { useUserRole } from '@/hooks/useUserRole';
import { cn } from '@/lib/utils';
import { z } from 'zod';

const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25MB
const ALLOWED_TYPES = /^(image\/(jpeg|jpg|png|webp|heic|heif)|application\/pdf|application\/msword|application\/vnd\.openxmlformats-officedocument\.|text\/plain)/;

const ticketSchema = z.object({
  client_section_id: z.string().uuid('Selecione uma seção'),
  plate_name: z.string().max(120).optional(),
  subject: z.string().trim().min(1, 'Informe o assunto').max(200),
  description: z.string().trim().min(1, 'Informe a descrição').max(5000),
  queue_id: z.string().uuid('Selecione uma fila'),
  priority: z.enum(['Baixa', 'Normal', 'Alta', 'Urgente']),
  equipment_id: z.string().optional().nullable(),
});

type EquipmentOption = {
  id: string;
  type: 'notebook' | 'material';
  patrimonio: string;
  label: string;
};

export default function TicketForm() {
  const { id } = useParams<{ id: string }>();
  const isEditing = !!id;
  const navigate = useNavigate();
  const { user } = useAuth();
  const { canEdit, loading: roleLoading } = useUserRole();
  const { sections } = useSections();
  const { queues } = useTicketQueues();
  const { statuses } = useTicketStatuses();

  const [loading, setLoading] = useState(isEditing);
  const [saving, setSaving] = useState(false);
  const [sectionOpen, setSectionOpen] = useState(false);
  const [equipmentOpen, setEquipmentOpen] = useState(false);
  const [equipments, setEquipments] = useState<EquipmentOption[]>([]);

  const [form, setForm] = useState({
    client_section_id: '',
    client_section_name: '',
    plate_name: '',
    subject: '',
    description: '',
    category: '',
    queue_id: '',
    priority: 'Normal' as 'Baixa' | 'Normal' | 'Alta' | 'Urgente',
    status_id: '',
    equipment_id: '',
    equipment_type: '',
    equipment_patrimonio: '',
  });

  const [files, setFiles] = useState<File[]>([]);
  const [attVisibility, setAttVisibility] = useState<'publica' | 'interna'>('interna');
  const [attKind, setAttKind] = useState<'foto_problema' | 'foto_equipamento' | 'documento' | 'outro'>('foto_problema');


  useEffect(() => {
    if (!roleLoading && !canEdit) navigate('/chamados');
  }, [roleLoading, canEdit, navigate]);

  // Load equipments (notebooks + materials) once
  useEffect(() => {
    (async () => {
      const [{ data: nbs }, { data: mats }] = await Promise.all([
        supabase.from('notebooks').select('id,patrimonio,modelo').order('patrimonio'),
        supabase.from('materials').select('id,patrimonio,nome').order('patrimonio'),
      ]);
      const opts: EquipmentOption[] = [
        ...((nbs || []) as any[]).map(n => ({ id: n.id, type: 'notebook' as const, patrimonio: n.patrimonio, label: `Notebook ${n.patrimonio} – ${n.modelo || ''}` })),
        ...((mats || []) as any[]).map(m => ({ id: m.id, type: 'material' as const, patrimonio: m.patrimonio, label: `Material ${m.patrimonio} – ${m.nome || ''}` })),
      ];
      setEquipments(opts);
    })();
  }, []);

  useEffect(() => {
    if (!isEditing) {
      // Set default status to "Aberto"
      const openStatus = statuses.find(s => s.name === 'Aberto');
      if (openStatus && !form.status_id) setForm(f => ({ ...f, status_id: openStatus.id }));
    }
  }, [statuses, isEditing]);

  useEffect(() => {
    if (!isEditing || !id) return;
    (async () => {
      const { data } = await (supabase as any).from('tickets').select('*').eq('id', id).maybeSingle();
      if (data) {
        setForm({
          client_section_id: data.client_section_id || '',
          client_section_name: data.client_section_name || '',
          plate_name: data.plate_name || '',
          subject: data.subject || '',
          description: data.description || '',
          category: data.category || '',

          queue_id: data.queue_id || '',
          priority: data.priority || 'Normal',
          status_id: data.status_id || '',
          equipment_id: data.equipment_id || '',
          equipment_type: data.equipment_type || '',
          equipment_patrimonio: data.equipment_patrimonio || '',
        });
      }
      setLoading(false);
    })();
  }, [id, isEditing]);

  const handleEquipmentSelect = (eq: EquipmentOption | null) => {
    if (!eq) {
      setForm(f => ({ ...f, equipment_id: '', equipment_type: '', equipment_patrimonio: '' }));
    } else {
      setForm(f => ({ ...f, equipment_id: eq.id, equipment_type: eq.type, equipment_patrimonio: eq.patrimonio }));
    }
    setEquipmentOpen(false);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const list = Array.from(e.target.files || []);
    const valid: File[] = [];
    for (const f of list) {
      if (f.size > MAX_FILE_SIZE) { toast.error(`${f.name}: excede 25MB`); continue; }
      if (!ALLOWED_TYPES.test(f.type)) { toast.error(`${f.name}: tipo não permitido`); continue; }
      valid.push(f);
    }
    setFiles(prev => [...prev, ...valid]);
    e.target.value = '';
  };

  const removeFile = (idx: number) => setFiles(f => f.filter((_, i) => i !== idx));

  const handleSubmit = async () => {
    const parsed = ticketSchema.safeParse({
      client_section_id: form.client_section_id,
      plate_name: form.plate_name || undefined,
      subject: form.subject,
      description: form.description,
      queue_id: form.queue_id,
      priority: form.priority,
      equipment_id: form.equipment_id || null,
    });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0].message);
      return;
    }
    setSaving(true);

    const payload: any = {
      client_section_id: form.client_section_id,
      client_section_name: form.client_section_name,
      plate_name: form.plate_name?.trim() || null,
      subject: form.subject.trim(),
      description: form.description.trim(),
      category: form.category || null,

      queue_id: form.queue_id,
      priority: form.priority,
      status_id: form.status_id || null,
      equipment_id: form.equipment_id || null,
      equipment_type: form.equipment_type || null,
      equipment_patrimonio: form.equipment_patrimonio || null,
    };

    let ticketId = id;
    if (isEditing) {
      const { error } = await (supabase as any).from('tickets').update(payload).eq('id', id);
      if (error) { toast.error('Erro ao salvar chamado.'); setSaving(false); return; }
      await (supabase as any).from('ticket_history').insert({
        ticket_id: id, user_id: user?.id, user_name: user?.email, action: 'Atualização', description: 'Chamado atualizado',
      });
      toast.success('Chamado atualizado!');
    } else {
      payload.created_by = user?.id;
      payload.created_by_name = user?.email;
      const { data, error } = await (supabase as any).from('tickets').insert(payload).select('id, ticket_number').single();
      if (error || !data) { toast.error('Erro ao criar chamado.'); setSaving(false); return; }
      ticketId = data.id;
      await (supabase as any).from('ticket_history').insert({
        ticket_id: data.id, user_id: user?.id, user_name: user?.email, action: 'Abertura',
        description: `Chamado ${data.ticket_number} criado`,
      });
      toast.success(`Chamado ${data.ticket_number} criado!`);
    }

    // Upload attachments
    if (ticketId && files.length > 0) {
      for (const f of files) {
        const safeName = f.name.replace(/[^a-zA-Z0-9._-]/g, '_');
        const path = `${ticketId}/${Date.now()}_${safeName}`;
        const { error: upErr } = await supabase.storage.from('ticket-attachments').upload(path, f);
        if (upErr) { toast.error(`Falha ao enviar ${f.name}`); continue; }
        await (supabase as any).from('ticket_attachments').insert({
          ticket_id: ticketId, file_name: f.name, file_path: path, file_type: f.type, file_size: f.size, uploaded_by: user?.id,
          visibility: attVisibility, kind: attKind,
        });

      }
    }

    setSaving(false);
    navigate('/chamados');
  };

  if (loading) {
    return <div className="p-8 text-center text-muted-foreground">Carregando...</div>;
  }

  return (
    <PageTransition>
      <div className="container mx-auto py-6 px-4 max-w-3xl">
        <PageHeader
          icon={TicketIcon}
          title={isEditing ? 'Editar Chamado' : 'Abrir Chamado'}
          description={isEditing ? 'Atualize as informações do chamado' : 'Preencha os dados para gerar um novo chamado'}
          actions={<Button variant="outline" size="sm" onClick={() => navigate('/chamados')}><X className="h-4 w-4 mr-1.5" />Cancelar</Button>}
        />

        <Card className="shadow-card border-border/50">
          <CardContent className="pt-6 space-y-5">
            {/* Seção */}
            <div className="space-y-1.5">
              <Label className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">Seção / Cliente <span className="text-destructive">*</span></Label>
              <Popover open={sectionOpen} onOpenChange={setSectionOpen}>
                <PopoverTrigger asChild>
                  <Button variant="outline" role="combobox" className="w-full justify-between h-10 font-normal">
                    {form.client_section_name || 'Selecione a seção...'}
                    <ChevronsUpDown className="h-4 w-4 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                  <Command>
                    <CommandInput placeholder="Buscar seção..." />
                    <CommandList>
                      <CommandEmpty>Nenhuma seção encontrada.</CommandEmpty>
                      <CommandGroup>
                        {sections.map(s => (
                          <CommandItem key={s.id} value={s.name} onSelect={() => { setForm(f => ({ ...f, client_section_id: s.id, client_section_name: s.name })); setSectionOpen(false); }}>
                            <Check className={cn('mr-2 h-4 w-4', form.client_section_id === s.id ? 'opacity-100' : 'opacity-0')} />
                            {s.name}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>

            {/* Nome da placa */}
            <div className="space-y-1.5">
              <Label className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">Nome da Placa</Label>
              <Input value={form.plate_name} onChange={(e) => setForm(f => ({ ...f, plate_name: e.target.value }))} placeholder="Ex: Placa 18 – Sgt TRNP (opcional)" className="h-10" maxLength={120} />
              <p className="text-[10px] text-muted-foreground">Deixe em branco se o equipamento ainda não possuir placa.</p>
            </div>

            {/* Equipamento */}
            <div className="space-y-1.5">
              <Label className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">Equipamento Vinculado</Label>
              <Popover open={equipmentOpen} onOpenChange={setEquipmentOpen}>
                <PopoverTrigger asChild>
                  <Button variant="outline" role="combobox" className="w-full justify-between h-10 font-normal">
                    {form.equipment_id ? equipments.find(e => e.id === form.equipment_id)?.label || form.equipment_patrimonio : 'Sem equipamento (opcional)'}
                    <ChevronsUpDown className="h-4 w-4 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                  <Command>
                    <CommandInput placeholder="Buscar por patrimônio ou modelo..." />
                    <CommandList>
                      <CommandEmpty>Nenhum equipamento encontrado.</CommandEmpty>
                      <CommandGroup>
                        <CommandItem onSelect={() => handleEquipmentSelect(null)}>
                          <Check className={cn('mr-2 h-4 w-4', !form.equipment_id ? 'opacity-100' : 'opacity-0')} />
                          <span className="italic text-muted-foreground">Sem equipamento vinculado</span>
                        </CommandItem>
                        {equipments.map(eq => (
                          <CommandItem key={eq.id} value={eq.label} onSelect={() => handleEquipmentSelect(eq)}>
                            <Check className={cn('mr-2 h-4 w-4', form.equipment_id === eq.id ? 'opacity-100' : 'opacity-0')} />
                            {eq.label}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>

            {/* Assunto */}
            <div className="space-y-1.5">
              <Label className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">Assunto / Título <span className="text-destructive">*</span></Label>
              <Input value={form.subject} onChange={(e) => setForm(f => ({ ...f, subject: e.target.value }))} placeholder="Ex: Notebook não liga" className="h-10" maxLength={200} />
            </div>

            {/* Descrição */}
            <div className="space-y-1.5">
              <Label className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">Descrição do Problema <span className="text-destructive">*</span></Label>
              <Textarea value={form.description} onChange={(e) => setForm(f => ({ ...f, description: e.target.value }))} rows={6} placeholder="Descreva o problema detalhadamente..." maxLength={5000} />
              <p className="text-[10px] text-muted-foreground">{form.description.length}/5000</p>
            </div>

            {/* Fila, Prioridade, Status */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">Fila <span className="text-destructive">*</span></Label>
                <Select value={form.queue_id} onValueChange={(v) => setForm(f => ({ ...f, queue_id: v }))}>
                  <SelectTrigger className="h-10"><SelectValue placeholder="Selecione..." /></SelectTrigger>
                  <SelectContent>
                    {queues.filter(q => q.active).map(q => <SelectItem key={q.id} value={q.id}>{q.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">Prioridade <span className="text-destructive">*</span></Label>
                <Select value={form.priority} onValueChange={(v) => setForm(f => ({ ...f, priority: v as any }))}>
                  <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Baixa">Baixa</SelectItem>
                    <SelectItem value="Normal">Normal</SelectItem>
                    <SelectItem value="Alta">Alta</SelectItem>
                    <SelectItem value="Urgente">Urgente</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">Status</Label>
                <Select value={form.status_id} onValueChange={(v) => setForm(f => ({ ...f, status_id: v }))}>
                  <SelectTrigger className="h-10"><SelectValue placeholder="Selecione..." /></SelectTrigger>
                  <SelectContent>
                    {statuses.filter(s => s.active).map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Anexos */}
            <div className="space-y-1.5">
              <Label className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">Anexos</Label>
              <div className="flex items-center gap-2">
                <label className="cursor-pointer">
                  <input type="file" multiple onChange={handleFileChange} className="hidden" accept="image/*,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.*,text/*" />
                  <span className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-border/60 hover:bg-muted/40 text-xs font-medium">
                    <Upload className="h-3.5 w-3.5" /> Adicionar arquivo
                  </span>
                </label>
                <span className="text-[10px] text-muted-foreground">Imagens, PDFs e documentos até 25MB.</span>
              </div>
              {files.length > 0 && (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mt-2">
                  {files.map((f, idx) => {
                    const isImg = f.type.startsWith('image/');
                    const url = isImg ? URL.createObjectURL(f) : null;
                    return (
                      <div key={idx} className="relative border border-border/60 rounded-lg overflow-hidden bg-muted/20">
                        {isImg && url ? (
                          <img src={url} alt={f.name} className="w-full h-24 object-cover" />
                        ) : (
                          <div className="flex flex-col items-center justify-center h-24 text-muted-foreground gap-1">
                            <FileText className="h-6 w-6" /><span className="text-[10px] px-2 text-center truncate max-w-full">{f.name}</span>
                          </div>
                        )}
                        <button type="button" onClick={() => removeFile(idx)} className="absolute top-1 right-1 bg-destructive/90 text-destructive-foreground rounded-full p-1 hover:bg-destructive">
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-border/40">
              <Button variant="outline" onClick={() => navigate('/chamados')} disabled={saving}>Cancelar</Button>
              <Button onClick={handleSubmit} disabled={saving} className="gradient-primary border-0 shadow-glow">
                <Save className="h-4 w-4 mr-1.5" />
                {saving ? 'Salvando...' : (isEditing ? 'Salvar alterações' : 'Abrir chamado')}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </PageTransition>
  );
}
