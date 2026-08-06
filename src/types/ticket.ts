export type TicketQueue = {
  id: string;
  name: string;
  description: string | null;
  active: boolean;
  display_order: number;
  created_at: string;
  updated_at: string;
};

export type TicketStatus = {
  id: string;
  name: string;
  color: string | null;
  active: boolean;
  display_order: number;
  is_closed: boolean;
  created_at: string;
  updated_at: string;
};

export type TicketPriority = 'Baixa' | 'Normal' | 'Alta' | 'Urgente';

export const TICKET_CATEGORIES = [
  'Rede',
  'Impressora',
  'Notebook',
  'Sistema',
  'E-mail',
  'Conta de usuário',
  'Manutenção preventiva',
  'Outros',
] as const;

export type TicketChecklist = Record<string, boolean>;

export const CHECKLIST_ITEMS: { key: string; label: string }[] = [
  { key: 'equipamento_verificado', label: 'Equipamento verificado' },
  { key: 'usuario_orientado', label: 'Usuário orientado' },
  { key: 'solucao_aplicada', label: 'Solução aplicada' },
  { key: 'teste_final', label: 'Teste final realizado' },
  { key: 'chamado_validado', label: 'Chamado validado' },
];

export type TicketSla = {
  id: string;
  priority: string;
  queue_id?: string | null;
  response_minutes: number;
  resolution_minutes: number;
};

export type SlaState = {
  dueAt: Date;
  overdue: boolean;
  remainingLabel: string;
  percent: number;
};

export function computeSla(
  createdAt: string,
  closedAt: string | null | undefined,
  resolutionMinutes: number,
): SlaState {
  const start = new Date(createdAt).getTime();
  const due = start + resolutionMinutes * 60 * 1000;
  const ref = closedAt ? new Date(closedAt).getTime() : Date.now();
  const overdue = ref > due;
  const diff = Math.abs(due - ref);
  const days = Math.floor(diff / 86400000);
  const hours = Math.floor((diff % 86400000) / 3600000);
  const minutes = Math.floor((diff % 3600000) / 60000);
  const parts = days > 0 ? `${days} d ${hours} h` : hours > 0 ? `${hours} h ${minutes} min` : `${minutes} min`;
  const percent = Math.min(100, Math.max(0, ((ref - start) / (due - start)) * 100));
  return {
    dueAt: new Date(due),
    overdue,
    remainingLabel: overdue ? `${parts} em atraso` : `${parts} restantes`,
    percent,
  };
}

export type Ticket = {
  id: string;
  ticket_number: string;
  public_token?: string | null;
  client_section_id: string | null;
  client_section_name: string;
  equipment_type: string | null;
  equipment_id: string | null;
  equipment_patrimonio: string | null;
  plate_name: string | null;
  subject: string;
  description: string;
  public_summary?: string | null;
  category?: string | null;
  checklist?: TicketChecklist | null;
  first_response_at?: string | null;
  queue_id: string | null;
  priority: TicketPriority;
  status_id: string | null;
  assigned_user_id: string | null;
  assigned_user_name: string | null;
  created_by: string | null;
  created_by_name: string | null;
  created_at: string;
  updated_at: string;
  closed_at: string | null;
  deleted_at: string | null;
};


export type TicketMessage = {
  id: string;
  ticket_id: string;
  author_id: string | null;
  author_name: string | null;
  message_type: string;
  content: string;
  visibility: 'publica' | 'interna';
  status_id_snapshot: string | null;
  queue_id_snapshot: string | null;
  assigned_user_id_snapshot: string | null;
  created_at: string;
  updated_at: string;
};

export const MESSAGE_TYPES = [
  'atualizacao',
  'atendimento',
  'solicitacao_informacao',
  'resposta_solicitante',
  'material_solicitado',
  'material_recebido',
  'alteracao_status',
  'observacao_interna',
  'conclusao',
  'reabertura',
] as const;

export const MESSAGE_TYPE_LABEL: Record<string, string> = {
  atualizacao: 'Atualização',
  atendimento: 'Atendimento técnico',
  solicitacao_informacao: 'Solicitação de informação',
  resposta_solicitante: 'Resposta do solicitante',
  material_solicitado: 'Material solicitado',
  material_recebido: 'Material recebido',
  alteracao_status: 'Alteração de status',
  observacao_interna: 'Observação interna',
  conclusao: 'Conclusão',
  reabertura: 'Reabertura',
};


export type TicketHistory = {
  id: string;
  ticket_id: string;
  user_id: string | null;
  user_name: string | null;
  action: string;
  old_value: string | null;
  new_value: string | null;
  description: string | null;
  created_at: string;
};

export type TicketAttachment = {
  id: string;
  ticket_id: string;
  file_name: string;
  file_path: string;
  file_type: string | null;
  file_size: number | null;
  uploaded_by: string | null;
  visibility?: 'publica' | 'interna';
  kind?: 'foto_problema' | 'foto_equipamento' | 'documento' | 'cautela' | 'outro';
  created_at: string;
};

export const ATTACHMENT_KINDS = ['foto_problema', 'foto_equipamento', 'documento', 'cautela', 'outro'] as const;

export const ATTACHMENT_KIND_LABEL: Record<string, string> = {
  foto_problema: 'Foto do problema',
  foto_equipamento: 'Foto do equipamento',
  documento: 'Documento',
  cautela: 'Cautela',
  outro: 'Outro',
};

export type PublicAttachment = {
  id: string;
  file_name: string;
  file_type: string | null;
  kind: string | null;
  created_at: string;
  url: string | null;
};


export const PRIORITY_COLORS: Record<TicketPriority, string> = {
  Baixa: 'bg-slate-500/15 text-slate-500 border-slate-500/30',
  Normal: 'bg-blue-500/15 text-blue-500 border-blue-500/30',
  Alta: 'bg-orange-500/15 text-orange-500 border-orange-500/30',
  Urgente: 'bg-red-500/15 text-red-500 border-red-500/30',
};

export function formatTicketAge(createdAt: string, closedAt?: string | null): string {
  const start = new Date(createdAt).getTime();
  const end = closedAt ? new Date(closedAt).getTime() : Date.now();
  const diff = Math.max(0, end - start);
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  if (days > 0) return `${days} d ${hours} h`;
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  return `${hours} h ${minutes} min`;
}
