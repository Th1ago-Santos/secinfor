import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface Section {
  id: string;
  name: string;
  created_at: string;
}

export function useSections() {
  const [sections, setSections] = useState<Section[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchSections = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('sections')
      .select('*')
      .order('name');
    setSections((data as Section[]) || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchSections();
  }, []);

  return { sections, loading, refetch: fetchSections };
}
