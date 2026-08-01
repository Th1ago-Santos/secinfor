import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { TicketQueue, TicketStatus, TicketSla } from '@/types/ticket';

export function useTicketSla() {
  const [sla, setSla] = useState<Record<string, TicketSla>>({});
  const [loading, setLoading] = useState(true);

  const refetch = useCallback(async () => {
    setLoading(true);
    const { data } = await (supabase as any).from('ticket_sla').select('*');
    const map: Record<string, TicketSla> = {};
    ((data as TicketSla[]) || []).forEach(s => { map[s.priority] = s; });
    setSla(map);
    setLoading(false);
  }, []);

  useEffect(() => { refetch(); }, [refetch]);
  return { sla, loading, refetch };
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
