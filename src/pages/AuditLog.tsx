import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollText, Search } from 'lucide-react';
import PageTransition from '@/components/PageTransition';
import PageHeader from '@/components/PageHeader';
import { useUserRole } from '@/hooks/useUserRole';

type AuditRow = {
  id: string;
  user_name: string | null;
  action: string;
  entity_type: string;
  entity_label: string | null;
  details: Record<string, unknown> | null;
  created_at: string;
};

export default function AuditLog() {
  const { isAdmin, loading: roleLoading } = useUserRole();
  const [rows, setRows] = useState<AuditRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (roleLoading || !isAdmin) return;
    (supabase as any)
      .from('audit_log')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(300)
      .then(({ data }: { data: AuditRow[] | null }) => {
        setRows(data || []);
        setLoading(false);
      });
  }, [isAdmin, roleLoading]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter(r =>
      [r.action, r.entity_type, r.entity_label, r.user_name].some(v => (v || '').toLowerCase().includes(q))
    );
  }, [rows, search]);

  if (!roleLoading && !isAdmin) {
    return (
      <PageTransition>
        <div className="container mx-auto py-10 px-4 text-center">
          <h2 className="text-lg font-semibold">Auditoria</h2>
          <p className="text-muted-foreground">Acesso restrito a administradores.</p>
        </div>
      </PageTransition>
    );
  }

  return (
    <PageTransition>
      <div className="container mx-auto py-6 px-4 max-w-[1200px]">
        <PageHeader
          icon={ScrollText}
          title="Auditoria"
          description="Registro central das ações importantes do sistema"
        />

        <div className="relative mb-4 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            className="pl-9 h-10 bg-muted/30 border-border/60"
            placeholder="Buscar por ação, entidade ou usuário"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        {loading ? (
          <div className="space-y-2">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}</div>
        ) : filtered.length === 0 ? (
          <Card className="border-border/60"><CardContent className="py-12 text-center text-sm text-muted-foreground">Nenhum registro de auditoria.</CardContent></Card>
        ) : (
          <div className="space-y-2">
            {filtered.map(r => (
              <Card key={r.id} className="border-border/60 shadow-card">
                <CardContent className="py-3 flex flex-wrap items-center gap-3">
                  <Badge variant="outline" className="font-mono text-[10px]">{r.action}</Badge>
                  <span className="text-sm font-medium">{r.entity_type}{r.entity_label ? ` · ${r.entity_label}` : ''}</span>
                  <span className="text-xs text-muted-foreground ml-auto">
                    {r.user_name || 'Sistema'} · {new Date(r.created_at).toLocaleString('pt-BR')}
                  </span>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </PageTransition>
  );
}
