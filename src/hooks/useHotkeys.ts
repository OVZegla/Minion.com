'use client';

import { useEffect } from 'react';

function isTypingTarget(target: EventTarget | null): boolean {
  const element = target as HTMLElement | null;
  if (!element) return false;
  const tag = element.tagName;
  return (
    tag === 'INPUT' ||
    tag === 'TEXTAREA' ||
    tag === 'SELECT' ||
    element.isContentEditable === true
  );
}

/** Raccourcis clavier globaux (desktop). */
export function useGlobalHotkeys({
  onSearch,
  onQuickAdd,
}: {
  onSearch: () => void;
  onQuickAdd: () => void;
}) {
  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      const meta = event.metaKey || event.ctrlKey;
      if (meta && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        onSearch();
        return;
      }
      if (isTypingTarget(event.target)) return;
      if (event.key === '/') {
        event.preventDefault();
        onSearch();
      } else if (event.key.toLowerCase() === 'n' && !meta) {
        event.preventDefault();
        onQuickAdd();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onSearch, onQuickAdd]);
}
