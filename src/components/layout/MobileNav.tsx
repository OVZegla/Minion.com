'use client';

import clsx from 'clsx';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Plus } from 'lucide-react';
import { MOBILE_NAV } from './nav';
import { useUi } from './AppProviders';
import { useTasks } from '@/hooks/data';
import { todayISO } from '@/lib/dates';

export function MobileNav() {
  const pathname = usePathname();
  const { openQuickAdd } = useUi();
  const tasks = useTasks();
  const today = todayISO();
  const dueToday = (tasks ?? []).filter(
    (task) => task.status !== 'done' && task.dueDate && task.dueDate <= today,
  ).length;

  const left = MOBILE_NAV.slice(0, 2);
  const right = MOBILE_NAV.slice(2);

  const renderItem = (item: (typeof MOBILE_NAV)[number]) => {
    const active = item.href === '/' ? pathname === '/' : pathname.startsWith(item.href);
    const count = item.badge === 'today' ? dueToday : 0;
    return (
      <Link
        key={item.href}
        href={item.href}
        aria-current={active ? 'page' : undefined}
        className={clsx(
          'relative flex min-h-[52px] flex-1 flex-col items-center justify-center gap-0.5 rounded-xl px-1 text-[10px] font-medium transition',
          active ? 'text-accent' : 'text-muted',
        )}
      >
        <item.icon size={21} strokeWidth={active ? 2.4 : 2} />
        <span className="truncate">{item.label}</span>
        {count > 0 ? (
          <span className="absolute right-2 top-1.5 min-w-[16px] rounded-full bg-primary px-1 text-[9px] font-bold leading-4 text-[color:var(--primary-ink)]">
            {count}
          </span>
        ) : null}
      </Link>
    );
  };

  return (
    <nav
      className="no-print fixed inset-x-0 bottom-0 z-40 flex items-stretch gap-1 border-t border-line bg-surface/95 px-2 pb-[env(safe-area-inset-bottom)] pt-1 backdrop-blur lg:hidden"
      aria-label="Navigation"
    >
      {left.map(renderItem)}
      <div className="flex w-16 items-center justify-center">
        <button
          type="button"
          onClick={() => openQuickAdd()}
          aria-label="Ajouter"
          className="-mt-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary text-[color:var(--primary-ink)] shadow-pop transition active:scale-95"
        >
          <Plus size={26} strokeWidth={2.6} />
        </button>
      </div>
      {right.map(renderItem)}
    </nav>
  );
}
