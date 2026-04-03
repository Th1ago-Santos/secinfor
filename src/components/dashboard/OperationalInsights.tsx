import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Brain, RefreshCw, Sparkles, AlertTriangle, TrendingUp, Users, MapPin, Package } from 'lucide-react';

type Insight = {
  icon: 'alert' | 'trend' | 'user' | 'location' | 'package';
  level: 'info' | 'warning' | 'critical';
  text: string;
};

const ICON_MAP = {
  alert: AlertTriangle,
  trend: TrendingUp,
  user: Users,
  location: MapPin,
  package: Package,
};

const LEVEL_STYLES = {
  info: 'border-l-primary bg-primary/5 text-primary',
  warning: 'border-l-warning bg-warning/5 text-warning',
  critical: 'border-l-destructive bg-destructive/5 text-destructive',
};

export default function OperationalInsights() {
  const [insights, setInsights] = useState<Insight[]>([]);
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);

  const analyze = async () => {
    setLoading(true);
    try {
      const [
        { data: notebooks },
        { data: movements },
        { data: priorities },
      ] = await Promise.all([
        supabase.from('notebooks').select('id, patrimonio, modelo, secao, militar, status'),
        supabase.from('movements').select('id, tipo_evento, secao_origem, secao_destino, data_hora').order('data_hora', { ascending: false }).limit(500),
        supabase.from('computer_priorities').select('id, secao, status, data_solicitacao, data_encerramento'),
      ]);

      const nbs = (notebooks || []) as any[];
      const movs = (movements || []) as any[];
      const prios = (priorities || []) as any[];
      const result: Insight[] = [];

      // 1. Section with most equipment
      const secCount: Record<string, number> = {};
      nbs.forEach(n => { secCount[n.secao] = (secCount[n.secao] || 0) + 1; });
      const secEntries = Object.entries(secCount).sort((a, b) => b[1] - a[1]);
      if (secEntries.length > 0) {
        const [topSec, topCount] = secEntries[0];
        const avg = nbs.length / secEntries.length;
        if (topCount > avg * 1.5) {
          result.push({ icon: 'location', level: 'warning', text: `A seção "${topSec}" concentra ${topCount} equipamentos — ${Math.round((topCount / nbs.length) * 100)}% do total. Considere redistribuição.` });
        } else {
          result.push({ icon: 'location', level: 'info', text: `A seção "${topSec}" possui a maior quantidade de equipamentos (${topCount} itens).` });
        }
      }

      // 2. Military with most items
      const milCount: Record<string, number> = {};
      nbs.forEach(n => { milCount[n.militar] = (milCount[n.militar] || 0) + 1; });
      const milEntries = Object.entries(milCount).sort((a, b) => b[1] - a[1]);
      if (milEntries.length > 0 && milEntries[0][1] > 1) {
        const [topMil, mCount] = milEntries[0];
        result.push({ icon: 'user', level: mCount > 5 ? 'warning' : 'info', text: `O militar "${topMil}" possui ${mCount} itens cautelados${mCount > 5 ? ' — quantidade acima do recomendado' : ''}.` });
      }

      // 3. Items "Fora de Carga"
      const fcItems = nbs.filter(n => n.status === 'Fora de Carga' || n.patrimonio?.startsWith('FC-'));
      if (fcItems.length > 0) {
        const pct = Math.round((fcItems.length / nbs.length) * 100);
        result.push({ icon: 'package', level: pct > 20 ? 'critical' : 'warning', text: `${fcItems.length} item(ns) estão fora de carga (${pct}% do acervo).${pct > 20 ? ' Proporção elevada — avaliar baixa definitiva.' : ''}` });
      }

      // 4. Items in maintenance
      const manutItens = nbs.filter(n => n.status === 'Em manutenção');
      if (manutItens.length > 0) {
        result.push({ icon: 'alert', level: manutItens.length > 5 ? 'critical' : 'warning', text: `${manutItens.length} notebook(s) em manutenção.${manutItens.length > 5 ? ' Volume alto — verificar gargalos no suporte técnico.' : ''}` });
      }

      // 5. Movement volume
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const recentMovs = movs.filter(m => new Date(m.data_hora) >= thirtyDaysAgo);
      if (recentMovs.length > 0) {
        const movSecCount: Record<string, number> = {};
        recentMovs.forEach(m => {
          if (m.secao_destino) movSecCount[m.secao_destino] = (movSecCount[m.secao_destino] || 0) + 1;
          if (m.secao_origem) movSecCount[m.secao_origem] = (movSecCount[m.secao_origem] || 0) + 1;
        });
        const topMovSec = Object.entries(movSecCount).sort((a, b) => b[1] - a[1]);
        if (topMovSec.length > 0) {
          result.push({ icon: 'trend', level: 'info', text: `Nos últimos 30 dias houve ${recentMovs.length} movimentação(ões). A seção "${topMovSec[0][0]}" teve maior volume (${topMovSec[0][1]} registros).` });
        }
      }

      // 6. Open priorities
      const openPrios = prios.filter(p => p.status === 'aberta');
      if (openPrios.length > 3) {
        result.push({ icon: 'alert', level: 'warning', text: `Existem ${openPrios.length} prioridades em aberto. Considere avaliar a fila de atendimento.` });
      }

      // 7. Model concentration
      const modelCount: Record<string, number> = {};
      nbs.forEach(n => { modelCount[n.modelo] = (modelCount[n.modelo] || 0) + 1; });
      const modelEntries = Object.entries(modelCount).sort((a, b) => b[1] - a[1]);
      if (modelEntries.length > 0) {
        const [topModel, mCt] = modelEntries[0];
        if (mCt > nbs.length * 0.4 && nbs.length > 5) {
          result.push({ icon: 'package', level: 'info', text: `O modelo "${topModel}" representa ${Math.round((mCt / nbs.length) * 100)}% do parque — diversifique para reduzir riscos de obsolescência.` });
        }
      }

      // 8. Sections with no equipment
      const { data: allSections } = await supabase.from('sections').select('name');
      if (allSections) {
        const emptySections = allSections.filter(s => !secCount[(s as any).name]);
        if (emptySections.length > 0) {
          result.push({ icon: 'location', level: 'info', text: `${emptySections.length} seção(ões) cadastrada(s) sem equipamentos vinculados: ${emptySections.slice(0, 3).map(s => (s as any).name).join(', ')}${emptySections.length > 3 ? '...' : ''}.` });
        }
      }

      if (result.length === 0) {
        result.push({ icon: 'trend', level: 'info', text: 'Nenhuma anomalia detectada. O patrimônio está bem distribuído e sem alertas relevantes.' });
      }

      setInsights(result);
      setLoaded(true);
    } catch (e) {
      console.error('Insights error:', e);
      setInsights([{ icon: 'alert', level: 'critical', text: 'Erro ao gerar insights operacionais.' }]);
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
            <div className="p-1.5 rounded-md gradient-primary">
              <Brain className="h-3.5 w-3.5 text-primary-foreground" />
            </div>
            Análise Inteligente Operacional
            <Badge variant="secondary" className="text-[9px] px-1.5 py-0 font-mono">
              <Sparkles className="h-2.5 w-2.5 mr-0.5" />Insights
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
            <Brain className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">Clique em <strong>"Analisar"</strong> para gerar insights operacionais baseados nos dados do patrimônio.</p>
          </div>
        )}

        {loading && (
          <div className="space-y-3">
            {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-16 rounded-xl" />)}
          </div>
        )}

        {loaded && !loading && (
          <div className="space-y-2.5">
            {insights.map((insight, i) => {
              const Icon = ICON_MAP[insight.icon];
              return (
                <div
                  key={i}
                  className={`flex items-start gap-3 p-3.5 rounded-xl border-l-4 ${LEVEL_STYLES[insight.level]} transition-all duration-200`}
                >
                  <div className="shrink-0 mt-0.5">
                    <Icon className="h-4 w-4" />
                  </div>
                  <p className="text-xs leading-relaxed text-foreground">{insight.text}</p>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
