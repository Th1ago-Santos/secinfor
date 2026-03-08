import { useAuth } from '@/hooks/useAuth';
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
  '/mapa-secoes': 'Mapa de Seções',
  '/secoes': 'Seções',
  '/impressao': 'Impressão',
  '/pesquisa': 'Pesquisa',
};

export default function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
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
                <span className="text-sm font-medium text-foreground/80 truncate">{currentTitle}</span>
              </>
            )}
          </header>
          <main className="flex-1 overflow-auto">
            {children}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
