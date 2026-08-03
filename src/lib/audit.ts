import { supabase } from '@/integrations/supabase/client';

export type AuditEntry = {
  action: string;
  entityType: string;
  entityId?: string | null;
  entityLabel?: string | null;
  details?: Record<string, unknown>;
};

/**
 * Registro central de auditoria. Nunca lança erro para não quebrar a ação principal.
 */
export async function logAudit(entry: AuditEntry): Promise<void> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    let userName: string | null = user.email ?? null;
    const { data: profile } = await supabase
      .from('profiles')
      .select('display_name')
      .eq('user_id', user.id)
      .maybeSingle();
    if (profile?.display_name) userName = profile.display_name;

    await (supabase as any).from('audit_log').insert({
      user_id: user.id,
      user_name: userName,
      action: entry.action,
      entity_type: entry.entityType,
      entity_id: entry.entityId ?? null,
      entity_label: entry.entityLabel ?? null,
      details: entry.details ?? {},
    });
  } catch {
    // auditoria é best-effort
  }
}
