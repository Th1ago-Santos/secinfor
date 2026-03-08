import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import SidebarSearch from '@/components/SidebarSearch';
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
  LogOut, Monitor, Printer, Package, ClipboardCheck,
  Laptop, BarChart3, ArrowRightLeft, Bell, Map, Settings, ListOrdered, Search,
} from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import ThemeToggle from '@/components/ThemeToggle';

const navItems = [
  { label: 'Dashboard', path: '/', icon: BarChart3 },
  { label: 'Notebooks', path: '/notebooks', icon: Laptop },
  { label: 'Material Carga', path: '/materiais', icon: Package },
  { label: 'Movimentações', path: '/movimentacoes', icon: ArrowRightLeft },
  { label: 'Inventário', path: '/inventario', icon: ClipboardCheck },
  { label: 'Prioridades', path: '/prioridades', icon: ListOrdered },
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

  const fetchAlertCount = () => {
    supabase.from('alerts').select('*', { count: 'exact', head: true }).eq('status', 'ativo')
      .then(({ count }) => setAlertCount(count || 0));
  };

  useEffect(() => {
    fetchAlertCount();
  }, [location.pathname]);

  useEffect(() => {
    const channel = supabase
      .channel('alerts-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'alerts' }, () => {
        fetchAlertCount();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

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
    <Sidebar collapsible="icon" className="border-r border-sidebar-border/60">
      <SidebarHeader className="border-b border-sidebar-border/60 px-3 py-3.5">
        <div
          className="flex items-center gap-2.5 cursor-pointer group"
          onClick={() => navigate('/')}
        >
          <div className="rounded-lg shadow-glow shrink-0 group-hover:scale-105 transition-transform duration-200 overflow-hidden">
            <img src="/favicon.png" alt="14º B Log" className="h-8 w-8 object-contain" />
          </div>
          {!collapsed && (
            <div className="overflow-hidden">
              <h1 className="text-sm font-bold tracking-tight leading-tight truncate">Seção de Informática</h1>
              <p className="text-[10px] text-sidebar-foreground/40 leading-tight">14° B Log</p>
            </div>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent className="px-2 py-2.5">
        {/* Search */}
        {!collapsed && (
          <form onSubmit={handleSearch} className="px-1 mb-3">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-sidebar-foreground/30" />
              <Input
                placeholder="Pesquisar..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 h-8 bg-sidebar-accent/40 border-sidebar-border/60 text-sidebar-foreground placeholder:text-sidebar-foreground/25 text-xs focus:bg-sidebar-accent focus:ring-1 focus:ring-primary/40 focus:border-primary/40 transition-all duration-300 rounded-lg"
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
                        className="transition-all duration-200 rounded-lg"
                      >
                        <button
                          onClick={() => navigate(item.path)}
                          className="flex items-center gap-2.5 w-full"
                        >
                          <item.icon className="h-4 w-4 shrink-0" />
                          {!collapsed && <span className="truncate text-[13px]">{item.label}</span>}
                        </button>
                      </SidebarMenuButton>
                    </TooltipTrigger>
                    {collapsed && (
                      <TooltipContent side="right" className="font-medium">
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
                      className="transition-all duration-200 rounded-lg"
                    >
                      <button
                        onClick={() => navigate('/alertas')}
                        className="flex items-center gap-2.5 w-full relative"
                      >
                        <div className="relative shrink-0">
                          <Bell className="h-4 w-4" />
                          {alertCount > 0 && (
                            <span className="absolute -top-1 -right-1 h-3.5 min-w-3.5 px-0.5 rounded-full bg-destructive text-destructive-foreground text-[8px] font-bold flex items-center justify-center ring-2 ring-sidebar-background">
                              {alertCount}
                            </span>
                          )}
                        </div>
                        {!collapsed && (
                          <span className="truncate flex items-center gap-2 text-[13px]">
                            Alertas
                            {alertCount > 0 && (
                              <Badge variant="destructive" className="h-5 px-1.5 text-[10px] font-semibold">
                                {alertCount}
                              </Badge>
                            )}
                          </span>
                        )}
                      </button>
                    </SidebarMenuButton>
                  </TooltipTrigger>
                  {collapsed && (
                    <TooltipContent side="right" className="font-medium">
                      Alertas {alertCount > 0 ? `(${alertCount})` : ''}
                    </TooltipContent>
                  )}
                </Tooltip>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border/60 px-3 py-3">
        <div className={`flex ${collapsed ? 'flex-col' : 'flex-row'} items-center gap-1`}>
          <ThemeToggle />
          {!collapsed && user?.email && (
            <span className="text-[10px] text-sidebar-foreground/35 truncate flex-1 mx-1 font-mono">
              {user.email}
            </span>
          )}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleLogout}
                className="text-sidebar-foreground/50 hover:text-sidebar-foreground hover:bg-destructive/10 h-8 w-8 shrink-0 transition-all duration-200 rounded-lg"
              >
                <LogOut className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            {collapsed && (
              <TooltipContent side="right" className="font-medium">Sair</TooltipContent>
            )}
          </Tooltip>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
