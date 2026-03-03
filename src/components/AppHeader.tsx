import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { LogOut, Monitor } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function AppHeader() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await signOut();
    navigate('/login');
  };

  return (
    <header className="bg-primary text-primary-foreground shadow-lg">
      <div className="container mx-auto flex items-center justify-between py-4 px-4">
        <div className="flex items-center gap-3 cursor-pointer" onClick={() => navigate('/')}>
          <Monitor className="h-7 w-7" />
          <div>
            <h1 className="text-lg font-bold tracking-tight">Controle de Patrimônio</h1>
            <p className="text-xs text-primary-foreground/70">Sistema de Gestão de Notebooks</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-sm hidden sm:inline text-primary-foreground/80">{user?.email}</span>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleLogout}
            className="text-primary-foreground hover:bg-primary-foreground/10"
          >
            <LogOut className="h-4 w-4 mr-1" />
            Sair
          </Button>
        </div>
      </div>
    </header>
  );
}
