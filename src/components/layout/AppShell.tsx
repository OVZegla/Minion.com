'use client';

import { Menu, Plus, Search } from 'lucide-react';
import Link from 'next/link';
import { useState, type ReactNode } from 'react';
import { Sidebar } from './Sidebar';
import { MobileNav } from './MobileNav';
import { useUi } from './AppProviders';
import { QuickAdd } from '@/features/quick-add/QuickAdd';
import { SearchCommand } from '@/features/search/SearchCommand';
import { Welcome } from '@/features/onboarding/Welcome';
import { NotificationsButton } from '@/features/notifications/NotificationsButton';
import { MobileMenu } from './MobileMenu';
import { useGlobalHotkeys } from '@/hooks/useHotkeys';
import { Spinner } from '@/components/ui';
import { useSettings } from '@/hooks/data';

export function AppShell({ children }: { children: ReactNode }) {
  const { openSearch, openQuickAdd, booting } = useUi();
  const [menuOpen, setMenuOpen] = useState(false);
  const settings = useSettings();
  const showAppName = settings?.showAppName ?? true;
  useGlobalHotkeys({ onSearch: openSearch, onQuickAdd: () => openQuickAdd() });

  return (
    <div className="flex min-h-dvh">
      <Sidebar />

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Barre supérieure mobile */}
        <header className="no-print sticky top-0 z-30 flex items-center gap-2 border-b border-line bg-bg/90 px-4 py-3 backdrop-blur lg:hidden">
          <button
            type="button"
            onClick={() => setMenuOpen(true)}
            className="btn-ghost h-9 w-9 rounded-xl p-0"
            aria-label="Ouvrir le menu"
          >
            <Menu size={20} />
          </button>
          <Link href="/" className="flex items-center gap-2">
            <span
              aria-hidden
              className="flex h-7 w-7 items-center justify-center rounded-xl bg-primary text-[13px] font-black text-[color:var(--primary-ink)]"
            >
              m
            </span>
            {showAppName ? (
              <span className="text-[15px] font-semibold tracking-tight">
                minion<span className="text-muted">.com</span>
              </span>
            ) : null}
          </Link>
          <div className="ml-auto flex items-center gap-1">
            <NotificationsButton />
            <button
              type="button"
              onClick={openSearch}
              className="btn-ghost h-9 w-9 rounded-xl p-0"
              aria-label="Rechercher"
            >
              <Search size={19} />
            </button>
          </div>
        </header>

        {/* Barre supérieure desktop */}
        <div className="no-print sticky top-0 z-20 hidden items-center justify-end gap-2 px-8 pt-5 lg:flex">
          <button
            type="button"
            onClick={openSearch}
            className="btn-outline gap-2 text-muted"
            aria-label="Rechercher"
          >
            <Search size={16} />
            Rechercher
            <kbd className="rounded-md border border-line bg-surface2 px-1.5 py-0.5 font-sans text-[10px]">
              ⌘K
            </kbd>
          </button>
          <NotificationsButton />
          <button type="button" onClick={() => openQuickAdd()} className="btn-primary">
            <Plus size={17} strokeWidth={2.5} />
            Ajouter
          </button>
        </div>

        <main className="mx-auto w-full max-w-6xl flex-1 px-4 pb-28 pt-5 sm:px-6 lg:px-8 lg:pb-16 lg:pt-4">
          {booting ? <Spinner label="Préparation de ton espace" /> : children}
        </main>
      </div>

      <MobileNav />
      <MobileMenu open={menuOpen} onClose={() => setMenuOpen(false)} />
      <QuickAdd />
      <SearchCommand />
      <Welcome />
    </div>
  );
}
