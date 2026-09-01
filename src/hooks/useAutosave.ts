'use client';

import { useEffect, useRef, useState } from 'react';
import { createAutosave, type AutosaveEngine, type SaveState } from '@/lib/autosave';

export type { SaveState };

/**
 * Sauvegarde automatique d'un formulaire ou d'un éditeur.
 *
 * La valeur est écrite après une courte pause de frappe. Si la page est quittée,
 * masquée ou fermée entre-temps, l'écriture en attente est exécutée au lieu
 * d'être annulée : rien de ce qui a été tapé n'est perdu.
 */
export function useAutosave<T>(
  value: T,
  save: (value: T) => Promise<void>,
  { delay = 600, enabled = true }: { delay?: number; enabled?: boolean } = {},
): SaveState {
  const [state, setState] = useState<SaveState>('idle');
  const first = useRef(true);
  const mounted = useRef(true);
  const saveRef = useRef(save);
  saveRef.current = save;

  const engineRef = useRef<AutosaveEngine<T> | null>(null);
  if (!engineRef.current) {
    engineRef.current = createAutosave<T>({
      save: (next) => saveRef.current(next),
      onState: (next) => {
        if (mounted.current) setState(next);
      },
    });
  }

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  useEffect(() => {
    if (!enabled) return;
    if (first.current) {
      first.current = false;
      return;
    }
    engineRef.current?.schedule(value, delay);
  }, [value, enabled, delay]);

  // Changement de page, onglet masqué, fenêtre fermée : on écrit, on n'annule pas.
  useEffect(() => {
    const engine = engineRef.current;
    if (!engine) return;
    const onHide = () => {
      void engine.flush();
    };
    const onVisibility = () => {
      if (document.visibilityState === 'hidden') void engine.flush();
    };
    window.addEventListener('pagehide', onHide);
    window.addEventListener('beforeunload', onHide);
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      window.removeEventListener('pagehide', onHide);
      window.removeEventListener('beforeunload', onHide);
      document.removeEventListener('visibilitychange', onVisibility);
      void engine.flush();
    };
  }, []);

  return state;
}

export function SaveIndicatorLabel(state: SaveState): string | null {
  if (state === 'saving') return 'Enregistrement…';
  if (state === 'saved') return 'Enregistré';
  return null;
}
