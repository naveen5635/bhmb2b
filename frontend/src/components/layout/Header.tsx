import React, { useState } from 'react';
import { useLocation } from 'react-router-dom';
import { Bell, X, CheckCheck, Sun, Moon, Monitor } from 'lucide-react';
import { useNotificationStore } from '@/store/notificationStore';
import { useThemeStore, type Theme } from '@/store/themeStore';
import { cn } from '@/lib/utils';
import { formatDateTime } from '@/lib/utils';

const THEME_META: Record<Theme, { icon: React.ElementType; label: string; tooltip: string }> = {
  light:  { icon: Sun,     label: 'Light',  tooltip: 'Light mode — click for Dark'   },
  dark:   { icon: Moon,    label: 'Dark',   tooltip: 'Dark mode — click for System'  },
  system: { icon: Monitor, label: 'System', tooltip: 'System theme — click for Light' },
};

const PAGE_TITLES: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/customers': 'Customers',
  '/articles': 'Articles',
  '/orders': 'Orders',
  '/labels': 'Label Printing',
  '/settings': 'Settings',
};

function getPageTitle(pathname: string): string {
  const base = '/' + pathname.split('/')[1];
  if (pathname.includes('/customers/') && pathname !== '/customers') return 'Customer Detail';
  if (pathname.includes('/orders/')    && pathname !== '/orders')    return 'Order Detail';
  return PAGE_TITLES[base] || 'Dashboard';
}

export function Header() {
  const location = useLocation();
  const { notifications, unreadCount, markAllRead, markRead } = useNotificationStore();
  const { theme, cycleTheme } = useThemeStore();
  const themeMeta = THEME_META[theme];
  const [showNotifications, setShowNotifications] = useState(false);
  const pageTitle = getPageTitle(location.pathname);

  return (
    <header className="h-16 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between px-6 shrink-0 transition-colors">
      <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-100">{pageTitle}</h2>

      <div className="flex items-center gap-2">

        {/* Theme toggle — cycles Light → Dark → System */}
        <button
          onClick={cycleTheme}
          title={themeMeta.tooltip}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-xs font-medium"
        >
          <themeMeta.icon className="h-4 w-4" />
          <span className="hidden sm:inline">{themeMeta.label}</span>
        </button>

        {/* Notifications */}
        <div className="relative">
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className="relative p-2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
          >
            <Bell className="h-5 w-5" />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 h-4 w-4 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-medium">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>

          {showNotifications && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setShowNotifications(false)} />
              <div className="absolute right-0 top-12 z-20 w-80 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
                <div className="flex items-center justify-between px-4 py-3 border-b dark:border-gray-700">
                  <h3 className="font-semibold text-gray-900 dark:text-gray-100 text-sm">Notifications</h3>
                  <div className="flex items-center gap-2">
                    {unreadCount > 0 && (
                      <button onClick={markAllRead} className="text-xs text-sky-600 hover:text-sky-700 flex items-center gap-1">
                        <CheckCheck className="h-3 w-3" />
                        Mark all read
                      </button>
                    )}
                    <button onClick={() => setShowNotifications(false)} className="text-gray-400 hover:text-gray-600">
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                </div>
                <div className="max-h-80 overflow-y-auto">
                  {notifications.length === 0 ? (
                    <div className="px-4 py-8 text-center text-gray-400 text-sm">No notifications</div>
                  ) : (
                    notifications.map(n => (
                      <div
                        key={n.id}
                        onClick={() => markRead(n.id)}
                        className={cn(
                          'px-4 py-3 border-b dark:border-gray-700 last:border-b-0 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors',
                          !n.read && 'bg-sky-50 dark:bg-sky-900/20'
                        )}
                      >
                        <div className="flex items-start gap-2">
                          <div className={cn(
                            'w-2 h-2 rounded-full mt-1.5 shrink-0',
                            n.type === 'success' ? 'bg-green-500' :
                            n.type === 'error'   ? 'bg-red-500'   :
                            n.type === 'warning' ? 'bg-yellow-500': 'bg-blue-500'
                          )} />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{n.title}</p>
                            <p className="text-xs text-gray-600 dark:text-gray-400 mt-0.5">{n.message}</p>
                            <p className="text-xs text-gray-400 mt-1">{formatDateTime(n.createdAt)}</p>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
