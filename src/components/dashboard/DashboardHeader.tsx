import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent,
  DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { RefreshCw, TrendingUp, Plus, Printer, Ticket, ArrowRightLeft, Laptop, Monitor, ChevronDown } from 'lucide-react';

export type Period = '7d' | '30d' | '6m' | '12m';

type Props = {
  period: Period;
  onPeriodChange: (p: Period) => void;
  lastUpdated: Date | null;
  onRefresh: () => void;
  refreshing: boolean;
};

export default function DashboardHeader({ period, onPeriodChange, lastUpdated, onRefresh, refreshing }: Props) {
  const navigate = useNavigate();

  const formatUpdated = (d: Date | null) => {
    if (!d) return '—';
    return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-6">
      <div className="flex items-center gap-3">
        <div className="p-2.5 rounded-xl gradient-primary shadow-glow">
          <TrendingUp className="h-5 w-5 text-primary-foreground" />
        </div>
        <div>
          <h1 className="text-xl font-bold tracking-tight">Painel de Controle</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Visão geral dos equipamentos, movimentações e chamados
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <span className="text-[11px] text-muted-foreground hidden sm:inline">
          Atualizado às {formatUpdated(lastUpdated)}
        </span>

        <Select value={period} onValueChange={(v) => onPeriodChange(v as Period)}>
          <SelectTrigger className="h-9 w-[140px] text-xs bg-muted/30 border-border/60">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7d">Últimos 7 dias</SelectItem>
            <SelectItem value="30d">Últimos 30 dias</SelectItem>
            <SelectItem value="6m">Últimos 6 meses</SelectItem>
            <SelectItem value="12m">Últimos 12 meses</SelectItem>
          </SelectContent>
        </Select>

        <Button variant="outline" size="sm" onClick={onRefresh} disabled={refreshing} className="h-9 text-xs">
          <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${refreshing ? 'animate-spin' : ''}`} />
          Atualizar
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button size="sm" className="h-9 text-xs gradient-primary border-0 shadow-glow">
              <Plus className="h-3.5 w-3.5 mr-1.5" />
              Ações rápidas
              <ChevronDown className="h-3 w-3 ml-1 opacity-70" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel className="text-[10px] uppercase tracking-wider text-muted-foreground">
              Cadastros
            </DropdownMenuLabel>
            <DropdownMenuItem onClick={() => navigate('/itens/novo')}>
              <Laptop className="h-4 w-4 mr-2" /> Cadastrar notebook
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => navigate('/materiais/novo')}>
              <Monitor className="h-4 w-4 mr-2" /> Cadastrar material
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuLabel className="text-[10px] uppercase tracking-wider text-muted-foreground">
              Operação
            </DropdownMenuLabel>
            <DropdownMenuItem onClick={() => navigate('/chamados/novo')}>
              <Ticket className="h-4 w-4 mr-2" /> Abrir chamado
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => navigate('/movimentacoes')}>
              <ArrowRightLeft className="h-4 w-4 mr-2" /> Registrar movimentação
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => navigate('/impressao')}>
              <Printer className="h-4 w-4 mr-2" /> Imprimir ficha
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
