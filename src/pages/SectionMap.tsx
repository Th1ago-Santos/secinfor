import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Map, Laptop, Wrench, Archive, Eye, ArrowRightLeft } from 'lucide-react';
import PageTransition from '@/components/PageTransition';
import PageHeader from '@/components/PageHeader';

type SectionData = {
  name: string;
  notebooks: number;
  
  emManutencao: number;
  baixados: number;
  emUso: number;
  emEstoque: number;
  alertas: number;
  recentMovs: number;
};

export default function SectionMap() {
  const navigate = useNavigate();
  const [sectionsData, setSectionsData] = useState<SectionData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    setLoading(true);
    const [
      { data: sections },
      { data: allNbs },
      { data: alertsData },
    ] = await Promise.all([
      supabase.from('sections').select('name').order('name'),
      supabase.from('notebooks').select('secao, status'),
      supabase.from('alerts').select('secao').eq('status', 'ativo'),
    ]);

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const { data: recentMovs } = await supabase.from('movements').select('secao_destino').gte('data_hora', thirtyDaysAgo.toISOString());

    const result: SectionData[] = (sections as any[] || []).map(s => {
      const sNbs = (allNbs as any[] || []).filter(n => n.secao === s.name);
      return {
        name: s.name,
        notebooks: sNbs.length,
        emManutencao: sNbs.filter(n => n.status === 'Em manutenção').length,
        baixados: sNbs.filter(n => n.status === 'Baixado').length,
        emUso: sNbs.filter(n => n.status === 'Em uso').length,
        emEstoque: sNbs.filter(n => n.status === 'Em estoque').length,
        alertas: (alertsData as any[] || []).filter(a => a.secao === s.name).length,
        recentMovs: (recentMovs as any[] || []).filter(m => m.secao_destino === s.name).length,
      };
    });

    setSectionsData(result.sort((a, b) => b.notebooks - a.notebooks));
    setLoading(false);
  };

  return (
    <PageTransition>
      <div className="container mx-auto py-6 px-4">
        <PageHeader
          icon={Map}
          title="Mapa das Seções"
          description="Distribuição de itens por seção"
        />

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {[...Array(8)].map((_, i) => <Skeleton key={i} className="h-52 rounded-xl" />)}
          </div>
        ) : sectionsData.length === 0 ? (
          <div className="text-center py-20 text-muted-foreground">
            <div className="mx-auto w-16 h-16 rounded-2xl bg-muted/60 flex items-center justify-center mb-4">
              <Map className="h-7 w-7 text-muted-foreground/30" />
            </div>
            <p className="text-base font-semibold">Nenhuma seção cadastrada</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {sectionsData.map((sec, idx) => (
              <Card
                key={sec.name}
                className={`kpi-card group border-border/50 ${sec.emManutencao > 0 ? 'hover:border-warning/40' : ''} ${sec.alertas > 0 ? 'hover:border-destructive/40' : 'hover:border-primary/30'}`}
                style={{ animationDelay: `${idx * 40}ms` }}
              >
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-bold flex items-center justify-between">
                    <span className="truncate">{sec.name}</span>
                    {sec.alertas > 0 && <Badge variant="destructive" className="text-[9px] px-1.5">{sec.alertas}</Badge>}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {(filterTipo === 'all' || filterTipo === 'notebooks') && (
                    <div className="grid grid-cols-2 gap-2">
                      <StatItem icon={Laptop} value={sec.notebooks} label="notebooks" colorClass="text-primary bg-primary/10" />
                      <StatItem icon={Wrench} value={sec.emManutencao} label="manut." colorClass="text-warning bg-warning/10" />
                      <StatItem icon={Archive} value={sec.baixados} label="baixados" colorClass="text-destructive bg-destructive/10" />
                      <StatItem icon={ArrowRightLeft} value={sec.recentMovs} label="movs (30d)" colorClass="text-muted-foreground bg-muted" />
                    </div>
                  )}

                  {sec.notebooks > 0 && (filterTipo === 'all' || filterTipo === 'notebooks') && (
                    <div className="flex h-1.5 rounded-full overflow-hidden bg-muted/50">
                      {sec.emUso > 0 && <div className="bg-success transition-all duration-300" style={{ width: `${(sec.emUso / sec.notebooks) * 100}%` }} />}
                      {sec.emManutencao > 0 && <div className="bg-warning transition-all duration-300" style={{ width: `${(sec.emManutencao / sec.notebooks) * 100}%` }} />}
                      {sec.baixados > 0 && <div className="bg-destructive transition-all duration-300" style={{ width: `${(sec.baixados / sec.notebooks) * 100}%` }} />}
                      {sec.emEstoque > 0 && <div className="bg-primary transition-all duration-300" style={{ width: `${(sec.emEstoque / sec.notebooks) * 100}%` }} />}
                    </div>
                  )}

                  <Button variant="outline" size="sm" className="w-full transition-all duration-200 hover:bg-primary/5 hover:border-primary/30" onClick={() => navigate(`/notebooks?secao=${encodeURIComponent(sec.name)}`)}>
                    <Eye className="h-3.5 w-3.5 mr-1.5" />
                    Ver itens
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </PageTransition>
  );
}

function StatItem({ icon: Icon, value, label, colorClass }: { icon: React.ElementType; value: number; label: string; colorClass: string }) {
  return (
    <div className="flex items-center gap-2">
      <div className={`p-1.5 rounded-md ${colorClass} transition-transform duration-200 group-hover:scale-105`}>
        <Icon className="h-3 w-3" />
      </div>
      <span className="text-sm font-bold">{value}</span>
      <span className="text-[10px] text-muted-foreground">{label}</span>
    </div>
  );
}
