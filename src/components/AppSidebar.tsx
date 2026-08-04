import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useUserRole } from '@/hooks/useUserRole';
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
  Laptop, BarChart3, ArrowRightLeft, Bell, Map, Settings, ListOrdered, Search, Users,
  Ticket, SlidersHorizontal,
  ScrollText,
} from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import ThemeToggle from '@/components/ThemeToggle';

const allNavItems = [
  { label: 'Dashboard', path: '/', icon: BarChart3, roles: ['admin', 'operador'] },
  { label: 'Chamados', path: '/chamados', icon: Ticket, roles: ['admin', 'operador', 'visualizador', 'chefe_secao'] },
  { label: 'Notebooks', path: '/notebooks', icon: Laptop, roles: ['admin', 'operador', 'chefe_secao'] },
  { label: 'Material Carga', path: '/materiais', icon: Package, roles: ['admin', 'operador'] },
  { label: 'Movimentações', path: '/movimentacoes', icon: ArrowRightLeft, roles: ['admin', 'operador'] },
  { label: 'Inventário', path: '/inventario', icon: ClipboardCheck, roles: ['admin', 'operador', 'chefe_secao'] },
  { label: 'Prioridades', path: '/prioridades', icon: ListOrdered, roles: ['admin', 'operador', 'visualizador', 'chefe_secao'] },
  { label: 'Mapa Seções', path: '/mapa-secoes', icon: Map, roles: ['admin', 'operador', 'visualizador', 'chefe_secao'] },
  { label: 'Seções', path: '/secoes', icon: Settings, roles: ['admin'] },
  { label: 'Filas/Status', path: '/chamados/config', icon: SlidersHorizontal, roles: ['admin'] },
  { label: 'Impressão', path: '/impressao', icon: Printer, roles: ['admin', 'operador'] },
  { label: 'Usuários', path: '/usuarios', icon: Users, roles: ['admin'] },
  { label: 'Auditoria', path: '/auditoria', icon: ScrollText, roles: ['admin'] },
];

export default function AppSidebar() {
  const { user, signOut } = useAuth();
  const { role } = useUserRole();
  const navigate = useNavigate();
  const location = useLocation();
  const { state } = useSidebar();
  const collapsed = state === 'collapsed';
  const [alertCount, setAlertCount] = useState(0);

  const navItems = allNavItems.filter(item => !role || item.roles.includes(role));

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

  const handleLogout = async () => {
    await signOut();
    navigate('/login');
  };

  const showAlerts = role === 'admin' || role === 'operador';

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
        {!collapsed && <SidebarSearch />}

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

              {/* Alerts - only for admin/operador */}
              {showAlerts && (
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
              )}
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
