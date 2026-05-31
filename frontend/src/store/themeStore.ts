import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type Theme = 'light' | 'dark' | 'system';

interface ThemeState {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  cycleTheme: () => void;
}

function getSystemPreference(): 'light' | 'dark' {
  if (typeof window === 'undefined') return 'light';
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function applyTheme(theme: Theme) {
  const resolved = theme === 'system' ? getSystemPreference() : theme;
  document.documentElement.classList.toggle('dark', resolved === 'dark');
}

// One persistent media-query listener kept in module scope
let _mediaListener: ((e: MediaQueryListEvent) => void) | null = null;

function syncMediaListener(theme: Theme) {
  if (typeof window === 'undefined') return;
  const mq = window.matchMedia('(prefers-color-scheme: dark)');
  if (_mediaListener) mq.removeEventListener('change', _mediaListener);
  _mediaListener = null;

  if (theme === 'system') {
    _mediaListener = () => applyTheme('system');
    mq.addEventListener('change', _mediaListener);
  }
}

const CYCLE: Theme[] = ['light', 'dark', 'system'];

export const useThemeStore = create<ThemeState>()(
  persist(
    (set, get) => ({
      // Default to 'system' so it respects OS preference on first visit
      theme: 'system' as Theme,

      setTheme: (theme) => {
        applyTheme(theme);
        syncMediaListener(theme);
        set({ theme });
      },

      cycleTheme: () => {
        const current = get().theme;
        const next = CYCLE[(CYCLE.indexOf(current) + 1) % CYCLE.length];
        applyTheme(next);
        syncMediaListener(next);
        set({ theme: next });
      },
    }),
    {
      name: 'bhm-theme',
      onRehydrateStorage: () => (state) => {
        const theme = state?.theme ?? 'system';
        applyTheme(theme);
        syncMediaListener(theme);
      },
    }
  )
);
