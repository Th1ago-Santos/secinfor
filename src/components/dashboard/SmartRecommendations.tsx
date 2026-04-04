import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Lightbulb, RefreshCw, Sparkles, AlertCircle, ClipboardList, UserX, FolderSearch, PackageX, BarChart3 } from 'lucide-react';

type Recommendation = {
  icon: 'missing' | 'incomplete' | 'nouser' | 'review' | 'stats' | 'alert';
  priority: 'low' | 'medium' | 'high';
  text: string;
};

const ICON_MAP = {
  missing: FolderSearch,
  incomplete: ClipboardList,
  nouser: UserX,
  review: PackageX,
  stats: BarChart3,
  alert: AlertCircle,
};

const PRIORITY_STYLES = {
  low: 'border-l-muted-foreground/40 bg-muted/30',
  medium: 'border-l-warning bg-warning/5',
  high: 'border-l-destructive bg-destructive/5',
};

export default function SmartRecommendations() {
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);

  const analyze = async () => {
    setLoading(true);
    try {
      const [
        { data: notebooks },
        { data: materials },
        { data: priorities },
        { data: alerts },
      ] = await Promise.all([
        supabase.from('notebooks').select('id, patrimonio, modelo, secao, militar, status'),
        supabase.from('materials').select('id, patrimonio, nome, codigo_material, numero_ficha'),
        supabase.from('computer_priorities').select('id, secao, status, data_solicitacao'),
        supabase.from('alerts').select('id, status'),
      ]);

      const nbs = (notebooks || []) as any[];
      const mats = (materials || []) as any[];
      const prios = (priorities || []) as any[];
      const alts = (alerts || []) as any[];
      const result: Recommendation[] = [];

      // 1. Notebooks without responsible
      const noMilitar = nbs.filter(n => !n.militar || n.militar.trim() === '');
      if (noMilitar.length > 0) {
        result.push({
          icon: 'nouser',
          priority: noMilitar.length > 3 ? 'high' : 'medium',
          text: `${noMilitar.length} notebook(s) cadastrado(s) sem nome de responsável. Recomenda-se atribuir um militar cautelado para controle patrimonial.`,
        });
      }

      // 2. Items "Fora de Carga" needing review
      const fc = nbs.filter(n => n.status === 'Fora de Carga' || n.patrimonio?.startsWith('FC-'));
      if (fc.length > 0) {
        result.push({
          icon: 'review',
          priority: fc.length > 5 ? 'high' : 'medium',
          text: `${fc.length} item(ns) fora de carga devem ser revisados para conferência patrimonial e possível baixa definitiva.`,
        });
      }

      // 3. Sections with high concentration
      const secCount: Record<string, number> = {};
      nbs.forEach(n => { secCount[n.secao] = (secCount[n.secao] || 0) + 1; });
      const secEntries = Object.entries(secCount).sort((a, b) => b[1] - a[1]);
      if (secEntries.length > 1) {
        const avg = nbs.length / secEntries.length;
        const overloaded = secEntries.filter(([, c]) => c > avg * 2);
        if (overloaded.length > 0) {
          result.push({
            icon: 'stats',
            priority: 'medium',
            text: `As seções ${overloaded.map(([s, c]) => `"${s}" (${c})`).join(', ')} concentram equipamentos acima da média. Considere redistribuição.`,
          });
        }
      }

      // 4. Open priorities aging
      const openPrios = prios.filter(p => p.status === 'aberta');
      const oldPrios = openPrios.filter(p => {
        if (!p.data_solicitacao) return false;
        const days = (Date.now() - new Date(p.data_solicitacao + 'T00:00:00').getTime()) / (1000 * 60 * 60 * 24);
        return days > 30;
      });
      if (oldPrios.length > 0) {
        result.push({
          icon: 'alert',
          priority: 'high',
          text: `${oldPrios.length} prioridade(s) aberta(s) há mais de 30 dias. Avalie o andamento da fila de atendimento.`,
        });
      }

      // 5. Active alerts
      const activeAlerts = alts.filter(a => a.status === 'ativo');
      if (activeAlerts.length > 0) {
        result.push({
          icon: 'alert',
          priority: activeAlerts.length > 5 ? 'high' : 'medium',
          text: `${activeAlerts.length} alerta(s) ativo(s) no sistema aguardando resolução.`,
        });
      }

      // 6. Materials incomplete data
      const incompleteMats = mats.filter(m => !m.nome?.trim() || !m.codigo_material?.trim() || !m.numero_ficha?.trim());
      if (incompleteMats.length > 0) {
        result.push({
          icon: 'incomplete',
          priority: 'medium',
          text: `${incompleteMats.length} material(is) com informações de cadastro incompletas. Revisar campos obrigatórios.`,
        });
      }

      // 7. Notebooks in maintenance too long (if any maintenance without exit date)
      const inMaint = nbs.filter(n => n.status === 'Em manutenção');
      if (inMaint.length > 3) {
        result.push({
          icon: 'review',
          priority: 'high',
          text: `${inMaint.length} equipamentos em manutenção. Volume alto pode indicar necessidade de renovação do parque tecnológico.`,
        });
      }

      if (result.length === 0) {
        result.push({
          icon: 'stats',
          priority: 'low',
          text: 'Nenhuma recomendação pendente. O sistema está em boas condições de gestão patrimonial.',
        });
      }

      // Sort by priority
      const priorityOrder = { high: 0, medium: 1, low: 2 };
      result.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);

      setRecommendations(result);
      setLoaded(true);
    } catch (e) {
      console.error('Recommendations error:', e);
      setRecommendations([{ icon: 'alert', priority: 'high', text: 'Erro ao gerar recomendações.' }]);
      setLoaded(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="mb-6 animate-in-card shadow-card border-border/50 overflow-hidden">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <div className="p-1.5 rounded-md bg-amber-500/10">
              <Lightbulb className="h-3.5 w-3.5 text-amber-500" />
            </div>
            Recomendações Inteligentes de Gestão
            <Badge variant="secondary" className="text-[9px] px-1.5 py-0 font-mono">
              <Sparkles className="h-2.5 w-2.5 mr-0.5" />IA
            </Badge>
          </CardTitle>
          <Button size="sm" variant="outline" onClick={analyze} disabled={loading} className="text-xs h-7 gap-1.5">
            <RefreshCw className={`h-3 w-3 ${loading ? 'animate-spin' : ''}`} />
            {loaded ? 'Atualizar' : 'Analisar'}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {!loaded && !loading && (
          <div className="text-center py-8">
            <Lightbulb className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">Clique em <strong>"Analisar"</strong> para receber recomendações de gestão patrimonial baseadas nos dados do sistema.</p>
          </div>
        )}

        {loading && (
          <div className="space-y-3">
            {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-16 rounded-xl" />)}
          </div>
        )}

        {loaded && !loading && (
          <div className="space-y-2.5">
            {recommendations.map((rec, i) => {
              const Icon = ICON_MAP[rec.icon];
              return (
                <div
                  key={i}
                  className={`flex items-start gap-3 p-3.5 rounded-xl border-l-4 ${PRIORITY_STYLES[rec.priority]} transition-all duration-200`}
                >
                  <div className="shrink-0 mt-0.5">
                    <Icon className="h-4 w-4 text-foreground/70" />
                  </div>
                  <p className="text-xs leading-relaxed text-foreground">{rec.text}</p>
                  <Badge variant="outline" className="text-[8px] shrink-0 self-start">
                    {rec.priority === 'high' ? 'Alta' : rec.priority === 'medium' ? 'Média' : 'Baixa'}
                  </Badge>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
