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
  onClick?: () => void;
};

const variantColors: Record<string, { icon: string; border: string }> = {
  primary: { icon: 'text-primary bg-primary/10', border: 'hover:border-primary/30' },
  info: { icon: 'text-info bg-info/10', border: 'hover:border-info/30' },
  success: { icon: 'text-success bg-success/10', border: 'hover:border-success/30' },
  warning: { icon: 'text-warning bg-warning/10', border: 'hover:border-warning/30' },
  destructive: { icon: 'text-destructive bg-destructive/10', border: 'hover:border-destructive/30' },
  default: { icon: 'text-muted-foreground bg-muted', border: 'hover:border-border' },
};

export default function StatsCards({ stats }: { stats: Stats }) {
  const navigate = useNavigate();

  const indicators: Indicator[] = [
    { label: 'Notebooks', value: stats.totalNotebooks, icon: Laptop, variant: 'primary' },
    { label: 'Materiais', value: stats.totalMaterials, icon: Package, variant: 'info' },
    { label: 'Patrimônios', value: stats.totalNotebooks + stats.totalMaterials, icon: Layers, variant: 'default' },
    { label: 'Em Uso', value: stats.emUso, icon: CheckCircle, variant: 'success' },
    { label: 'Em Manutenção', value: stats.emManutencao, icon: Wrench, variant: 'warning' },
    { label: 'Baixados', value: stats.baixados, icon: Archive, variant: 'destructive' },
    { label: 'Seções', value: stats.totalSections, icon: BarChart3, variant: 'primary' },
    { label: 'Movimentações', value: stats.movimentacoesMes, icon: ArrowRightLeft, variant: 'info' },
    { label: 'Inventários', value: stats.inventariosMes, icon: ClipboardCheck, variant: 'success' },
    { label: 'Alertas', value: stats.alertasAtivos, icon: Bell, variant: 'destructive', onClick: () => navigate('/alertas') },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-6">
      {indicators.map((ind, idx) => (
        <Card
          key={ind.label}
          className={`kpi-card group border-border/50 ${variantColors[ind.variant].border} ${ind.onClick ? 'cursor-pointer' : ''}`}
          onClick={ind.onClick}
          style={{ animationDelay: `${idx * 40}ms` }}
        >
          <CardContent className="pt-4 pb-3 px-4">
            <div className="flex items-center justify-between mb-3">
              <div className={`p-2 rounded-lg ${variantColors[ind.variant].icon} transition-transform duration-300 group-hover:scale-110`}>
                <ind.icon className="h-4 w-4" />
              </div>
              {ind.label === 'Alertas' && ind.value > 0 && (
                <Badge variant="destructive" className="text-[10px] px-1.5 py-0 animate-scale-in">{ind.value}</Badge>
              )}
            </div>
            <p className="text-2xl font-bold tracking-tight animate-count-up">{ind.value}</p>
            <p className="text-[11px] text-muted-foreground mt-0.5 font-medium">{ind.label}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
