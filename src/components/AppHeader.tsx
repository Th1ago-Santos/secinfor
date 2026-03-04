import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { LogOut, Monitor, Settings, Printer, Package } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import ThemeToggle from '@/components/ThemeToggle';

export default function AppHeader() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = async () => {
    await signOut();
    navigate('/login');
  };

  const navItems = [
    { label: 'Notebooks', path: '/' },
    { label: 'Material Carga', path: '/materiais', icon: Package },
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
            <p className="text-xs text-primary-foreground/70">Sistema de Gestão de Notebooks</p>
          </div>
        </div>

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
              <span className="hidden sm:inline">{item.label}</span>
            </Button>
          ))}
          <ThemeToggle />
          <span className="text-xs hidden md:inline text-primary-foreground/70 mx-2">{user?.email}</span>
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
