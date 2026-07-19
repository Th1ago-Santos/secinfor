import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart3, ArrowRightLeft, PieChart as PieIcon } from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, CartesianGrid, Legend,
} from 'recharts';
import { useNavigate } from 'react-router-dom';

const STATUS_COLORS: Record<string, string> = {
  'Em uso':          'hsl(210, 80%, 55%)',
  'Em manutenção':   'hsl(38, 92%, 50%)',
  'Baixado':         'hsl(0, 72%, 51%)',
  'Em estoque':      'hsl(152, 60%, 45%)',
};
const FALLBACK_COLORS = ['hsl(220, 85%, 60%)', 'hsl(38, 92%, 50%)', 'hsl(0, 72%, 51%)', 'hsl(152, 60%, 45%)'];

const tooltipStyle = {
  backgroundColor: 'hsl(var(--card))',
  border: '1px solid hsl(var(--border))',
  borderRadius: '10px',
  color: 'hsl(var(--foreground))',
  fontSize: '12px',
  boxShadow: '0 4px 12px hsl(var(--foreground) / 0.05)',
};

type Props = {
  nbBySection: { name: string; count: number }[];
  statusPieData: { name: string; value: number }[];
  movsByMonth: { month: string; count: number }[];
  totalNotebooks: number;
};

export default function DashboardCharts({ nbBySection, statusPieData, movsByMonth, totalNotebooks }: Props) {
  const navigate = useNavigate();
  const horizontal = nbBySection.length > 6;
  const topSections = [...nbBySection].sort((a, b) => b.count - a.count).slice(0, 10);
  const disponivel = statusPieData.find(s => s.name === 'Em estoque')?.value ?? 0;
  const totalPie = statusPieData.reduce((s, d) => s + d.value, 0);
  const pctDisp = totalPie > 0 ? Math.round((disponivel / totalPie) * 100) : 0;

  return (
    <>
      {/* Row: sections + status */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
        <Card className="lg:col-span-2 animate-in-card shadow-card border-border/60">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <div className="p-1.5 rounded-md bg-primary/10">
                <BarChart3 className="h-3.5 w-3.5 text-primary" />
              </div>
              Equipamentos por Seção
              <span className="text-[11px] text-muted-foreground font-normal ml-1">
                (top {Math.min(topSections.length, 10)})
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {topSections.length > 0 ? (
              <ResponsiveContainer width="100%" height={Math.max(260, topSections.length * (horizontal ? 30 : 40))}>
                {horizontal ? (
                  <BarChart data={topSections} layout="vertical" margin={{ left: 12, right: 24, top: 8, bottom: 8 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
                    <XAxis type="number" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} allowDecimals={false} />
                    <YAxis
                      dataKey="name"
                      type="category"
                      width={140}
                      tick={{ fontSize: 12, fill: 'hsl(var(--foreground))' }}
                      interval={0}
                    />
                    <Tooltip contentStyle={tooltipStyle} cursor={{ fill: 'hsl(var(--muted) / 0.4)' }} />
                    <Bar
                      dataKey="count"
                      name="Equipamentos"
                      fill="hsl(var(--primary))"
                      radius={[0, 6, 6, 0]}
                      onClick={(d: any) => d?.name && navigate(`/notebooks?secao=${encodeURIComponent(d.name)}`)}
                      cursor="pointer"
                    />
                  </BarChart>
                ) : (
                  <BarChart data={topSections} margin={{ left: 8, right: 8, top: 8, bottom: 8 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="name" tick={{ fontSize: 12, fill: 'hsl(var(--foreground))' }} interval={0} />
                    <YAxis tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} allowDecimals={false} />
                    <Tooltip contentStyle={tooltipStyle} cursor={{ fill: 'hsl(var(--muted) / 0.4)' }} />
                    <Bar
                      dataKey="count"
                      name="Equipamentos"
                      fill="hsl(var(--primary))"
                      radius={[6, 6, 0, 0]}
                      onClick={(d: any) => d?.name && navigate(`/notebooks?secao=${encodeURIComponent(d.name)}`)}
                      cursor="pointer"
                    />
                  </BarChart>
                )}
              </ResponsiveContainer>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-16">Sem dados disponíveis</p>
            )}
          </CardContent>
        </Card>

        <Card className="animate-in-card shadow-card border-border/60">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <div className="p-1.5 rounded-md bg-primary/10">
                <PieIcon className="h-3.5 w-3.5 text-primary" />
              </div>
              Estado dos Notebooks
            </CardTitle>
          </CardHeader>
          <CardContent>
            {statusPieData.length > 0 ? (
              <>
                <div className="relative">
                  <ResponsiveContainer width="100%" height={200}>
                    <PieChart>
                      <Pie
                        data={statusPieData}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        outerRadius={82}
                        innerRadius={56}
                        strokeWidth={2}
                        stroke="hsl(var(--card))"
                      >
                        {statusPieData.map((d, i) => (
                          <Cell key={i} fill={STATUS_COLORS[d.name] || FALLBACK_COLORS[i % FALLBACK_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip contentStyle={tooltipStyle} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                    <p className="text-2xl font-bold tabular-nums leading-none">{totalNotebooks}</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">notebooks</p>
                    <p className="text-[11px] font-semibold text-success mt-1 tabular-nums">{pctDisp}% em estoque</p>
                  </div>
                </div>
                <div className="mt-2 space-y-1.5">
                  {statusPieData.map((d, i) => {
                    const color = STATUS_COLORS[d.name] || FALLBACK_COLORS[i % FALLBACK_COLORS.length];
                    const pct = totalPie > 0 ? Math.round((d.value / totalPie) * 100) : 0;
                    return (
                      <div key={d.name} className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="h-2.5 w-2.5 rounded-sm shrink-0" style={{ background: color }} />
                          <span className="truncate">{d.name}</span>
                        </div>
                        <span className="font-semibold tabular-nums ml-2">
                          {d.value} <span className="text-muted-foreground font-normal">({pct}%)</span>
                        </span>
                      </div>
                    );
                  })}
                </div>
              </>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-16">Sem dados disponíveis</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Movements */}
      <Card className="animate-in-card shadow-card border-border/60 mb-6">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <div className="p-1.5 rounded-md bg-primary/10">
              <ArrowRightLeft className="h-3.5 w-3.5 text-primary" />
            </div>
            Movimentações por período
          </CardTitle>
        </CardHeader>
        <CardContent>
          {movsByMonth.length === 0 || movsByMonth.every(m => m.count === 0) ? (
            <p className="text-sm text-muted-foreground text-center py-12">
              Nenhuma movimentação registrada no período selecionado.
            </p>
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <LineChart data={movsByMonth} margin={{ left: 4, right: 12, top: 8, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="month" tick={{ fontSize: 12, fill: 'hsl(var(--foreground))' }} />
                <YAxis tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} allowDecimals={false} />
                <Tooltip contentStyle={tooltipStyle} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Line
                  type="monotone"
                  dataKey="count"
                  name="Movimentações"
                  stroke="hsl(var(--primary))"
                  strokeWidth={2.5}
                  dot={{ r: 4, fill: 'hsl(var(--primary))', strokeWidth: 2, stroke: 'hsl(var(--card))' }}
                  activeDot={{ r: 6, strokeWidth: 2 }}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>
    </>
  );
}
