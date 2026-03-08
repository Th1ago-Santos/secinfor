import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Laptop, Package, Layers, CheckCircle, Wrench, Archive, ArrowRightLeft,
  ClipboardCheck, Bell, BarChart3,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

export type Stats = {
  totalNotebooks: number;
  totalMaterials: number;
  emUso: number;
  emManutencao: number;
  baixados: number;
  emEstoque: number;
  totalSections: number;
  movimentacoesMes: number;
  inventariosMes: number;
  alertasAtivos: number;
};

type Indicator = {
  label: string;
  value: number;
  icon: LucideIcon;
  variant: string;
  highlight?: boolean;
  onClick?: () => void;
};

const variantColors: Record<string, { icon: string; border: string; highlight: string }> = {
  primary: { icon: 'text-primary bg-primary/10', border: 'hover:border-primary/30', highlight: 'border-primary/20 bg-primary/[0.03] dark:bg-primary/[0.06]' },
  info: { icon: 'text-info bg-info/10', border: 'hover:border-info/30', highlight: 'border-info/20 bg-info/[0.03] dark:bg-info/[0.06]' },
  success: { icon: 'text-success bg-success/10', border: 'hover:border-success/30', highlight: 'border-success/20 bg-success/[0.03] dark:bg-success/[0.06]' },
  warning: { icon: 'text-warning bg-warning/10', border: 'hover:border-warning/30', highlight: 'border-warning/20 bg-warning/[0.03] dark:bg-warning/[0.06]' },
  destructive: { icon: 'text-destructive bg-destructive/10', border: 'hover:border-destructive/30', highlight: 'border-destructive/20 bg-destructive/[0.03] dark:bg-destructive/[0.06]' },
  default: { icon: 'text-muted-foreground bg-muted', border: 'hover:border-border', highlight: '' },
};

export default function StatsCards({ stats }: { stats: Stats }) {
  const navigate = useNavigate();

  const indicators: Indicator[] = [
    { label: 'Notebooks', value: stats.totalNotebooks, icon: Laptop, variant: 'primary', highlight: true },
    { label: 'Materiais', value: stats.totalMaterials, icon: Package, variant: 'info', highlight: true },
    { label: 'Patrimônios', value: stats.totalNotebooks + stats.totalMaterials, icon: Layers, variant: 'default' },
    { label: 'Em Uso', value: stats.emUso, icon: CheckCircle, variant: 'success', highlight: true },
    { label: 'Em Manutenção', value: stats.emManutencao, icon: Wrench, variant: 'warning' },
    { label: 'Baixados', value: stats.baixados, icon: Archive, variant: 'destructive' },
    { label: 'Seções', value: stats.totalSections, icon: BarChart3, variant: 'primary' },
    { label: 'Movimentações', value: stats.movimentacoesMes, icon: ArrowRightLeft, variant: 'info' },
    { label: 'Inventários', value: stats.inventariosMes, icon: ClipboardCheck, variant: 'success' },
    { label: 'Alertas', value: stats.alertasAtivos, icon: Bell, variant: 'destructive', highlight: stats.alertasAtivos > 0, onClick: () => navigate('/alertas') },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 sm:gap-3 mb-6">
      {indicators.map((ind, idx) => (
        <Card
          key={ind.label}
          className={`kpi-card group border-border/50 ${variantColors[ind.variant].border} ${ind.highlight ? variantColors[ind.variant].highlight : ''} ${ind.onClick ? 'cursor-pointer' : ''}`}
          onClick={ind.onClick}
          style={{ animationDelay: `${idx * 40}ms` }}
        >
          <CardContent className="pt-3 pb-2.5 px-3 sm:pt-4 sm:pb-3 sm:px-4">
            <div className="flex items-center justify-between mb-2 sm:mb-3">
              <div className={`p-1.5 sm:p-2 rounded-lg ${variantColors[ind.variant].icon} transition-transform duration-300 group-hover:scale-110`}>
                <ind.icon className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              </div>
              {ind.label === 'Alertas' && ind.value > 0 && (
                <Badge variant="destructive" className="text-[10px] px-1.5 py-0 animate-scale-in">{ind.value}</Badge>
              )}
            </div>
            <p className="text-xl sm:text-2xl font-bold tracking-tight animate-count-up">{ind.value}</p>
            <p className="text-[10px] sm:text-[11px] text-muted-foreground mt-0.5 font-medium">{ind.label}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
