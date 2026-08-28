'use client';

import { useEffect, useRef, useState } from 'react';

export type SaveState = 'idle' | 'saving' | 'saved';

/**
 * Sauvegarde automatique : la valeur est ecrite apres un court delai
 * d'inactivite. Les editeurs n'ont donc jamais de bouton « Enregistrer ».
 */
export function useAutosave<T>(
  value: T,
  save: (value: T) => Promise<void>,
  { delay = 600, enabled = true }: { delay?: number; enabled?: boolean } = {},
): SaveState {
  const [state, setState] = useState<SaveState>('idle');
  const first = useRef(true);
  const timer = useRef<number | null>(null);

  useEffect(() => {
    if (!enabled) return;
    if (first.current) {
      first.current = false;
      return;
    }
    setState('saving');
    if (timer.current) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(async () => {
      await save(value);
      setState('saved');
      window.setTimeout(() => setState('idle'), 1600);
    }, delay);
    return () => {
      if (timer.current) window.clearTimeout(timer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, enabled, delay]);

  return state;
}

export function SaveIndicatorLabel(state: SaveState): string | null {
  if (state === 'saving') return 'Enregistrement…';
  if (state === 'saved') return 'Enregistré';
  return null;
}
