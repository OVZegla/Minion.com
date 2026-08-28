'use client';

import clsx from 'clsx';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { PanelLeft, PanelLeftClose, Plus, Search, Settings } from 'lucide-react';
import { NAV_GROUPS, SETTINGS_ITEM, type NavItem } from './nav';
import { useUi } from './AppProviders';
import { usePendingInboxCount, useTasks } from '@/hooks/data';
import { todayISO } from '@/lib/dates';

function isActive(pathname: string, href: string): boolean {
  if (href === '/') return pathname === '/';
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function Sidebar() {
  const pathname = usePathname();
  const { sidebarCollapsed, toggleSidebar, openSearch, openQuickAdd } = useUi();
  const inboxCount = usePendingInboxCount();
  const tasks = useTasks();
  const today = todayISO();
  const dueTodayCount = (tasks ?? []).filter(
    (task) => task.status !== 'done' && task.dueDate && task.dueDate <= today,
  ).length;

  const badgeValue = (item: NavItem): number => {
    if (item.badge === 'inbox') return inboxCount;
    if (item.badge === 'today') return dueTodayCount;
    return 0;
  };

  return (
    <aside
      className={clsx(
        'no-print sticky top-0 hidden h-dvh shrink-0 flex-col border-r border-line bg-surface/70 backdrop-blur transition-[width] duration-200 lg:flex',
        sidebarCollapsed ? 'w-[72px]' : 'w-[248px]',
      )}
    >
      <div className="flex items-center justify-between gap-2 px-4 py-5">
        <Link href="/" className="flex min-w-0 items-center gap-2.5">
          <span
            aria-hidden
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-primary text-[15px] font-black text-[color:var(--primary-ink)]"
          >
            m
          </span>
          {!sidebarCollapsed ? (
            <span className="truncate text-[15px] font-semibold tracking-tight text-ink">
              minion<span className="text-muted">.com</span>
            </span>
          ) : null}
        </Link>
      </div>

      <div className="px-3 pb-3">
        <button
          type="button"
          onClick={() => openQuickAdd()}
          className={clsx('btn-primary w-full', sidebarCollapsed && 'px-0')}
          title="Ajouter (N)"
        >
          <Plus size={17} strokeWidth={2.5} />
          {!sidebarCollapsed ? 'Ajouter' : null}
        </button>
      </div>

      <nav className="min-h-0 flex-1 overflow-y-auto px-3 pb-4" aria-label="Navigation principale">
        {NAV_GROUPS.map((group, index) => (
          <div key={group.label ?? index} className={index > 0 ? 'mt-5' : ''}>
            {group.label && !sidebarCollapsed ? (
              <p className="mb-1.5 px-3 text-[11px] font-semibold uppercase tracking-wider text-muted/80">
                {group.label}
              </p>
            ) : null}
            {group.label && sidebarCollapsed ? <div className="mx-3 mb-2 border-t border-line" /> : null}
            <ul className="space-y-0.5">
              {group.items.map((item) => {
                const active = isActive(pathname, item.href);
                const count = badgeValue(item);
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      aria-current={active ? 'page' : undefined}
                      title={sidebarCollapsed ? item.label : undefined}
                      className={clsx(
                        'group flex items-center gap-2.5 rounded-xl px-3 py-2 text-[14px] font-medium transition',
                        active
                          ? 'bg-primary-soft text-accent'
                          : 'text-muted hover:bg-surface2 hover:text-ink',
                        sidebarCollapsed && 'justify-center px-0',
                      )}
                    >
                      <item.icon size={18} strokeWidth={active ? 2.4 : 2} className="shrink-0" />
                      {!sidebarCollapsed ? <span className="truncate">{item.label}</span> : null}
                      {count > 0 ? (
                        <span
                          className={clsx(
                            'ml-auto rounded-full bg-primary px-1.5 py-0.5 text-[10px] font-bold text-[color:var(--primary-ink)]',
                            sidebarCollapsed && 'absolute',
                          )}
                        >
                          {count}
                        </span>
                      ) : null}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      <div className="border-t border-line px-3 py-3">
        <button
          type="button"
          onClick={openSearch}
          className={clsx(
            'flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-[14px] font-medium text-muted transition hover:bg-surface2 hover:text-ink',
            sidebarCollapsed && 'justify-center px-0',
          )}
          title="Recherche (Ctrl + K)"
        >
          <Search size={18} className="shrink-0" />
          {!sidebarCollapsed ? (
            <>
              <span>Recherche</span>
              <kbd className="ml-auto rounded-md border border-line bg-surface2 px-1.5 py-0.5 font-sans text-[10px] text-muted">
                ⌘K
              </kbd>
            </>
          ) : null}
        </button>
        <Link
          href={SETTINGS_ITEM.href}
          className={clsx(
            'flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-[14px] font-medium transition',
            isActive(pathname, SETTINGS_ITEM.href)
              ? 'bg-primary-soft text-accent'
              : 'text-muted hover:bg-surface2 hover:text-ink',
            sidebarCollapsed && 'justify-center px-0',
          )}
        >
          <Settings size={18} className="shrink-0" />
          {!sidebarCollapsed ? 'Paramètres' : null}
        </Link>
        <button
          type="button"
          onClick={toggleSidebar}
          className={clsx(
            'mt-1 flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-[13px] text-muted transition hover:bg-surface2 hover:text-ink',
            sidebarCollapsed && 'justify-center px-0',
          )}
          aria-label={sidebarCollapsed ? 'Déplier le menu' : 'Réduire le menu'}
        >
          {sidebarCollapsed ? <PanelLeft size={18} /> : <PanelLeftClose size={18} />}
          {!sidebarCollapsed ? 'Réduire' : null}
        </button>
      </div>
    </aside>
  );
}
