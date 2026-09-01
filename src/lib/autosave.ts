/**
 * Moteur de sauvegarde automatique, sans dépendance à React pour être testable.
 *
 * Règle : on temporise l'écriture pendant la frappe (`delay`), mais une écriture
 * en attente n'est JAMAIS annulée. Quand la page est quittée, masquée ou fermée,
 * `flush()` écrit immédiatement la dernière valeur connue. L'utilisatrice n'a
 * donc jamais de bouton « Enregistrer » à cliquer, et ne peut pas perdre sa
 * dernière phrase en changeant de page trop vite.
 */

export type SaveState = 'idle' | 'saving' | 'saved';

export type Timers = {
  set: (fn: () => void, ms: number) => number;
  clear: (id: number) => void;
};

const defaultTimers: Timers = {
  set: (fn, ms) => (typeof window === 'undefined' ? 0 : window.setTimeout(fn, ms)),
  clear: (id) => {
    if (typeof window !== 'undefined') window.clearTimeout(id);
  },
};

export type AutosaveEngine<T> = {
  /** Enregistre la valeur après un court délai (remplace toute écriture déjà programmée). */
  schedule: (value: T, delay?: number) => void;
  /** Écrit tout de suite ce qui est en attente. Sans rien en attente, ne fait rien. */
  flush: () => Promise<void>;
  /** Vrai tant qu'une écriture reste à faire. */
  isPending: () => boolean;
};

export function createAutosave<T>({
  save,
  onState = () => {},
  delay: defaultDelay = 600,
  savedFor = 1600,
  timers = defaultTimers,
}: {
  save: (value: T) => Promise<void> | void;
  onState?: (state: SaveState) => void;
  delay?: number;
  savedFor?: number;
  timers?: Timers;
}): AutosaveEngine<T> {
  let timer: number | null = null;
  let pending = false;
  let value: T | undefined;
  let last: Promise<void> = Promise.resolve();
  let announced: SaveState | null = null;

  // On ne signale qu'un vrai changement d'état. Sans ce garde-fou, chaque
  // lettre tapée annonçait « en cours d'enregistrement » alors que c'était
  // déjà le cas, ce qui redessinait toute la page à chaque frappe.
  const announce = (state: SaveState) => {
    if (state === announced) return;
    announced = state;
    onState(state);
  };

  const cancelTimer = () => {
    if (timer !== null) {
      timers.clear(timer);
      timer = null;
    }
  };

  const write = (): Promise<void> => {
    if (!pending) return last;
    pending = false;
    cancelTimer();
    const snapshot = value as T;
    last = Promise.resolve(save(snapshot)).then(() => {
      announce('saved');
      timers.set(() => announce('idle'), savedFor);
    });
    return last;
  };

  return {
    schedule(next, delay = defaultDelay) {
      value = next;
      pending = true;
      announce('saving');
      cancelTimer();
      timer = timers.set(() => {
        timer = null;
        void write();
      }, delay);
    },
    flush: write,
    isPending: () => pending,
  };
}
