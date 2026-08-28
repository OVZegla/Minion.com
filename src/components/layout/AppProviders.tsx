'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { db } from '@/db/db';
import { seedDemoData } from '@/db/seed';
import { ToastProvider } from '@/components/ui/Toast';
import type { ThemeMode } from '@/types';

/* ------------------------------ Theme -------------------------------- */

interface ThemeApi {
  mode: ThemeMode;
  resolved: 'light' | 'dark';
  setMode: (mode: ThemeMode) => void;
}

const ThemeContext = createContext<ThemeApi | null>(null);

export function useThemeMode(): ThemeApi {
  const context = useContext(ThemeContext);
  if (!context) throw new Error('useThemeMode doit être utilisé dans AppProviders');
  return context;
}

const THEME_KEY = 'minion.theme';

function applyTheme(mode: ThemeMode): 'light' | 'dark' {
  const prefersDark =
    typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches;
  const resolved = mode === 'system' ? (prefersDark ? 'dark' : 'light') : mode;
  document.documentElement.classList.toggle('dark', resolved === 'dark');
  document.documentElement.style.colorScheme = resolved;
  return resolved;
}

/* -------------------------------- UI --------------------------------- */

interface UiApi {
  quickAddOpen: boolean;
  openQuickAdd: (kind?: string) => void;
  closeQuickAdd: () => void;
  quickAddKind: string | null;
  searchOpen: boolean;
  openSearch: () => void;
  closeSearch: () => void;
  sidebarCollapsed: boolean;
  toggleSidebar: () => void;
  /** true tant que la base locale n'est pas prete */
  booting: boolean;
}

const UiContext = createContext<UiApi | null>(null);

export function useUi(): UiApi {
  const context = useContext(UiContext);
  if (!context) throw new Error('useUi doit être utilisé dans AppProviders');
  return context;
}

const SIDEBAR_KEY = 'minion.sidebar';

export function AppProviders({ children }: { children: ReactNode }) {
  const [mode, setModeState] = useState<ThemeMode>('system');
  const [resolved, setResolved] = useState<'light' | 'dark'>('light');
  const [quickAddOpen, setQuickAddOpen] = useState(false);
  const [quickAddKind, setQuickAddKind] = useState<string | null>(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [booting, setBooting] = useState(true);

  /* Amorcage : au tout premier lancement, la demo est chargee
     automatiquement pour que l'application ne soit jamais vide. */
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const existing = await db.settings.get('app');
        if (!existing) {
          await seedDemoData(new Date(), { onboarded: false });
        }
      } catch (error) {
        console.error('Initialisation de la base locale impossible', error);
      } finally {
        if (!cancelled) setBooting(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  /* Theme : la preference est aussi gardee en localStorage pour eviter
     tout clignotement avant la lecture d'IndexedDB. */
  useEffect(() => {
    const stored = (localStorage.getItem(THEME_KEY) as ThemeMode | null) ?? 'system';
    setModeState(stored);
    setResolved(applyTheme(stored));
    setSidebarCollapsed(localStorage.getItem(SIDEBAR_KEY) === '1');

    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = () => {
      const current = (localStorage.getItem(THEME_KEY) as ThemeMode | null) ?? 'system';
      if (current === 'system') setResolved(applyTheme('system'));
    };
    media.addEventListener('change', onChange);
    return () => media.removeEventListener('change', onChange);
  }, []);

  const setMode = useCallback((next: ThemeMode) => {
    setModeState(next);
    localStorage.setItem(THEME_KEY, next);
    setResolved(applyTheme(next));
    void db.settings.get('app').then((settings) => {
      if (settings) db.settings.put({ ...settings, theme: next });
    });
  }, []);

  const toggleSidebar = useCallback(() => {
    setSidebarCollapsed((current) => {
      localStorage.setItem(SIDEBAR_KEY, current ? '0' : '1');
      return !current;
    });
  }, []);

  const openQuickAdd = useCallback((kind?: string) => {
    setQuickAddKind(kind ?? null);
    setQuickAddOpen(true);
  }, []);

  const ui = useMemo<UiApi>(
    () => ({
      quickAddOpen,
      quickAddKind,
      openQuickAdd,
      closeQuickAdd: () => setQuickAddOpen(false),
      searchOpen,
      openSearch: () => setSearchOpen(true),
      closeSearch: () => setSearchOpen(false),
      sidebarCollapsed,
      toggleSidebar,
      booting,
    }),
    [quickAddOpen, quickAddKind, openQuickAdd, searchOpen, sidebarCollapsed, toggleSidebar, booting],
  );

  const theme = useMemo<ThemeApi>(() => ({ mode, resolved, setMode }), [mode, resolved, setMode]);

  return (
    <ThemeContext.Provider value={theme}>
      <UiContext.Provider value={ui}>
        <ToastProvider>{children}</ToastProvider>
      </UiContext.Provider>
    </ThemeContext.Provider>
  );
}
