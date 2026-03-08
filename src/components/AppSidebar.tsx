import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from '@/components/ui/sidebar';
import {
  LogOut, Monitor, Printer, Package, Search, ClipboardCheck,
  Laptop, BarChart3, ArrowRightLeft, Bell, Map, Settings,
} from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import ThemeToggle from '@/components/ThemeToggle';

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

export default function AppSidebar() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { state } = useSidebar();
  const collapsed = state === 'collapsed';
  const [alertCount, setAlertCount] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    supabase.from('alerts').select('*', { count: 'exact', head: true }).eq('status', 'ativo')
      .then(({ count }) => setAlertCount(count || 0));
  }, [location.pathname]);

  const isActive = (path: string) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/pesquisa?q=${encodeURIComponent(searchQuery.trim())}`);
      setSearchQuery('');
    }
  };

  const handleLogout = async () => {
    await signOut();
    navigate('/login');
  };

  return (
    <Sidebar collapsible="icon" className="border-r border-sidebar-border">
      <SidebarHeader className="border-b border-sidebar-border px-3 py-3">
        <div
          className="flex items-center gap-2.5 cursor-pointer group"
          onClick={() => navigate('/')}
        >
          <div className="p-1.5 rounded-lg bg-primary/20 group-hover:bg-primary/30 transition-all duration-200 shrink-0">
            <Monitor className="h-5 w-5 text-primary" />
          </div>
          {!collapsed && (
            <div className="overflow-hidden">
              <h1 className="text-sm font-bold tracking-tight leading-tight truncate">Controle de Patrimônio</h1>
              <p className="text-[10px] text-sidebar-foreground/50 leading-tight">Sistema de Gestão</p>
            </div>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent className="px-2 py-2">
        {/* Search */}
        {!collapsed && (
          <form onSubmit={handleSearch} className="px-1 mb-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-sidebar-foreground/40" />
              <Input
                placeholder="Pesquisar..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 h-8 bg-sidebar-accent/50 border-sidebar-border text-sidebar-foreground placeholder:text-sidebar-foreground/30 text-xs focus:bg-sidebar-accent focus:ring-primary/50 transition-all duration-200"
              />
            </div>
          </form>
        )}

        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => (
                <SidebarMenuItem key={item.path}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <SidebarMenuButton
                        asChild
                        isActive={isActive(item.path)}
                        className="transition-all duration-200"
                      >
                        <button
                          onClick={() => navigate(item.path)}
                          className="flex items-center gap-2.5 w-full"
                        >
                          <item.icon className="h-4 w-4 shrink-0" />
                          {!collapsed && <span className="truncate">{item.label}</span>}
                        </button>
                      </SidebarMenuButton>
                    </TooltipTrigger>
                    {collapsed && (
                      <TooltipContent side="right">
                        {item.label}
                      </TooltipContent>
                    )}
                  </Tooltip>
                </SidebarMenuItem>
              ))}

              {/* Alerts */}
              <SidebarMenuItem>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <SidebarMenuButton
                      asChild
                      isActive={isActive('/alertas')}
                      className="transition-all duration-200"
                    >
                      <button
                        onClick={() => navigate('/alertas')}
                        className="flex items-center gap-2.5 w-full relative"
                      >
                        <div className="relative shrink-0">
                          <Bell className="h-4 w-4" />
                          {alertCount > 0 && (
                            <Badge variant="destructive" className="absolute -top-1.5 -right-1.5 h-4 min-w-4 px-1 text-[9px] flex items-center justify-center">
                              {alertCount}
                            </Badge>
                          )}
                        </div>
                        {!collapsed && (
                          <span className="truncate flex items-center gap-2">
                            Alertas
                            {alertCount > 0 && (
                              <Badge variant="destructive" className="h-5 px-1.5 text-[10px]">
                                {alertCount}
                              </Badge>
                            )}
                          </span>
                        )}
                      </button>
                    </SidebarMenuButton>
                  </TooltipTrigger>
                  {collapsed && (
                    <TooltipContent side="right">
                      Alertas {alertCount > 0 ? `(${alertCount})` : ''}
                    </TooltipContent>
                  )}
                </Tooltip>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border px-3 py-3">
        <div className={`flex ${collapsed ? 'flex-col' : 'flex-row'} items-center gap-1`}>
          <ThemeToggle />
          {!collapsed && user?.email && (
            <span className="text-[10px] text-sidebar-foreground/40 truncate flex-1 mx-1">
              {user.email}
            </span>
          )}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleLogout}
                className="text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent h-8 w-8 shrink-0 transition-all duration-200"
              >
                <LogOut className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            {collapsed && (
              <TooltipContent side="right">Sair</TooltipContent>
            )}
          </Tooltip>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
