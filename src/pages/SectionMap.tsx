import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Map, Laptop, Package, Wrench, Archive, Eye, ArrowRightLeft } from 'lucide-react';
import AppHeader from '@/components/AppHeader';

type SectionData = {
  name: string;
  notebooks: number;
  materials: number;
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
  const [filterTipo, setFilterTipo] = useState('all');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    const { data: sections } = await supabase.from('sections').select('name').order('name');
    const { data: allNbs } = await supabase.from('notebooks').select('secao, status');
    const { data: allMats } = await supabase.from('materials').select('id');
    const { data: alertsData } = await supabase.from('alerts').select('secao').eq('status', 'ativo');

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const { data: recentMovs } = await supabase.from('movements').select('secao_destino').gte('data_hora', thirtyDaysAgo.toISOString());

    const result: SectionData[] = (sections as any[] || []).map(s => {
      const sNbs = (allNbs as any[] || []).filter(n => n.secao === s.name);
      return {
        name: s.name,
        notebooks: sNbs.length,
        materials: 0, // materials don't have section field
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

  const filtered = sectionsData;

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <main className="container mx-auto py-6 px-4 animate-in-page">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Map className="h-5 w-5 text-primary" />
            Mapa das Seções
          </h2>
          <Select value={filterTipo} onValueChange={setFilterTipo}>
            <SelectTrigger className="w-full sm:w-[200px] h-9"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Notebooks + Materiais</SelectItem>
              <SelectItem value="notebooks">Apenas Notebooks</SelectItem>
              <SelectItem value="materials">Apenas Materiais</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {[...Array(8)].map((_, i) => <Skeleton key={i} className="h-48 rounded-lg" />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            <Map className="h-14 w-14 mx-auto mb-4 opacity-20" />
            <p className="text-lg font-medium">Nenhuma seção cadastrada</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filtered.map(sec => (
              <Card key={sec.name} className={`animate-in-card hover:border-primary/30 transition-hover ${sec.emManutencao > 0 ? 'border-warning/30' : ''} ${sec.alertas > 0 ? 'border-destructive/30' : ''}`}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center justify-between">
                    <span className="truncate">{sec.name}</span>
                    {sec.alertas > 0 && <Badge variant="destructive" className="text-[10px] px-1.5">{sec.alertas} alerta(s)</Badge>}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {(filterTipo === 'all' || filterTipo === 'notebooks') && (
                    <div className="grid grid-cols-2 gap-2">
                      <div className="flex items-center gap-1.5">
                        <Laptop className="h-3.5 w-3.5 text-primary" />
                        <span className="text-sm font-semibold">{sec.notebooks}</span>
                        <span className="text-[11px] text-muted-foreground">notebooks</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Wrench className="h-3.5 w-3.5 text-warning" />
                        <span className="text-sm font-semibold">{sec.emManutencao}</span>
                        <span className="text-[11px] text-muted-foreground">manut.</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Archive className="h-3.5 w-3.5 text-destructive" />
                        <span className="text-sm font-semibold">{sec.baixados}</span>
                        <span className="text-[11px] text-muted-foreground">baixados</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <ArrowRightLeft className="h-3.5 w-3.5 text-muted-foreground" />
                        <span className="text-sm font-semibold">{sec.recentMovs}</span>
                        <span className="text-[11px] text-muted-foreground">movs (30d)</span>
                      </div>
                    </div>
                  )}

                  {(filterTipo === 'all' || filterTipo === 'materials') && (
                    <div className="flex items-center gap-1.5">
                      <Package className="h-3.5 w-3.5 text-accent" />
                      <span className="text-sm font-semibold">{sec.materials}</span>
                      <span className="text-[11px] text-muted-foreground">materiais</span>
                    </div>
                  )}

                  {/* Status bar */}
                  {sec.notebooks > 0 && (filterTipo === 'all' || filterTipo === 'notebooks') && (
                    <div className="flex h-2 rounded-full overflow-hidden bg-muted">
                      {sec.emUso > 0 && <div className="bg-success" style={{ width: `${(sec.emUso / sec.notebooks) * 100}%` }} />}
                      {sec.emManutencao > 0 && <div className="bg-warning" style={{ width: `${(sec.emManutencao / sec.notebooks) * 100}%` }} />}
                      {sec.baixados > 0 && <div className="bg-destructive" style={{ width: `${(sec.baixados / sec.notebooks) * 100}%` }} />}
                      {sec.emEstoque > 0 && <div className="bg-primary" style={{ width: `${(sec.emEstoque / sec.notebooks) * 100}%` }} />}
                    </div>
                  )}

                  <Button variant="outline" size="sm" className="w-full transition-hover" onClick={() => navigate(`/?secao=${encodeURIComponent(sec.name)}`)}>
                    <Eye className="h-3.5 w-3.5 mr-1.5" />
                    Ver itens da seção
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
