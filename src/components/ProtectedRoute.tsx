import { useAuth } from '@/hooks/useAuth';
import { useUserRole } from '@/hooks/useUserRole';
import { Navigate, useLocation } from 'react-router-dom';
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import AppSidebar from '@/components/AppSidebar';
import { Separator } from '@/components/ui/separator';

const routeTitles: Record<string, string> = {
  '/': 'Dashboard',
  '/notebooks': 'Notebooks',
  '/itens/novo': 'Novo Notebook',
  '/materiais': 'Material Carga',
  '/materiais/novo': 'Novo Material',
  '/movimentacoes': 'Movimentações',
  '/inventario': 'Inventário',
  '/alertas': 'Alertas',
  '/prioridades': 'Prioridades',
  '/mapa-secoes': 'Mapa de Seções',
  '/secoes': 'Seções',
  '/impressao': 'Impressão',
  '/pesquisa': 'Pesquisa',
  '/usuarios': 'Usuários',
  '/chamados': 'Chamados',
  '/chamados/novo': 'Abrir Chamado',
  '/chamados/config': 'Filas e Status',
};

// Routes accessible by each role
const roleRoutes: Record<string, string[]> = {
  admin: ['*'], // all routes
  operador: ['/', '/notebooks', '/itens', '/materiais', '/movimentacoes', '/inventario', '/alertas', '/prioridades', '/mapa-secoes', '/impressao', '/pesquisa', '/chamados'],
  visualizador: ['/prioridades', '/mapa-secoes', '/chamados'],
};

function isRouteAllowed(pathname: string, role: string | null): boolean {
  if (!role) return true; // still loading
  const allowed = roleRoutes[role];
  if (!allowed) return false;
  if (allowed.includes('*')) return true;
  return allowed.some(r => {
    if (r === '/') return pathname === '/';
    return pathname.startsWith(r);
  });
}

export default function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const { role, loading: roleLoading } = useUserRole();
  const location = useLocation();

  if (loading || roleLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <div className="animate-spin h-8 w-8 border-[3px] border-primary/30 border-t-primary rounded-full" />
          <p className="text-xs text-muted-foreground animate-pulse">Carregando...</p>
        </div>
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;

  // Redirect unauthorized users to their default page
  if (!isRouteAllowed(location.pathname, role)) {
    const defaultRoute = role === 'visualizador' ? '/prioridades' : '/';
    return <Navigate to={defaultRoute} replace />;
  }

  const currentTitle = routeTitles[location.pathname] || '';

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <AppSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <header className="h-12 flex items-center gap-2 border-b border-border/60 bg-background/80 backdrop-blur-sm no-print sticky top-0 z-40 px-2">
            <SidebarTrigger className="hover:bg-muted transition-colors" />
            {currentTitle && (
              <>
                <Separator orientation="vertical" className="h-4" />
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-sm font-medium text-foreground/80 truncate">{currentTitle}</span>
                  <span className="text-[10px] text-muted-foreground hidden xs:inline sm:hidden">• 14° B Log</span>
                </div>
              </>
            )}
            <div className="ml-auto flex items-center sm:hidden">
              <span className="text-[10px] font-semibold text-muted-foreground tracking-wide">Sç Informática</span>
            </div>
          </header>
          <main className="flex-1 overflow-auto">
            {children}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
