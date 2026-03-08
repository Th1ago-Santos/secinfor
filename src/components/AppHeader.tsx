import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { LogOut, Monitor, Printer, Package, Search, ClipboardCheck, Laptop, Menu, X, BarChart3, ArrowRightLeft, Bell, Map, Settings } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import ThemeToggle from '@/components/ThemeToggle';

export default function AppHeader() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchQuery, setSearchQuery] = useState('');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [alertCount, setAlertCount] = useState(0);

  useEffect(() => {
    supabase.from('alerts').select('*', { count: 'exact', head: true }).eq('status', 'ativo')
      .then(({ count }) => setAlertCount(count || 0));
  }, [location.pathname]);

  const handleLogout = async () => {
    await signOut();
    navigate('/login');
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/pesquisa?q=${encodeURIComponent(searchQuery.trim())}`);
      setSearchQuery('');
    }
  };

  const navItems = [
    { label: 'Dashboard', path: '/', icon: BarChart3 },
    { label: 'Notebooks', path: '/notebooks', icon: Laptop },
    { label: 'Material Carga', path: '/materiais', icon: Package },
    { label: 'Movimentações', path: '/movimentacoes', icon: ArrowRightLeft },
    { label: 'Inventário', path: '/inventario', icon: ClipboardCheck },
    { label: 'Mapa Seções', path: '/mapa-secoes', icon: Map },
    { label: 'Seções', path: '/secoes', icon: Settings },
    { label: 'Impressão', path: '/impressao', icon: Printer },
  ];

  const isActive = (path: string) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
  };

  return (
    <header className="bg-sidebar text-sidebar-foreground shadow-xl no-print sticky top-0 z-50 border-b border-sidebar-border">
      <div className="container mx-auto flex items-center justify-between py-2 px-4">
        <div className="flex items-center gap-3 cursor-pointer group" onClick={() => navigate('/')}>
          <div className="p-1.5 rounded-lg bg-primary/20 group-hover:bg-primary/30 transition-all duration-200">
            <Monitor className="h-5 w-5 text-primary" />
          </div>
          <div className="hidden sm:block">
            <h1 className="text-sm font-bold tracking-tight leading-tight">Seção de Informática</h1>
            <p className="text-[10px] text-sidebar-foreground/50 leading-tight">14° B Log</p>
          </div>
        </div>

        {/* Global search */}
        <form onSubmit={handleSearch} className="hidden md:flex items-center mx-4 flex-1 max-w-xs">
          <div className="relative w-full">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-sidebar-foreground/40" />
            <Input
              placeholder="Pesquisa global..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 h-8 bg-sidebar-accent/50 border-sidebar-border text-sidebar-foreground placeholder:text-sidebar-foreground/30 text-xs focus:bg-sidebar-accent focus:ring-primary/50 transition-all duration-200"
            />
          </div>
        </form>

        {/* Desktop nav */}
        <nav className="hidden lg:flex items-center gap-0.5">
          {navItems.map((item) => (
            <Button
              key={item.path}
              variant="ghost"
              size="sm"
              onClick={() => navigate(item.path)}
              className={`text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent transition-all duration-200 relative h-8 px-2 text-[11px] font-medium ${
                isActive(item.path)
                  ? 'bg-sidebar-accent text-sidebar-foreground font-semibold'
                  : ''
              }`}
            >
              <item.icon className="h-3.5 w-3.5 mr-1" />
              {item.label}
              {isActive(item.path) && (
                <span className="absolute bottom-0 left-2 right-2 h-0.5 bg-primary rounded-full" />
              )}
            </Button>
          ))}

          {/* Alerts bell */}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('/alertas')}
            className={`text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent transition-all duration-200 h-8 w-8 relative ${
              isActive('/alertas') ? 'bg-sidebar-accent text-sidebar-foreground' : ''
            }`}
          >
            <Bell className="h-4 w-4" />
            {alertCount > 0 && (
              <Badge variant="destructive" className="absolute -top-1 -right-1 h-4 min-w-4 px-1 text-[9px] flex items-center justify-center animate-scale-in">
                {alertCount}
              </Badge>
            )}
          </Button>

          <div className="w-px h-5 bg-sidebar-border mx-1" />
          <ThemeToggle />
          {user?.email && (
            <span className="text-[10px] text-sidebar-foreground/40 mx-1.5 max-w-[90px] truncate hidden xl:inline">
              {user.email}
            </span>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={handleLogout}
            className="text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent transition-all duration-200 h-8 px-2"
          >
            <LogOut className="h-3.5 w-3.5" />
          </Button>
        </nav>

        {/* Mobile menu button */}
        <div className="flex items-center gap-1 lg:hidden">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('/alertas')}
            className="text-sidebar-foreground/70 hover:bg-sidebar-accent h-8 w-8 relative"
          >
            <Bell className="h-4 w-4" />
            {alertCount > 0 && (
              <Badge variant="destructive" className="absolute -top-1 -right-1 h-4 min-w-4 px-1 text-[9px] flex items-center justify-center">
                {alertCount}
              </Badge>
            )}
          </Button>
          <ThemeToggle />
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="text-sidebar-foreground/70 hover:bg-sidebar-accent h-8 w-8"
          >
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileMenuOpen && (
        <div className="lg:hidden border-t border-sidebar-border animate-in-page">
          <div className="container mx-auto px-4 py-3 space-y-1">
            <form onSubmit={(e) => { handleSearch(e); setMobileMenuOpen(false); }} className="mb-3 md:hidden">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-sidebar-foreground/40" />
                <Input
                  placeholder="Pesquisa global..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8 h-9 bg-sidebar-accent/50 border-sidebar-border text-sidebar-foreground placeholder:text-sidebar-foreground/30 text-sm"
                />
              </div>
            </form>
            {navItems.map((item) => (
              <Button
                key={item.path}
                variant="ghost"
                size="sm"
                onClick={() => { navigate(item.path); setMobileMenuOpen(false); }}
                className={`w-full justify-start text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent transition-all duration-200 h-10 ${
                  isActive(item.path) ? 'bg-sidebar-accent text-sidebar-foreground font-semibold' : ''
                }`}
              >
                <item.icon className="h-4 w-4 mr-2.5" />
                {item.label}
              </Button>
            ))}
            <div className="border-t border-sidebar-border pt-2 mt-2">
              {user?.email && (
                <p className="text-[10px] text-sidebar-foreground/40 px-3 mb-1.5">{user.email}</p>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={handleLogout}
                className="w-full justify-start text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent h-10"
              >
                <LogOut className="h-4 w-4 mr-2.5" />
                Sair
              </Button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
