import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard, Users, Package, ShoppingCart,
  Printer, Settings, LogOut,
} from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { cn } from '@/lib/utils';

const navItems = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/customers', icon: Users,           label: 'Customers' },
  { to: '/articles',  icon: Package,         label: 'Articles'  },
  { to: '/orders',    icon: ShoppingCart,    label: 'Orders'    },
  { to: '/labels',    icon: Printer,         label: 'Labels'    },
  { to: '/settings',  icon: Settings,        label: 'Settings'  },
];

export function Sidebar() {
  const { user, logout } = useAuthStore();

  return (
    <aside className="w-64 bg-[#1e3a5f] flex flex-col h-full shrink-0">

      {/* ── Brand header — full-width logo ─────────────────────────────────── */}
      <div className="px-5 pt-5 pb-4 border-b border-[#2a4f7a] flex flex-col items-center">
        <img
          src="/bhm-logo.png"
          alt="Biebelhausener Mühle"
          className="w-full max-h-[110px] object-contain"
          onError={e => {
            /* fallback: hide image, show text badge */
            (e.target as HTMLImageElement).style.display = 'none';
          }}
        />
        <span className="mt-2 text-[#c9a84c] text-[10px] font-bold tracking-[0.2em] uppercase">
          BHM B2B Orders
        </span>
      </div>

      {/* ── Navigation ─────────────────────────────────────────────────────── */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {navItems.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) => cn(
              'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
              isActive
                ? 'bg-[#c9a84c] text-[#1e3a5f]'
                : 'text-slate-300 hover:bg-[#2a4f7a] hover:text-white'
            )}
          >
            <Icon className="h-5 w-5 shrink-0" />
            {label}
          </NavLink>
        ))}
      </nav>

      {/* ── User ───────────────────────────────────────────────────────────── */}
      <div className="px-4 py-4 border-t border-[#2a4f7a]">
        <div className="flex items-center gap-3 px-2 py-2 mb-2">
          <div className="bg-[#2a4f7a] rounded-full h-8 w-8 flex items-center justify-center shrink-0">
            <span className="text-white text-xs font-semibold">
              {user?.name?.charAt(0)?.toUpperCase() ?? 'U'}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-white text-sm font-medium truncate">{user?.name}</p>
            <p className="text-slate-400 text-xs capitalize">{user?.role?.toLowerCase()}</p>
          </div>
        </div>
        <button
          onClick={logout}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-slate-400 hover:bg-[#2a4f7a] hover:text-white text-sm transition-colors"
        >
          <LogOut className="h-4 w-4" />
          Sign Out
        </button>
      </div>
    </aside>
  );
}
