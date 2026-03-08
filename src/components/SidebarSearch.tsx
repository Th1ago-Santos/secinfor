import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Search, Laptop, Package, X } from 'lucide-react';

type SearchResult = {
  id: string;
  type: 'notebook' | 'material';
  title: string;
  subtitle: string;
  status?: string;
};

export default function SidebarSearch() {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    if (!query.trim() || query.trim().length < 2) {
      setResults([]);
      setOpen(false);
      return;
    }

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      const term = `%${query.trim()}%`;

      const [nbRes, matRes] = await Promise.all([
        supabase.from('notebooks')
          .select('id, patrimonio, modelo, secao, status')
          .or(`patrimonio.ilike.${term},modelo.ilike.${term},militar.ilike.${term}`)
          .limit(5),
        supabase.from('materials')
          .select('id, patrimonio, nome, codigo_material')
          .or(`patrimonio.ilike.${term},nome.ilike.${term},codigo_material.ilike.${term}`)
          .limit(5),
      ]);

      const mapped: SearchResult[] = [
        ...((nbRes.data || []) as any[]).map((n) => ({
          id: n.id,
          type: 'notebook' as const,
          title: n.patrimonio,
          subtitle: `${n.modelo} — ${n.secao}`,
          status: n.status,
        })),
        ...((matRes.data || []) as any[]).map((m) => ({
          id: m.id,
          type: 'material' as const,
          title: m.patrimonio,
          subtitle: m.nome,
        })),
      ];

      setResults(mapped);
      setOpen(mapped.length > 0);
      setLoading(false);
    }, 300);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (r: SearchResult) => {
    setQuery('');
    setOpen(false);
    if (r.type === 'notebook') {
      navigate(`/itens/${r.id}/editar`);
    } else {
      navigate(`/materiais/${r.id}/editar`);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      navigate(`/pesquisa?q=${encodeURIComponent(query.trim())}`);
      setQuery('');
      setOpen(false);
    }
  };

  return (
    <div ref={containerRef} className="relative px-1 mb-3">
      <form onSubmit={handleSubmit}>
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-sidebar-foreground/30" />
          <Input
            placeholder="Pesquisar..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => results.length > 0 && setOpen(true)}
            className="pl-8 pr-7 h-8 bg-sidebar-accent/40 border-sidebar-border/60 text-sidebar-foreground placeholder:text-sidebar-foreground/25 text-xs focus:bg-sidebar-accent focus:ring-1 focus:ring-primary/40 focus:border-primary/40 transition-all duration-300 rounded-lg"
          />
          {query && (
            <button
              type="button"
              onClick={() => { setQuery(''); setOpen(false); }}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-sidebar-foreground/30 hover:text-sidebar-foreground/60 transition-colors"
            >
              <X className="h-3 w-3" />
            </button>
          )}
        </div>
      </form>

      {/* Dropdown results */}
      {open && (
        <div className="absolute left-1 right-1 top-full mt-1 z-50 bg-sidebar-background border border-sidebar-border rounded-lg shadow-xl overflow-hidden animate-in-card">
          {results.map((r) => (
            <button
              key={`${r.type}-${r.id}`}
              onClick={() => handleSelect(r)}
              className="w-full flex items-center gap-2.5 px-3 py-2 text-left hover:bg-sidebar-accent/60 transition-colors duration-150 border-b border-sidebar-border/40 last:border-0"
            >
              <div className={`p-1 rounded-md shrink-0 ${r.type === 'notebook' ? 'bg-primary/10 text-primary' : 'bg-info/10 text-info'}`}>
                {r.type === 'notebook' ? <Laptop className="h-3 w-3" /> : <Package className="h-3 w-3" />}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold text-sidebar-foreground font-mono truncate">{r.title}</p>
                <p className="text-[10px] text-sidebar-foreground/50 truncate">{r.subtitle}</p>
              </div>
              {r.status && (
                <Badge variant="outline" className="text-[8px] px-1 py-0 shrink-0 border-sidebar-border text-sidebar-foreground/60">
                  {r.status}
                </Badge>
              )}
            </button>
          ))}
          {query.trim().length >= 2 && (
            <button
              onClick={handleSubmit as any}
              className="w-full px-3 py-2 text-[11px] text-primary font-medium hover:bg-sidebar-accent/40 transition-colors flex items-center gap-1.5"
            >
              <Search className="h-3 w-3" />
              Ver todos os resultados para "{query}"
            </button>
          )}
        </div>
      )}
    </div>
  );
}
