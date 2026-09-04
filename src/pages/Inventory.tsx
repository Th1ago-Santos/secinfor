import { useState, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { ClipboardCheck, CheckCircle, XCircle, AlertTriangle, Printer, Play, Square } from 'lucide-react';
import { toast } from 'sonner';
import { useSections } from '@/hooks/useSections';
import { useUserRole } from '@/hooks/useUserRole';
import PageTransition from '@/components/PageTransition';
import PageHeader from '@/components/PageHeader';

type InventoryItem = {
  patrimonio: string;
  status: string;
  conferido_em: string;
  item_tipo: string | null;
  found_name?: string;
};

export default function Inventory() {
  const { user } = useAuth();
  const { sections } = useSections();
  const { sectionScope } = useUserRole();
  const inputRef = useRef<HTMLInputElement>(null);

  const [sessionId, setSessionId] = useState<string | null>(null);
  const [sessionActive, setSessionActive] = useState(false);
  const [secaoAlvo, setSecaoAlvo] = useState('all');
  // Chefe de seção: sessão sempre travada na própria seção
  const effectiveSecao = sectionScope || (secaoAlvo !== 'all' ? secaoAlvo : null);
  const [patrimonio, setPatrimonio] = useState('');
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [showReport, setShowReport] = useState(false);
  const [expectedNotebooks, setExpectedNotebooks] = useState<string[]>([]);
  const [expectedMaterials, setExpectedMaterials] = useState<string[]>([]);

  const startSession = async () => {
    if (!user) return;
    setLoading(true);
    const { data, error } = await supabase
      .from('inventory_sessions')
      .insert([{ usuario_id: user.id, secao_alvo: effectiveSecao, status: 'em_andamento' }] as any)
      .select().single();
    if (error) { toast.error('Erro ao iniciar sessão.'); }
    else {
      setSessionId((data as any).id);
      setSessionActive(true);
      setItems([]);
      setShowReport(false);
      toast.success('Sessão de inventário iniciada.');
      setTimeout(() => inputRef.current?.focus(), 100);
    }
    setLoading(false);
  };

  const confirmItem = async () => {
    if (!patrimonio.trim() || !sessionId || !user) return;
    const pat = patrimonio.trim();
    if (items.some(i => i.patrimonio === pat)) {
      toast.warning('Este patrimônio já foi conferido nesta sessão.');
      setPatrimonio('');
      return;
    }

    let itemTipo: string | null = null;
    let itemId: string | null = null;
    let foundName = '';
    let status = 'conferido';

    const { data: nb } = await supabase.from('notebooks').select('id, modelo, patrimonio').eq('patrimonio', pat).single();
    if (nb) { itemTipo = 'notebook'; itemId = (nb as any).id; foundName = (nb as any).modelo; }
    else {
      const { data: mat } = await supabase.from('materials').select('id, nome, patrimonio').eq('patrimonio', pat).single();
      if (mat) { itemTipo = 'material'; itemId = (mat as any).id; foundName = (mat as any).nome; }
      else { status = 'divergencia'; }
    }

    const { error } = await supabase.from('inventory_items').insert([{
      session_id: sessionId, patrimonio: pat, item_tipo: itemTipo, item_id: itemId, usuario_id: user.id, status,
    }] as any);

    if (error) { toast.error('Erro ao registrar item.'); }
    else {
      setItems(prev => [{ patrimonio: pat, status, conferido_em: new Date().toISOString(), item_tipo: itemTipo, found_name: foundName || undefined }, ...prev]);
      if (status === 'divergencia') toast.warning(`Patrimônio "${pat}" não encontrado no sistema.`);
      else toast.success(`Conferido: ${pat} (${foundName})`);
    }
    setPatrimonio('');
    inputRef.current?.focus();
  };

  const finishSession = async () => {
    if (!sessionId) return;
    await supabase.from('inventory_sessions').update({ status: 'finalizado', data_fim: new Date().toISOString() } as any).eq('id', sessionId);
    const secFilter = effectiveSecao;
    let nbQuery = supabase.from('notebooks').select('patrimonio');
    if (secFilter) nbQuery = nbQuery.eq('secao', secFilter);
    const { data: nbs } = await nbQuery;
    // Material Carga já possui vínculo de seção (section_name); RLS limita chefe_secao
    let matQuery = supabase.from('materials').select('patrimonio');
    if (secFilter) matQuery = matQuery.eq('section_name', secFilter);
    const { data: mats } = await matQuery;
    setExpectedNotebooks((nbs || []).map((n: any) => n.patrimonio));
    setExpectedMaterials((mats || []).map((m: any) => m.patrimonio));
    setSessionActive(false);
    setShowReport(true);
    toast.success('Sessão finalizada.');
  };

  const conferidos = items.filter(i => i.status === 'conferido');
  const divergencias = items.filter(i => i.status === 'divergencia');
  const conferidosPatrimonios = new Set(conferidos.map(i => i.patrimonio));
  const naoConferidos = [
    ...expectedNotebooks.filter(p => !conferidosPatrimonios.has(p)).map(p => ({ patrimonio: p, tipo: 'Notebook' })),
    ...expectedMaterials.filter(p => !conferidosPatrimonios.has(p)).map(p => ({ patrimonio: p, tipo: 'Material' })),
  ];

  const handleKeyDown = (e: React.KeyboardEvent) => { if (e.key === 'Enter') { e.preventDefault(); confirmItem(); } };

  return (
    <PageTransition>
      <div className="container mx-auto py-6 px-4 max-w-4xl">
        <PageHeader
          icon={ClipboardCheck}
          title="Modo Inventário"
          description="Conferência de patrimônios por sessão"
        />

        <Card className="shadow-card border-border/50">
          <CardContent className="pt-5">
            {!sessionActive && !showReport && (
              <div className="space-y-5">
                <p className="text-sm text-muted-foreground">
                  Inicie uma sessão de inventário para conferir itens por patrimônio.
                </p>
                <div className="flex flex-col sm:flex-row gap-3 items-end">
                  <div className="flex-1 w-full">
                    <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-widest mb-1.5 block">
                      {sectionScope ? 'Seção alvo' : 'Seção alvo (opcional)'}
                    </label>
                    {sectionScope ? (
                      <div className="h-9 flex items-center rounded-md border border-border/50 bg-muted/30 px-3 text-sm">
                        {sectionScope}
                      </div>
                    ) : (
                      <Select value={secaoAlvo} onValueChange={setSecaoAlvo}>
                        <SelectTrigger className="h-9 bg-muted/30 border-border/50"><SelectValue placeholder="Todas" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Todas as seções</SelectItem>
                          {sections.map((s) => (<SelectItem key={s.id} value={s.name}>{s.name}</SelectItem>))}
                        </SelectContent>
                      </Select>
                    )}
                  </div>
                  <Button onClick={startSession} disabled={loading} className="gradient-primary border-0 shadow-glow hover:opacity-90 transition-all duration-300">
                    <Play className="h-4 w-4 mr-1.5" />
                    Iniciar Sessão
                  </Button>
                </div>
              </div>
            )}

            {sessionActive && (
              <div className="space-y-4">
                <div className="flex gap-3">
                  <Input
                    ref={inputRef}
                    placeholder="Digite ou escaneie o patrimônio..."
                    value={patrimonio}
                    onChange={(e) => setPatrimonio(e.target.value)}
                    onKeyDown={handleKeyDown}
                    className="flex-1 font-mono text-lg h-12 bg-muted/30 border-border/50 focus:bg-background focus:border-primary/50 focus:shadow-glow transition-all duration-300"
                    autoFocus
                  />
                  <Button onClick={confirmItem} disabled={!patrimonio.trim()} className="h-12 px-6 gradient-primary border-0 shadow-glow hover:opacity-90 transition-all duration-300">
                    <CheckCircle className="h-4 w-4 mr-1.5" />
                    Confirmar
                  </Button>
                </div>

                <div className="flex gap-3 items-center flex-wrap">
                  <Badge variant="outline" className="text-sm font-medium">{items.length} conferidos</Badge>
                  {divergencias.length > 0 && (
                    <Badge variant="destructive" className="text-sm font-medium">{divergencias.length} divergências</Badge>
                  )}
                  <div className="flex-1" />
                  <Button variant="secondary" onClick={finishSession} className="transition-all duration-200">
                    <Square className="h-4 w-4 mr-1.5" />
                    Finalizar Sessão
                  </Button>
                </div>

                {items.length > 0 && (
                  <div className="rounded-xl border border-border/50 overflow-x-auto max-h-80 overflow-y-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-muted/40 hover:bg-muted/40 border-b border-border/50">
                          <TableHead className="font-semibold text-[10px] uppercase tracking-widest text-muted-foreground">Patrimônio</TableHead>
                          <TableHead className="font-semibold text-[10px] uppercase tracking-widest text-muted-foreground">Tipo</TableHead>
                          <TableHead className="font-semibold text-[10px] uppercase tracking-widest text-muted-foreground hidden sm:table-cell">Descrição</TableHead>
                          <TableHead className="font-semibold text-[10px] uppercase tracking-widest text-muted-foreground">Status</TableHead>
                          <TableHead className="font-semibold text-[10px] uppercase tracking-widest text-muted-foreground">Hora</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {items.map((item, idx) => (
                          <TableRow key={idx} className="hover:bg-muted/30 transition-colors duration-200 border-b border-border/30 last:border-0">
                            <TableCell className="font-mono font-semibold text-sm">{item.patrimonio}</TableCell>
                            <TableCell className="text-sm capitalize text-muted-foreground">{item.item_tipo || '—'}</TableCell>
                            <TableCell className="text-sm hidden sm:table-cell text-muted-foreground">{item.found_name || '—'}</TableCell>
                            <TableCell>
                              {item.status === 'conferido' ? (
                                <Badge variant="default" className="text-[10px] font-medium"><CheckCircle className="h-3 w-3 mr-1" />OK</Badge>
                              ) : (
                                <Badge variant="destructive" className="text-[10px] font-medium"><AlertTriangle className="h-3 w-3 mr-1" />Divergência</Badge>
                              )}
                            </TableCell>
                            <TableCell className="text-xs text-muted-foreground">{new Date(item.conferido_em).toLocaleTimeString('pt-BR')}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </div>
            )}

            {showReport && (
              <div className="space-y-6">
                <div className="flex items-center justify-between flex-wrap gap-3">
                  <h3 className="text-lg font-bold">Relatório do Inventário</h3>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => window.print()} className="transition-all duration-200">
                      <Printer className="h-3.5 w-3.5 mr-1.5" />Imprimir
                    </Button>
                    <Button size="sm" onClick={() => { setShowReport(false); setSessionId(null); setItems([]); }} className="gradient-primary border-0 transition-all duration-200">
                      Nova Sessão
                    </Button>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <Card className="border-success/20 kpi-card">
                    <CardContent className="pt-5 text-center">
                      <div className="mx-auto w-12 h-12 rounded-xl bg-success/10 flex items-center justify-center mb-2">
                        <CheckCircle className="h-6 w-6 text-success" />
                      </div>
                      <p className="text-2xl font-bold">{conferidos.length}</p>
                      <p className="text-xs text-muted-foreground font-medium">Conferidos</p>
                    </CardContent>
                  </Card>
                  <Card className="border-warning/20 kpi-card">
                    <CardContent className="pt-5 text-center">
                      <div className="mx-auto w-12 h-12 rounded-xl bg-warning/10 flex items-center justify-center mb-2">
                        <XCircle className="h-6 w-6 text-warning" />
                      </div>
                      <p className="text-2xl font-bold">{naoConferidos.length}</p>
                      <p className="text-xs text-muted-foreground font-medium">Não Conferidos</p>
                    </CardContent>
                  </Card>
                  <Card className="border-destructive/20 kpi-card">
                    <CardContent className="pt-5 text-center">
                      <div className="mx-auto w-12 h-12 rounded-xl bg-destructive/10 flex items-center justify-center mb-2">
                        <AlertTriangle className="h-6 w-6 text-destructive" />
                      </div>
                      <p className="text-2xl font-bold">{divergencias.length}</p>
                      <p className="text-xs text-muted-foreground font-medium">Divergências</p>
                    </CardContent>
                  </Card>
                </div>

                {naoConferidos.length > 0 && (
                  <div>
                    <h4 className="font-semibold mb-2 flex items-center gap-1.5 text-sm">
                      <XCircle className="h-4 w-4 text-warning" />
                      Itens Não Conferidos
                    </h4>
                    <div className="rounded-xl border border-border/50 overflow-x-auto max-h-52 overflow-y-auto">
                      <Table>
                        <TableHeader><TableRow className="bg-muted/40 hover:bg-muted/40"><TableHead className="font-semibold text-[10px] uppercase tracking-widest text-muted-foreground">Patrimônio</TableHead><TableHead className="font-semibold text-[10px] uppercase tracking-widest text-muted-foreground">Tipo</TableHead></TableRow></TableHeader>
                        <TableBody>
                          {naoConferidos.map((item, idx) => (
                            <TableRow key={idx} className="hover:bg-muted/30 transition-colors duration-200 border-b border-border/30 last:border-0"><TableCell className="font-mono text-sm">{item.patrimonio}</TableCell><TableCell className="text-sm text-muted-foreground">{item.tipo}</TableCell></TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                )}

                {divergencias.length > 0 && (
                  <div>
                    <h4 className="font-semibold mb-2 flex items-center gap-1.5 text-sm">
                      <AlertTriangle className="h-4 w-4 text-destructive" />
                      Divergências (patrimônios não cadastrados)
                    </h4>
                    <div className="rounded-xl border border-border/50 overflow-x-auto">
                      <Table>
                        <TableHeader><TableRow className="bg-muted/40 hover:bg-muted/40"><TableHead className="font-semibold text-[10px] uppercase tracking-widest text-muted-foreground">Patrimônio</TableHead><TableHead className="font-semibold text-[10px] uppercase tracking-widest text-muted-foreground">Hora</TableHead></TableRow></TableHeader>
                        <TableBody>
                          {divergencias.map((item, idx) => (
                            <TableRow key={idx} className="hover:bg-muted/30 transition-colors duration-200 border-b border-border/30 last:border-0"><TableCell className="font-mono text-sm">{item.patrimonio}</TableCell><TableCell className="text-xs text-muted-foreground">{new Date(item.conferido_em).toLocaleTimeString('pt-BR')}</TableCell></TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </PageTransition>
  );
}
