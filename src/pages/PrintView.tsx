import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { Printer, Search, Laptop, Package } from 'lucide-react';

import { useSections } from '@/hooks/useSections';
import { QRCodeSVG } from 'qrcode.react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

type Notebook = { id: string; patrimonio: string; modelo: string; secao: string; militar: string; status: string; foto_url: string | null };
type Material = { id: string; patrimonio: string; codigo_material: string; numero_ficha: string; nome: string };

export default function PrintView() {
  const { sections } = useSections();
  const [tab, setTab] = useState('notebooks');
  const [notebooks, setNotebooks] = useState<Notebook[]>([]);
  const [nbFilterSecao, setNbFilterSecao] = useState('all');
  const [nbFilterStatus, setNbFilterStatus] = useState('all');
  const [nbSearch, setNbSearch] = useState('');
  const [nbIncludeQR, setNbIncludeQR] = useState(false);
  const [nbLoading, setNbLoading] = useState(true);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [matSearch, setMatSearch] = useState('');
  const [matLoading, setMatLoading] = useState(true);
  const [printMode, setPrintMode] = useState(false);

  const fetchNotebooks = async () => {
    setNbLoading(true);
    let query = supabase.from('notebooks').select('id, patrimonio, modelo, secao, militar, status, foto_url').order('secao').order('patrimonio');
    if (nbFilterSecao !== 'all') query = query.eq('secao', nbFilterSecao);
    if (nbFilterStatus !== 'all') query = query.eq('status', nbFilterStatus);
    if (nbSearch.trim()) query = query.ilike('patrimonio', `%${nbSearch.trim()}%`);
    const { data } = await query;
    setNotebooks((data as Notebook[]) || []);
    setNbLoading(false);
  };

  const fetchMaterials = async () => {
    setMatLoading(true);
    let query = supabase.from('materials').select('*').order('nome');
    if (matSearch.trim()) query = query.or(`nome.ilike.%${matSearch.trim()}%,patrimonio.ilike.%${matSearch.trim()}%,codigo_material.ilike.%${matSearch.trim()}%`);
    const { data } = await query;
    setMaterials((data as Material[]) || []);
    setMatLoading(false);
  };

  useEffect(() => { fetchNotebooks(); }, [nbFilterSecao, nbFilterStatus, nbSearch]);
  useEffect(() => { fetchMaterials(); }, [matSearch]);

  const handlePrint = () => {
    setPrintMode(true);
    setTimeout(() => {
      window.print();
      setTimeout(() => setPrintMode(false), 500);
    }, 100);
  };

  const baseUrl = window.location.origin;
  const dataAtual = format(new Date(), "dd 'de' MMMM 'de' yyyy", { locale: ptBR });
  const horaAtual = format(new Date(), 'HH:mm');

  // Full-screen print mode
  if (printMode) {
    return (
      <div className="fixed inset-0 z-[100] bg-white text-black overflow-auto" style={{ fontFamily: "'DM Sans', Arial, sans-serif" }}>
        <div className="max-w-[210mm] mx-auto p-[15mm]">
          {/* Header */}
          <div className="text-center border-b-2 border-black pb-4 mb-6">
            <h1 className="text-xl font-bold uppercase">Seção de Informática — 14° B Log</h1>
            <h2 className="text-lg font-semibold mt-1 uppercase">
              {tab === 'notebooks' ? 'Relatório de Notebooks' : 'Relatório de Material Carga'}
            </h2>
            <p className="text-xs mt-2 text-gray-600">Data: {dataAtual} — Hora: {horaAtual}</p>
            {tab === 'notebooks' && nbFilterSecao !== 'all' && <p className="text-xs font-semibold mt-1">Seção: {nbFilterSecao}</p>}
            {tab === 'notebooks' && nbFilterStatus !== 'all' && <p className="text-xs font-semibold mt-1">Status: {nbFilterStatus}</p>}
          </div>

          {/* Notebooks table */}
          {tab === 'notebooks' && notebooks.length > 0 && (
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="bg-gray-200">
                  <th className="border border-gray-400 px-2 py-1.5 text-left font-semibold">#</th>
                  <th className="border border-gray-400 px-2 py-1.5 text-left font-semibold">Patrimônio</th>
                  <th className="border border-gray-400 px-2 py-1.5 text-left font-semibold">Modelo</th>
                  <th className="border border-gray-400 px-2 py-1.5 text-left font-semibold">Seção</th>
                  <th className="border border-gray-400 px-2 py-1.5 text-left font-semibold">Militar</th>
                  <th className="border border-gray-400 px-2 py-1.5 text-left font-semibold">Status</th>
                  {nbIncludeQR && <th className="border border-gray-400 px-2 py-1.5 text-left font-semibold">QR</th>}
                </tr>
              </thead>
              <tbody>
                {notebooks.map((nb, i) => (
                  <tr key={nb.id} className={i % 2 === 1 ? 'bg-gray-50' : ''}>
                    <td className="border border-gray-300 px-2 py-1">{i + 1}</td>
                    <td className="border border-gray-300 px-2 py-1 font-mono font-semibold">{nb.patrimonio}</td>
                    <td className="border border-gray-300 px-2 py-1">{nb.modelo}</td>
                    <td className="border border-gray-300 px-2 py-1">{nb.secao}</td>
                    <td className="border border-gray-300 px-2 py-1">{nb.militar}</td>
                    <td className="border border-gray-300 px-2 py-1">{nb.status}</td>
                    {nbIncludeQR && <td className="border border-gray-300 px-2 py-1"><QRCodeSVG value={`${baseUrl}/consulta/${nb.patrimonio}`} size={40} /></td>}
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {/* Materials table */}
          {tab === 'materials' && materials.length > 0 && (
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="bg-gray-200">
                  <th className="border border-gray-400 px-2 py-1.5 text-left font-semibold">#</th>
                  <th className="border border-gray-400 px-2 py-1.5 text-left font-semibold">Patrimônio</th>
                  <th className="border border-gray-400 px-2 py-1.5 text-left font-semibold">Código do Material</th>
                  <th className="border border-gray-400 px-2 py-1.5 text-left font-semibold">Nº da Ficha</th>
                  <th className="border border-gray-400 px-2 py-1.5 text-left font-semibold">Nome</th>
                </tr>
              </thead>
              <tbody>
                {materials.map((m, i) => (
                  <tr key={m.id} className={i % 2 === 1 ? 'bg-gray-50' : ''}>
                    <td className="border border-gray-300 px-2 py-1">{i + 1}</td>
                    <td className="border border-gray-300 px-2 py-1 font-mono">{m.patrimonio}</td>
                    <td className="border border-gray-300 px-2 py-1 font-mono">{m.codigo_material}</td>
                    <td className="border border-gray-300 px-2 py-1 font-mono">{m.numero_ficha}</td>
                    <td className="border border-gray-300 px-2 py-1">{m.nome}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {/* Footer */}
          <div className="mt-8 text-center text-[10px] border-t border-gray-400 pt-4">
            <p>Total de registros: {tab === 'notebooks' ? notebooks.length : materials.length}</p>
            <p className="mt-1">Documento gerado pela Seção de Informática — 14° B Log</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 px-4 animate-in-page">
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2.5 text-lg">
              <div className="p-2 rounded-lg bg-primary/10">
                <Printer className="h-4 w-4 text-primary" />
              </div>
              Impressão de Relatórios
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs value={tab} onValueChange={setTab}>
              <TabsList className="mb-4">
                <TabsTrigger value="notebooks" className="transition-all duration-200"><Laptop className="h-3.5 w-3.5 mr-1.5" />Notebooks</TabsTrigger>
                <TabsTrigger value="materials" className="transition-all duration-200"><Package className="h-3.5 w-3.5 mr-1.5" />Material Carga</TabsTrigger>
              </TabsList>

              <TabsContent value="notebooks" className="animate-in-card">
                <div className="flex flex-col sm:flex-row gap-3 mb-4">
                  <div className="flex-1 relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/60" />
                    <Input placeholder="Buscar por patrimônio..." value={nbSearch} onChange={(e) => setNbSearch(e.target.value)} className="pl-9 h-9 bg-muted/30 border-border/60 focus:bg-background transition-all duration-200" />
                  </div>
                  <Select value={nbFilterSecao} onValueChange={setNbFilterSecao}>
                    <SelectTrigger className="w-full sm:w-[200px] h-9 bg-muted/30 border-border/60"><SelectValue placeholder="Seção" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todas as seções</SelectItem>
                      {sections.map((s) => (<SelectItem key={s.id} value={s.name}>{s.name}</SelectItem>))}
                    </SelectContent>
                  </Select>
                  <Select value={nbFilterStatus} onValueChange={setNbFilterStatus}>
                    <SelectTrigger className="w-full sm:w-[180px] h-9 bg-muted/30 border-border/60"><SelectValue placeholder="Status" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos os status</SelectItem>
                      <SelectItem value="Em uso">Em uso</SelectItem>
                      <SelectItem value="Em manutenção">Em manutenção</SelectItem>
                      <SelectItem value="Baixado">Baixado</SelectItem>
                      <SelectItem value="Em estoque">Em estoque</SelectItem>
                      <SelectItem value="Fora de Carga">Fora de Carga</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center gap-4 flex-wrap">
                  <div className="flex items-center gap-2">
                    <Checkbox id="include-qr" checked={nbIncludeQR} onCheckedChange={(v) => setNbIncludeQR(!!v)} />
                    <label htmlFor="include-qr" className="text-sm cursor-pointer">Incluir QR Code</label>
                  </div>
                  <Button onClick={handlePrint} disabled={nbLoading || notebooks.length === 0} className="shadow-sm transition-all duration-200">
                    <Printer className="h-3.5 w-3.5 mr-1.5" />Imprimir
                  </Button>
                  <span className="text-xs text-muted-foreground font-medium">{nbLoading ? 'Carregando...' : `${notebooks.length} registro(s)`}</span>
                </div>
              </TabsContent>

              <TabsContent value="materials" className="animate-in-card">
                <div className="flex flex-col sm:flex-row gap-3 mb-4">
                  <div className="flex-1 relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/60" />
                    <Input placeholder="Buscar por nome, patrimônio ou código..." value={matSearch} onChange={(e) => setMatSearch(e.target.value)} className="pl-9 h-9 bg-muted/30 border-border/60 focus:bg-background transition-all duration-200" />
                  </div>
                  <Button onClick={handlePrint} disabled={matLoading || materials.length === 0} className="shadow-sm transition-all duration-200">
                    <Printer className="h-3.5 w-3.5 mr-1.5" />Imprimir
                  </Button>
                  <span className="text-xs text-muted-foreground font-medium">{matLoading ? 'Carregando...' : `${materials.length} registro(s)`}</span>
                </div>
              </TabsContent>
            </Tabs>

            {/* Preview table (screen only) */}
            <div className="mt-6">
              {tab === 'notebooks' && !nbLoading && notebooks.length > 0 && (
                <div className="rounded-xl border border-border/50 overflow-x-auto">
                  <table className="w-full text-sm border-collapse">
                    <thead>
                      <tr className="bg-muted/40">
                        <th className="border-b border-border/50 px-3 py-2 text-left font-semibold text-[10px] uppercase tracking-widest text-muted-foreground">#</th>
                        <th className="border-b border-border/50 px-3 py-2 text-left font-semibold text-[10px] uppercase tracking-widest text-muted-foreground">Patrimônio</th>
                        <th className="border-b border-border/50 px-3 py-2 text-left font-semibold text-[10px] uppercase tracking-widest text-muted-foreground">Modelo</th>
                        <th className="border-b border-border/50 px-3 py-2 text-left font-semibold text-[10px] uppercase tracking-widest text-muted-foreground">Seção</th>
                        <th className="border-b border-border/50 px-3 py-2 text-left font-semibold text-[10px] uppercase tracking-widest text-muted-foreground">Militar</th>
                        <th className="border-b border-border/50 px-3 py-2 text-left font-semibold text-[10px] uppercase tracking-widest text-muted-foreground">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {notebooks.slice(0, 20).map((nb, i) => (
                        <tr key={nb.id} className="hover:bg-muted/30 transition-colors border-b border-border/30 last:border-0">
                          <td className="px-3 py-1.5 text-muted-foreground">{i + 1}</td>
                          <td className="px-3 py-1.5 font-mono font-semibold">{nb.patrimonio}</td>
                          <td className="px-3 py-1.5">{nb.modelo}</td>
                          <td className="px-3 py-1.5 text-muted-foreground">{nb.secao}</td>
                          <td className="px-3 py-1.5 text-muted-foreground">{nb.militar}</td>
                          <td className="px-3 py-1.5">{nb.status}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {notebooks.length > 20 && (
                    <p className="text-xs text-muted-foreground text-center py-2">Mostrando 20 de {notebooks.length} registros (todos serão impressos)</p>
                  )}
                </div>
              )}

              {tab === 'materials' && !matLoading && materials.length > 0 && (
                <div className="rounded-xl border border-border/50 overflow-x-auto">
                  <table className="w-full text-sm border-collapse">
                    <thead>
                      <tr className="bg-muted/40">
                        <th className="border-b border-border/50 px-3 py-2 text-left font-semibold text-[10px] uppercase tracking-widest text-muted-foreground">#</th>
                        <th className="border-b border-border/50 px-3 py-2 text-left font-semibold text-[10px] uppercase tracking-widest text-muted-foreground">Patrimônio</th>
                        <th className="border-b border-border/50 px-3 py-2 text-left font-semibold text-[10px] uppercase tracking-widest text-muted-foreground">Código Material</th>
                        <th className="border-b border-border/50 px-3 py-2 text-left font-semibold text-[10px] uppercase tracking-widest text-muted-foreground">Nº Ficha</th>
                        <th className="border-b border-border/50 px-3 py-2 text-left font-semibold text-[10px] uppercase tracking-widest text-muted-foreground">Nome</th>
                      </tr>
                    </thead>
                    <tbody>
                      {materials.slice(0, 20).map((m, i) => (
                        <tr key={m.id} className="hover:bg-muted/30 transition-colors border-b border-border/30 last:border-0">
                          <td className="px-3 py-1.5 text-muted-foreground">{i + 1}</td>
                          <td className="px-3 py-1.5 font-mono">{m.patrimonio}</td>
                          <td className="px-3 py-1.5 font-mono">{m.codigo_material}</td>
                          <td className="px-3 py-1.5 font-mono">{m.numero_ficha}</td>
                          <td className="px-3 py-1.5">{m.nome}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {materials.length > 20 && (
                    <p className="text-xs text-muted-foreground text-center py-2">Mostrando 20 de {materials.length} registros (todos serão impressos)</p>
                  )}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
    </div>
  );
}
