import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { ClipboardCheck, CheckCircle, XCircle, AlertTriangle, Printer } from 'lucide-react';
import { toast } from 'sonner';
import AppHeader from '@/components/AppHeader';
import { useSections } from '@/hooks/useSections';

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
  const inputRef = useRef<HTMLInputElement>(null);

  const [sessionId, setSessionId] = useState<string | null>(null);
  const [sessionActive, setSessionActive] = useState(false);
  const [secaoAlvo, setSecaoAlvo] = useState('all');
  const [patrimonio, setPatrimonio] = useState('');
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(false);

  // Report state
  const [showReport, setShowReport] = useState(false);
  const [expectedNotebooks, setExpectedNotebooks] = useState<string[]>([]);
  const [expectedMaterials, setExpectedMaterials] = useState<string[]>([]);

  const startSession = async () => {
    if (!user) return;
    setLoading(true);
    const { data, error } = await supabase
      .from('inventory_sessions')
      .insert([{
        usuario_id: user.id,
        secao_alvo: secaoAlvo !== 'all' ? secaoAlvo : null,
        status: 'em_andamento',
      }] as any)
      .select()
      .single();

    if (error) {
      toast.error('Erro ao iniciar sessão.');
    } else {
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

    // Check if already confirmed this session
    if (items.some(i => i.patrimonio === pat)) {
      toast.warning('Este patrimônio já foi conferido nesta sessão.');
      setPatrimonio('');
      return;
    }

    // Search in notebooks first, then materials
    let itemTipo: string | null = null;
    let itemId: string | null = null;
    let foundName = '';
    let status = 'conferido';

    const { data: nb } = await supabase.from('notebooks').select('id, modelo, patrimonio').eq('patrimonio', pat).single();
    if (nb) {
      itemTipo = 'notebook';
      itemId = (nb as any).id;
      foundName = (nb as any).modelo;
    } else {
      const { data: mat } = await supabase.from('materials').select('id, nome, patrimonio').eq('patrimonio', pat).single();
      if (mat) {
        itemTipo = 'material';
        itemId = (mat as any).id;
        foundName = (mat as any).nome;
      } else {
        status = 'divergencia';
      }
    }

    const { error } = await supabase.from('inventory_items').insert([{
      session_id: sessionId,
      patrimonio: pat,
      item_tipo: itemTipo,
      item_id: itemId,
      usuario_id: user.id,
      status,
    }] as any);

    if (error) {
      toast.error('Erro ao registrar item.');
    } else {
      setItems(prev => [{
        patrimonio: pat,
        status,
        conferido_em: new Date().toISOString(),
        item_tipo: itemTipo,
        found_name: foundName || undefined,
      }, ...prev]);

      if (status === 'divergencia') {
        toast.warning(`Patrimônio "${pat}" não encontrado no sistema.`);
      } else {
        toast.success(`Conferido: ${pat} (${foundName})`);
      }
    }
    setPatrimonio('');
    inputRef.current?.focus();
  };

  const finishSession = async () => {
    if (!sessionId) return;
    await supabase
      .from('inventory_sessions')
      .update({ status: 'finalizado', data_fim: new Date().toISOString() } as any)
      .eq('id', sessionId);

    // Load expected items for report
    const secFilter = secaoAlvo !== 'all' ? secaoAlvo : null;
    let nbQuery = supabase.from('notebooks').select('patrimonio');
    if (secFilter) nbQuery = nbQuery.eq('secao', secFilter);
    const { data: nbs } = await nbQuery;

    let matQuery = supabase.from('materials').select('patrimonio');
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

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      confirmItem();
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <main className="container mx-auto py-6 px-4 max-w-4xl">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ClipboardCheck className="h-5 w-5 text-primary" />
              Modo Inventário
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!sessionActive && !showReport && (
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Inicie uma sessão de inventário para conferir itens por patrimônio.
                </p>
                <div className="flex gap-3 items-end">
                  <div className="flex-1">
                    <label className="text-sm font-medium mb-1 block">Seção alvo (opcional)</label>
                    <Select value={secaoAlvo} onValueChange={setSecaoAlvo}>
                      <SelectTrigger>
                        <SelectValue placeholder="Todas" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todas as seções</SelectItem>
                        {sections.map((s) => (
                          <SelectItem key={s.id} value={s.name}>{s.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <Button onClick={startSession} disabled={loading}>
                    <ClipboardCheck className="h-4 w-4 mr-1" />
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
                    className="flex-1 font-mono text-lg"
                    autoFocus
                  />
                  <Button onClick={confirmItem} disabled={!patrimonio.trim()}>
                    <CheckCircle className="h-4 w-4 mr-1" />
                    Confirmar
                  </Button>
                </div>

                <div className="flex gap-3 items-center">
                  <Badge variant="outline">{items.length} conferidos</Badge>
                  {divergencias.length > 0 && (
                    <Badge variant="destructive">{divergencias.length} divergências</Badge>
                  )}
                  <div className="flex-1" />
                  <Button variant="secondary" onClick={finishSession}>
                    Finalizar Sessão
                  </Button>
                </div>

                {items.length > 0 && (
                  <div className="rounded-md border overflow-x-auto max-h-96 overflow-y-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-muted/50">
                          <TableHead>Patrimônio</TableHead>
                          <TableHead>Tipo</TableHead>
                          <TableHead>Descrição</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Hora</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {items.map((item, idx) => (
                          <TableRow key={idx}>
                            <TableCell className="font-mono font-medium">{item.patrimonio}</TableCell>
                            <TableCell>{item.item_tipo || '—'}</TableCell>
                            <TableCell>{item.found_name || '—'}</TableCell>
                            <TableCell>
                              {item.status === 'conferido' ? (
                                <Badge variant="default"><CheckCircle className="h-3 w-3 mr-1" />OK</Badge>
                              ) : (
                                <Badge variant="destructive"><AlertTriangle className="h-3 w-3 mr-1" />Divergência</Badge>
                              )}
                            </TableCell>
                            <TableCell className="text-xs">{new Date(item.conferido_em).toLocaleTimeString('pt-BR')}</TableCell>
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
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold">Relatório do Inventário</h3>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => window.print()}>
                      <Printer className="h-4 w-4 mr-1" />
                      Imprimir
                    </Button>
                    <Button size="sm" onClick={() => { setShowReport(false); setSessionId(null); setItems([]); }}>
                      Nova Sessão
                    </Button>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <Card>
                    <CardContent className="pt-4 text-center">
                      <CheckCircle className="h-8 w-8 mx-auto text-success mb-2" />
                      <p className="text-2xl font-bold">{conferidos.length}</p>
                      <p className="text-sm text-muted-foreground">Conferidos</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-4 text-center">
                      <XCircle className="h-8 w-8 mx-auto text-accent mb-2" />
                      <p className="text-2xl font-bold">{naoConferidos.length}</p>
                      <p className="text-sm text-muted-foreground">Não Conferidos</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-4 text-center">
                      <AlertTriangle className="h-8 w-8 mx-auto text-destructive mb-2" />
                      <p className="text-2xl font-bold">{divergencias.length}</p>
                      <p className="text-sm text-muted-foreground">Divergências</p>
                    </CardContent>
                  </Card>
                </div>

                {naoConferidos.length > 0 && (
                  <div>
                    <h4 className="font-semibold mb-2 flex items-center gap-1">
                      <XCircle className="h-4 w-4 text-accent" />
                      Itens Não Conferidos
                    </h4>
                    <div className="rounded-md border overflow-x-auto max-h-64 overflow-y-auto">
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-muted/50">
                            <TableHead>Patrimônio</TableHead>
                            <TableHead>Tipo</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {naoConferidos.map((item, idx) => (
                            <TableRow key={idx}>
                              <TableCell className="font-mono">{item.patrimonio}</TableCell>
                              <TableCell>{item.tipo}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                )}

                {divergencias.length > 0 && (
                  <div>
                    <h4 className="font-semibold mb-2 flex items-center gap-1">
                      <AlertTriangle className="h-4 w-4 text-destructive" />
                      Divergências (patrimônios não cadastrados)
                    </h4>
                    <div className="rounded-md border overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-muted/50">
                            <TableHead>Patrimônio</TableHead>
                            <TableHead>Hora</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {divergencias.map((item, idx) => (
                            <TableRow key={idx}>
                              <TableCell className="font-mono">{item.patrimonio}</TableCell>
                              <TableCell className="text-xs">{new Date(item.conferido_em).toLocaleTimeString('pt-BR')}</TableCell>
                            </TableRow>
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
      </main>
    </div>
  );
}
