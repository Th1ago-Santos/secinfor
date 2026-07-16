import { NavLink } from 'react-router-dom';
import { Ticket, LayoutDashboard } from 'lucide-react';
import { cn } from '@/lib/utils';

const tabs = [
  { to: '/chamados', label: 'Chamados', icon: Ticket, exact: true },
  { to: '/chamados/dashboard', label: 'Dashboard', icon: LayoutDashboard },
];

export default function TicketsSubNav() {
  return (
    <div className="mb-4 flex items-center gap-1 border-b border-border/60">
      {tabs.map((t) => (
        <NavLink
          key={t.to}
          to={t.to}
          end={t.exact}
          className={({ isActive }) =>
            cn(
              'inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-t-lg transition-colors -mb-px border-b-2',
              isActive
                ? 'text-primary border-primary bg-primary/5'
                : 'text-muted-foreground border-transparent hover:text-foreground hover:bg-muted/40',
            )
          }
        >
          <t.icon className="h-3.5 w-3.5" />
          {t.label}
        </NavLink>
      ))}
    </div>
  );
}
