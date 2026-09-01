'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { createAutosave, type AutosaveEngine, type SaveState } from '@/lib/autosave';

export type { SaveState };

export interface Autosave {
  /** État affiché : au repos, en cours d'enregistrement, enregistré. */
  state: SaveState;
  /** Enregistre tout de suite, sans attendre la pause de frappe. */
  saveNow: () => Promise<void>;
}

/**
 * Sauvegarde automatique d'un formulaire ou d'un éditeur.
 *
 * La valeur est écrite après une courte pause de frappe. Si la page est quittée,
 * masquée ou fermée entre-temps, l'écriture en attente est exécutée au lieu
 * d'être annulée : rien de ce qui a été tapé n'est perdu.
 *
 * `saveNow` permet en plus d'enregistrer sur demande — bouton « Enregistrer »
 * ou Ctrl+S. Ce n'est jamais nécessaire, c'est une sécurité pour qui préfère
 * voir la confirmation avant de fermer.
 */
export function useAutosave<T>(
  value: T,
  save: (value: T) => Promise<void>,
  { delay = 600, enabled = true }: { delay?: number; enabled?: boolean } = {},
): Autosave {
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
        // Comparaison explicite : React peut alors abandonner le rendu
        // lorsque l'état ne change pas réellement.
        if (mounted.current) setState((previous) => (previous === next ? previous : next));
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

  const saveNow = useCallback(async () => {
    const engine = engineRef.current;
    if (!engine) return;
    await engine.flush();
  }, []);

  // Ctrl+S (ou Cmd+S) enregistre aussi, par réflexe.
  useEffect(() => {
    if (!enabled) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 's') {
        event.preventDefault();
        void saveNow();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [enabled, saveNow]);

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

  return { state, saveNow };
}
