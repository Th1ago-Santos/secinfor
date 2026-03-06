import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { LogOut, Monitor, Settings, Printer, Package, Search, ClipboardCheck, Laptop, Menu, X } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import ThemeToggle from '@/components/ThemeToggle';

export default function AppHeader() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchQuery, setSearchQuery] = useState('');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

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
    { label: 'Notebooks', path: '/', icon: Laptop },
    { label: 'Material Carga', path: '/materiais', icon: Package },
    { label: 'Inventário', path: '/inventario', icon: ClipboardCheck },
    { label: 'Seções', path: '/secoes', icon: Settings },
    { label: 'Impressão', path: '/impressao', icon: Printer },
  ];

  const isActive = (path: string) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
  };

  return (
    <header className="bg-primary text-primary-foreground shadow-lg no-print sticky top-0 z-50">
      <div className="container mx-auto flex items-center justify-between py-2.5 px-4">
        <div className="flex items-center gap-3 cursor-pointer group" onClick={() => navigate('/')}>
          <div className="p-1.5 rounded-lg bg-primary-foreground/10 group-hover:bg-primary-foreground/15 transition-hover">
            <Monitor className="h-6 w-6" />
          </div>
          <div className="hidden sm:block">
            <h1 className="text-base font-bold tracking-tight leading-tight">Controle de Patrimônio</h1>
            <p className="text-[11px] text-primary-foreground/60 leading-tight">Sistema de Gestão</p>
          </div>
        </div>

        {/* Global search */}
        <form onSubmit={handleSearch} className="hidden md:flex items-center mx-4 flex-1 max-w-xs">
          <div className="relative w-full">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-primary-foreground/40" />
            <Input
              placeholder="Pesquisa global..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 h-8 bg-primary-foreground/10 border-primary-foreground/15 text-primary-foreground placeholder:text-primary-foreground/35 text-sm focus:bg-primary-foreground/15 transition-hover"
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
              className={`text-primary-foreground hover:bg-primary-foreground/10 transition-hover relative h-8 px-3 text-[13px] ${
                isActive(item.path) ? 'bg-primary-foreground/15 font-semibold' : 'font-normal'
              }`}
            >
              <item.icon className="h-4 w-4 mr-1.5" />
              {item.label}
              {isActive(item.path) && (
                <span className="absolute bottom-0 left-2 right-2 h-0.5 bg-primary-foreground/60 rounded-full" />
              )}
            </Button>
          ))}
          <div className="w-px h-6 bg-primary-foreground/15 mx-1" />
          <ThemeToggle />
          {user?.email && (
            <span className="text-[11px] text-primary-foreground/50 mx-1.5 max-w-[120px] truncate hidden xl:inline">
              {user.email}
            </span>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={handleLogout}
            className="text-primary-foreground hover:bg-primary-foreground/10 transition-hover h-8 px-2.5"
          >
            <LogOut className="h-4 w-4" />
          </Button>
        </nav>

        {/* Mobile menu button */}
        <div className="flex items-center gap-1 lg:hidden">
          <ThemeToggle />
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="text-primary-foreground hover:bg-primary-foreground/10 h-8 w-8"
          >
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileMenuOpen && (
        <div className="lg:hidden border-t border-primary-foreground/10 animate-in-page">
          <div className="container mx-auto px-4 py-3 space-y-1">
            {/* Mobile search */}
            <form onSubmit={(e) => { handleSearch(e); setMobileMenuOpen(false); }} className="mb-2 md:hidden">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-primary-foreground/40" />
                <Input
                  placeholder="Pesquisa global..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8 h-9 bg-primary-foreground/10 border-primary-foreground/15 text-primary-foreground placeholder:text-primary-foreground/35 text-sm"
                />
              </div>
            </form>
            {navItems.map((item) => (
              <Button
                key={item.path}
                variant="ghost"
                size="sm"
                onClick={() => { navigate(item.path); setMobileMenuOpen(false); }}
                className={`w-full justify-start text-primary-foreground hover:bg-primary-foreground/10 transition-hover h-10 ${
                  isActive(item.path) ? 'bg-primary-foreground/15 font-semibold' : ''
                }`}
              >
                <item.icon className="h-4 w-4 mr-2" />
                {item.label}
              </Button>
            ))}
            <div className="border-t border-primary-foreground/10 pt-2 mt-2">
              {user?.email && (
                <p className="text-[11px] text-primary-foreground/50 px-3 mb-1.5">{user.email}</p>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={handleLogout}
                className="w-full justify-start text-primary-foreground hover:bg-primary-foreground/10 h-10"
              >
                <LogOut className="h-4 w-4 mr-2" />
                Sair
              </Button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
