import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart3, ArrowRightLeft } from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, CartesianGrid,
} from 'recharts';

const PIE_COLORS = [
  'hsl(152, 60%, 45%)',
  'hsl(38, 92%, 50%)',
  'hsl(0, 72%, 51%)',
  'hsl(220, 85%, 60%)',
];

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
};

export default function DashboardCharts({ nbBySection, statusPieData, movsByMonth }: Props) {
  return (
    <>
      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
        <Card className="lg:col-span-2 animate-in-card shadow-card border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <div className="p-1.5 rounded-md bg-primary/10">
                <BarChart3 className="h-3.5 w-3.5 text-primary" />
              </div>
              Notebooks por Seção
            </CardTitle>
          </CardHeader>
          <CardContent>
            {nbBySection.length > 0 ? (
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={nbBySection}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} />
                  <YAxis tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} allowDecimals={false} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Bar dataKey="count" name="Notebooks" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-16">Sem dados disponíveis</p>
            )}
          </CardContent>
        </Card>

        <Card className="animate-in-card shadow-card border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Status dos Notebooks</CardTitle>
          </CardHeader>
          <CardContent>
            {statusPieData.length > 0 ? (
              <ResponsiveContainer width="100%" height={240}>
                <PieChart>
                  <Pie data={statusPieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} innerRadius={45} label={({ name, value }) => `${name}: ${value}`} labelLine={false} strokeWidth={2} stroke="hsl(var(--card))">
                    {statusPieData.map((_, i) => (
                      <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={tooltipStyle} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-16">Sem dados disponíveis</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Movements line chart */}
      <Card className="animate-in-card shadow-card border-border/50 mb-6">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <div className="p-1.5 rounded-md bg-primary/10">
              <ArrowRightLeft className="h-3.5 w-3.5 text-primary" />
            </div>
            Movimentações por Mês
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={movsByMonth}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} />
              <YAxis tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} allowDecimals={false} />
              <Tooltip contentStyle={tooltipStyle} />
              <Line type="monotone" dataKey="count" name="Movimentações" stroke="hsl(var(--primary))" strokeWidth={2.5} dot={{ r: 4, fill: 'hsl(var(--primary))', strokeWidth: 2, stroke: 'hsl(var(--card))' }} activeDot={{ r: 6, strokeWidth: 2 }} />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </>
  );
}
