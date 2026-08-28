'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { X } from 'lucide-react';
import clsx from 'clsx';
import { NAV_GROUPS, SETTINGS_ITEM } from './nav';
import { usePendingInboxCount } from '@/hooks/data';

/** Menu complet mobile : la sidebar n'est jamais affichee telle quelle sur telephone. */
export function MobileMenu({ open, onClose }: { open: boolean; onClose: () => void }) {
  const pathname = usePathname();
  const inboxCount = usePendingInboxCount();
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 lg:hidden">
      <button
        type="button"
        aria-label="Fermer le menu"
        onClick={onClose}
        className="absolute inset-0 animate-fade-in bg-black/25"
      />
      <div className="relative flex h-full w-[80%] max-w-[300px] animate-slide-up flex-col border-r border-line bg-surface">
        <div className="flex items-center justify-between px-4 py-4">
          <span className="text-[15px] font-semibold">
            minion<span className="text-muted">.com</span>
          </span>
          <button type="button" onClick={onClose} className="btn-ghost h-9 w-9 rounded-xl p-0" aria-label="Fermer">
            <X size={19} />
          </button>
        </div>
        <nav className="min-h-0 flex-1 overflow-y-auto px-3 pb-6" aria-label="Menu">
          {NAV_GROUPS.map((group, index) => (
            <div key={group.label ?? index} className={index > 0 ? 'mt-4' : ''}>
              {group.label ? (
                <p className="mb-1 px-3 text-[11px] font-semibold uppercase tracking-wider text-muted/80">
                  {group.label}
                </p>
              ) : null}
              <ul className="space-y-0.5">
                {group.items.map((item) => {
                  const active = item.href === '/' ? pathname === '/' : pathname.startsWith(item.href);
                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        onClick={onClose}
                        className={clsx(
                          'flex min-h-[44px] items-center gap-3 rounded-xl px-3 text-[15px] font-medium',
                          active ? 'bg-primary-soft text-accent' : 'text-muted',
                        )}
                      >
                        <item.icon size={19} />
                        {item.label}
                        {item.badge === 'inbox' && inboxCount > 0 ? (
                          <span className="ml-auto rounded-full bg-primary px-1.5 text-[10px] font-bold text-[color:var(--primary-ink)]">
                            {inboxCount}
                          </span>
                        ) : null}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
          <div className="mt-4 border-t border-line pt-3">
            <Link
              href={SETTINGS_ITEM.href}
              onClick={onClose}
              className="flex min-h-[44px] items-center gap-3 rounded-xl px-3 text-[15px] font-medium text-muted"
            >
              <SETTINGS_ITEM.icon size={19} />
              Paramètres
            </Link>
          </div>
        </nav>
      </div>
    </div>
  );
}
