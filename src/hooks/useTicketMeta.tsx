import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { TicketQueue, TicketStatus, TicketSla } from '@/types/ticket';

export function useTicketSla() {
  const [sla, setSla] = useState<Record<string, TicketSla>>({});
  const [rules, setRules] = useState<TicketSla[]>([]);
  const [loading, setLoading] = useState(true);

  const refetch = useCallback(async () => {
    setLoading(true);
    const { data } = await (supabase as any).from('ticket_sla').select('*');
    const list = (data as TicketSla[]) || [];
    const map: Record<string, TicketSla> = {};
    // regras globais definem o padrão por prioridade
    list.filter(s => !s.queue_id).forEach(s => { map[s.priority] = s; });
    list.filter(s => s.queue_id && !map[s.priority]).forEach(s => { map[s.priority] = s; });
    setRules(list);
    setSla(map);
    setLoading(false);
  }, []);

  // Regra efetiva: fila específica tem precedência sobre a global
  const slaFor = useCallback((priority: string, queueId?: string | null) => {
    return rules.find(r => r.priority === priority && r.queue_id === queueId)
      || rules.find(r => r.priority === priority && !r.queue_id)
      || null;
  }, [rules]);

  useEffect(() => { refetch(); }, [refetch]);
  return { sla, rules, slaFor, loading, refetch };
}


export function useTicketQueues() {
  const [queues, setQueues] = useState<TicketQueue[]>([]);
  const [loading, setLoading] = useState(true);

  const refetch = useCallback(async () => {
    setLoading(true);
    const { data } = await (supabase as any).from('ticket_queues').select('*').order('display_order');
    setQueues((data as TicketQueue[]) || []);
    setLoading(false);
  }, []);

  useEffect(() => { refetch(); }, [refetch]);
  return { queues, loading, refetch };
}

export function useTicketStatuses() {
  const [statuses, setStatuses] = useState<TicketStatus[]>([]);
  const [loading, setLoading] = useState(true);

  const refetch = useCallback(async () => {
    setLoading(true);
    const { data } = await (supabase as any).from('ticket_statuses').select('*').order('display_order');
    setStatuses((data as TicketStatus[]) || []);
    setLoading(false);
  }, []);

  useEffect(() => { refetch(); }, [refetch]);
  return { statuses, loading, refetch };
}
