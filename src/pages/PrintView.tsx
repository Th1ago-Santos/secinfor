import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Printer, Search } from 'lucide-react';
import AppHeader from '@/components/AppHeader';
import { useSections } from '@/hooks/useSections';
import type { Database } from '@/integrations/supabase/types';

type Notebook = Database['public']['Tables']['notebooks']['Row'] & { foto_url?: string | null };

export default function PrintView() {
  const [notebooks, setNotebooks] = useState<Notebook[]>([]);
  const [filterSecao, setFilterSecao] = useState('all');
  const [searchPatrimonio, setSearchPatrimonio] = useState('');
  const [loading, setLoading] = useState(true);
  const { sections } = useSections();

  const fetchNotebooks = async () => {
    setLoading(true);
    let query = supabase.from('notebooks').select('*').order('secao').order('patrimonio');

    if (filterSecao && filterSecao !== 'all') {
      query = query.eq('secao', filterSecao);
    }
    if (searchPatrimonio.trim()) {
      query = query.ilike('patrimonio', `%${searchPatrimonio.trim()}%`);
    }

    const { data } = await query;
    setNotebooks((data as Notebook[]) || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchNotebooks();
  }, [filterSecao, searchPatrimonio]);

  const handlePrint = () => window.print();

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <main className="container mx-auto py-6 px-4">
        {/* Filtros - não imprime */}
        <div className="no-print mb-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Printer className="h-5 w-5 text-primary" />
                Impressão de Relatório
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col sm:flex-row gap-3 mb-4">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar por patrimônio..."
                    value={searchPatrimonio}
                    onChange={(e) => setSearchPatrimonio(e.target.value)}
                    className="pl-9"
                  />
                </div>
                <Select value={filterSecao} onValueChange={setFilterSecao}>
                  <SelectTrigger className="w-full sm:w-[220px]">
                    <SelectValue placeholder="Filtrar por seção" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas as seções</SelectItem>
                    {sections.map((s) => (
                      <SelectItem key={s.id} value={s.name}>{s.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button onClick={handlePrint} disabled={loading || notebooks.length === 0}>
                  <Printer className="h-4 w-4 mr-1" />
                  Imprimir
                </Button>
              </div>
              <p className="text-sm text-muted-foreground">
                {loading ? 'Carregando...' : `${notebooks.length} registro(s) encontrado(s)`}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Área de impressão */}
        <div className="print-area">
          {/* Cabeçalho impresso */}
          <div className="hidden print:block mb-6 text-center border-b-2 border-foreground pb-4">
            <h1 className="text-xl font-bold">CONTROLE DE PATRIMÔNIO — NOTEBOOKS</h1>
            <p className="text-sm mt-1">
              Data: {new Date().toLocaleDateString('pt-BR')} — Hora: {new Date().toLocaleTimeString('pt-BR')}
            </p>
            {filterSecao !== 'all' && (
              <p className="text-sm font-semibold mt-1">Seção: {filterSecao}</p>
            )}
          </div>

          {!loading && notebooks.length > 0 && (
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="bg-muted/50 print:bg-gray-200">
                  <th className="border px-3 py-2 text-left font-semibold">#</th>
                  <th className="border px-3 py-2 text-left font-semibold">Patrimônio</th>
                  <th className="border px-3 py-2 text-left font-semibold">Modelo</th>
                  <th className="border px-3 py-2 text-left font-semibold">Seção</th>
                  <th className="border px-3 py-2 text-left font-semibold">Militar</th>
                </tr>
              </thead>
              <tbody>
                {notebooks.map((nb, i) => (
                  <tr key={nb.id} className="even:bg-muted/20 print:even:bg-gray-50">
                    <td className="border px-3 py-1.5">{i + 1}</td>
                    <td className="border px-3 py-1.5 font-mono">{nb.patrimonio}</td>
                    <td className="border px-3 py-1.5">{nb.modelo}</td>
                    <td className="border px-3 py-1.5">{nb.secao}</td>
                    <td className="border px-3 py-1.5">{nb.militar}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {/* Rodapé impresso */}
          <div className="hidden print:block mt-8 text-center text-xs border-t pt-4">
            <p>Total de registros: {notebooks.length}</p>
            <p className="mt-1">Documento gerado pelo Sistema de Controle de Patrimônio</p>
          </div>
        </div>
      </main>
    </div>
  );
}
