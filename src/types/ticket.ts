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

export type Ticket = {
  id: string;
  ticket_number: string;
  client_section_id: string | null;
  client_section_name: string;
  equipment_type: string | null;
  equipment_id: string | null;
  equipment_patrimonio: string | null;
  plate_name: string | null;
  subject: string;
  description: string;
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
  created_at: string;
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
