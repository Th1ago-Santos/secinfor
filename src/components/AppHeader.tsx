import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { LogOut, Monitor, Settings, Printer, Package, Search, ClipboardCheck } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import ThemeToggle from '@/components/ThemeToggle';

export default function AppHeader() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchQuery, setSearchQuery] = useState('');

  const handleLogout = async () => {
    await signOut();
    navigate('/login');
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/pesquisa?q=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  const navItems = [
    { label: 'Notebooks', path: '/' },
    { label: 'Material Carga', path: '/materiais', icon: Package },
    { label: 'Inventário', path: '/inventario', icon: ClipboardCheck },
    { label: 'Seções', path: '/secoes', icon: Settings },
    { label: 'Impressão', path: '/impressao', icon: Printer },
  ];

  return (
    <header className="bg-primary text-primary-foreground shadow-lg no-print">
      <div className="container mx-auto flex items-center justify-between py-3 px-4">
        <div className="flex items-center gap-3 cursor-pointer" onClick={() => navigate('/')}>
          <Monitor className="h-7 w-7" />
          <div className="hidden sm:block">
            <h1 className="text-lg font-bold tracking-tight">Controle de Patrimônio</h1>
            <p className="text-xs text-primary-foreground/70">Sistema de Gestão</p>
          </div>
        </div>

        {/* Global search */}
        <form onSubmit={handleSearch} className="hidden md:flex items-center mx-4 flex-1 max-w-xs">
          <div className="relative w-full">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-primary-foreground/50" />
            <Input
              placeholder="Pesquisa global..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 h-8 bg-primary-foreground/10 border-primary-foreground/20 text-primary-foreground placeholder:text-primary-foreground/40 text-sm"
            />
          </div>
        </form>

        <nav className="flex items-center gap-1">
          {navItems.map((item) => (
            <Button
              key={item.path}
              variant="ghost"
              size="sm"
              onClick={() => navigate(item.path)}
              className={`text-primary-foreground hover:bg-primary-foreground/10 ${
                location.pathname === item.path ? 'bg-primary-foreground/15' : ''
              }`}
            >
              {item.icon && <item.icon className="h-4 w-4 mr-1" />}
              <span className="hidden lg:inline">{item.label}</span>
            </Button>
          ))}
          <ThemeToggle />
          <span className="text-xs hidden xl:inline text-primary-foreground/70 mx-2">{user?.email}</span>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleLogout}
            className="text-primary-foreground hover:bg-primary-foreground/10"
          >
            <LogOut className="h-4 w-4 mr-1" />
            <span className="hidden sm:inline">Sair</span>
          </Button>
        </nav>
      </div>
    </header>
  );
}
