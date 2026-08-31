import { ENCOURAGEMENTS } from './encouragements';

/**
 * Tirage de la phrase d'encouragement affichée au démarrage.
 *
 * Règle : on ne répète jamais une phrase tant que toutes les autres n'ont pas
 * été vues. Quand le tour est terminé, le cycle repart — sans reprendre
 * immédiatement la dernière phrase affichée.
 */

export interface EncouragementState {
  /** index déjà vus dans le cycle en cours */
  seen: number[];
  /** dernier index affiché, pour éviter un doublon d'affilée */
  last: number | null;
}

export const EMPTY_STATE: EncouragementState = { seen: [], last: null };

export interface EncouragementPick {
  index: number;
  text: string;
  state: EncouragementState;
  /** vrai quand le cycle vient de repartir de zéro */
  cycleRestarted: boolean;
}

export function pickEncouragement(
  state: EncouragementState = EMPTY_STATE,
  total: number = ENCOURAGEMENTS.length,
  random: () => number = Math.random,
): EncouragementPick {
  if (total <= 0) {
    return { index: -1, text: '', state: EMPTY_STATE, cycleRestarted: false };
  }

  const seen = (state.seen ?? []).filter((index) => Number.isInteger(index) && index >= 0 && index < total);
  const last = state.last !== null && state.last >= 0 && state.last < total ? state.last : null;

  let pool = Array.from({ length: total }, (_, index) => index).filter(
    (index) => !seen.includes(index),
  );

  // Tour terminé : on recommence, en évitant de rejouer la dernière phrase.
  const cycleRestarted = pool.length === 0;
  if (cycleRestarted) {
    pool = Array.from({ length: total }, (_, index) => index).filter(
      (index) => total === 1 || index !== last,
    );
  }

  const index = pool[Math.min(pool.length - 1, Math.floor(random() * pool.length))];

  return {
    index,
    text: ENCOURAGEMENTS[index] ?? '',
    state: { seen: cycleRestarted ? [index] : [...seen, index], last: index },
    cycleRestarted,
  };
}

const STORAGE_KEY = 'minion.encouragement';

export function readState(): EncouragementState {
  if (typeof window === 'undefined') return EMPTY_STATE;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return EMPTY_STATE;
    const parsed = JSON.parse(raw) as EncouragementState;
    return {
      seen: Array.isArray(parsed.seen) ? parsed.seen : [],
      last: typeof parsed.last === 'number' ? parsed.last : null,
    };
  } catch {
    return EMPTY_STATE;
  }
}

export function writeState(state: EncouragementState): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    /* le tirage reste correct même sans persistance */
  }
}

export { ENCOURAGEMENTS };
