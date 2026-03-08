import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Printer, Search } from 'lucide-react';


import type { Material } from '@/types';

export default function MaterialsPrintView() {
  const [materials, setMaterials] = useState<Material[]>([]);
  const [searchNome, setSearchNome] = useState('');
  const [loading, setLoading] = useState(true);

  const fetchMaterials = async () => {
    setLoading(true);
    let query = supabase.from('materials').select('*').order('nome');

    if (searchNome.trim()) {
      query = query.ilike('nome', `%${searchNome.trim()}%`);
    }

    const { data } = await query;
    setMaterials((data as Material[]) || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchMaterials();
  }, [searchNome]);

  const handlePrint = () => window.print();

  return (
    <div className="container mx-auto py-6 px-4">
        <div className="no-print mb-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Printer className="h-5 w-5 text-primary" />
                Impressão — Material Carga da Seção
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col sm:flex-row gap-3 mb-4">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar por nome..."
                    value={searchNome}
                    onChange={(e) => setSearchNome(e.target.value)}
                    className="pl-9"
                  />
                </div>
                <Button onClick={handlePrint} disabled={loading || materials.length === 0}>
                  <Printer className="h-4 w-4 mr-1" />
                  Imprimir
                </Button>
              </div>
              <p className="text-sm text-muted-foreground">
                {loading ? 'Carregando...' : `${materials.length} registro(s) encontrado(s)`}
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="print-area">
          <div className="hidden print:block mb-6 text-center border-b-2 border-foreground pb-4">
            <h1 className="text-xl font-bold">MATERIAL CARGA DA SEÇÃO</h1>
            <p className="text-sm mt-1">
              Data: {new Date().toLocaleDateString('pt-BR')} — Hora: {new Date().toLocaleTimeString('pt-BR')}
            </p>
          </div>

          {!loading && materials.length > 0 && (
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="bg-muted/50 print:bg-gray-200">
                  <th className="border px-3 py-2 text-left font-semibold">#</th>
                  <th className="border px-3 py-2 text-left font-semibold">Patrimônio</th>
                  <th className="border px-3 py-2 text-left font-semibold">Código do Material</th>
                  <th className="border px-3 py-2 text-left font-semibold">Nº da Ficha</th>
                  <th className="border px-3 py-2 text-left font-semibold">Nome</th>
                </tr>
              </thead>
              <tbody>
                {materials.map((m, i) => (
                  <tr key={m.id} className="even:bg-muted/20 print:even:bg-gray-50">
                    <td className="border px-3 py-1.5">{i + 1}</td>
                    <td className="border px-3 py-1.5 font-mono">{m.patrimonio}</td>
                    <td className="border px-3 py-1.5 font-mono">{m.codigo_material}</td>
                    <td className="border px-3 py-1.5 font-mono">{m.numero_ficha}</td>
                    <td className="border px-3 py-1.5">{m.nome}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          <div className="hidden print:block mt-8 text-center text-xs border-t pt-4">
            <p>Total de registros: {materials.length}</p>
            <p className="mt-1">Documento gerado pela Seção de Informática - 14° B Log</p>
          </div>
        </div>
    </div>
  );
}
