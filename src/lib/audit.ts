import { supabase } from '@/integrations/supabase/client';

export type AuditSeverity = 'baixo' | 'medio' | 'alto';

export type AuditEventType =
  | 'chamado' | 'mensagem' | 'anexo' | 'inventario'
  | 'equipamento' | 'material' | 'usuario' | 'seguranca' | 'sistema';

export type AuditEntry = {
  action: string;
  entityType: string;
  entityId?: string | null;
  entityLabel?: string | null;
  eventType?: AuditEventType;
  severity?: AuditSeverity;
  oldValue?: string | null;
  newValue?: string | null;
  details?: Record<string, unknown>;
};

/**
 * Registro central de auditoria via RPC SECURITY DEFINER.
 * O autor é sempre o usuário autenticado — o frontend não consegue forjar.
 * Nunca lança erro para não quebrar a ação principal.
 */
export async function logAudit(entry: AuditEntry): Promise<void> {
  try {
    await (supabase as any).rpc('log_audit_event', {
      p_action: entry.action,
      p_entity_type: entry.entityType,
      p_entity_id: entry.entityId ?? null,
      p_entity_label: entry.entityLabel ?? null,
      p_event_type: entry.eventType ?? 'sistema',
      p_severity: entry.severity ?? 'baixo',
      p_old_value: entry.oldValue ?? null,
      p_new_value: entry.newValue ?? null,
      p_details: entry.details ?? {},
    });
  } catch {
    // auditoria é best-effort
  }
}
