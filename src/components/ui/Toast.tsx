'use client';

import { Check } from 'lucide-react';
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { newId } from '@/lib/id';

interface ToastItem {
  id: string;
  message: string;
  actionLabel?: string;
  onAction?: () => void;
}

interface ToastApi {
  /** Message court de confirmation. */
  toast: (message: string) => void;
  /** Message avec action (utilise pour « Annuler » apres une suppression). */
  toastUndo: (message: string, onUndo: () => void, actionLabel?: string) => void;
}

const ToastContext = createContext<ToastApi | null>(null);

export function useToast(): ToastApi {
  const context = useContext(ToastContext);
  if (!context) throw new Error('useToast doit être utilisé dans ToastProvider');
  return context;
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const timers = useRef(new Map<string, number>());

  const dismiss = useCallback((id: string) => {
    setItems((current) => current.filter((item) => item.id !== id));
    const timer = timers.current.get(id);
    if (timer) window.clearTimeout(timer);
    timers.current.delete(id);
  }, []);

  const push = useCallback(
    (item: Omit<ToastItem, 'id'>, duration: number) => {
      const id = newId('tst');
      setItems((current) => [...current.slice(-2), { ...item, id }]);
      timers.current.set(id, window.setTimeout(() => dismiss(id), duration));
    },
    [dismiss],
  );

  const api = useMemo<ToastApi>(
    () => ({
      toast: (message) => push({ message }, 2600),
      toastUndo: (message, onUndo, actionLabel = 'Annuler') =>
        push({ message, actionLabel, onAction: onUndo }, 6000),
    }),
    [push],
  );

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div
        className="pointer-events-none fixed inset-x-0 bottom-20 z-[60] flex flex-col items-center gap-2 px-4 sm:bottom-6"
        role="status"
        aria-live="polite"
      >
        {items.map((item) => (
          <div
            key={item.id}
            className="pointer-events-auto flex w-full max-w-sm animate-slide-up items-center gap-3 rounded-2xl border border-line bg-surface px-4 py-3 shadow-pop"
          >
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-[color:var(--primary-ink)]">
              <Check size={14} strokeWidth={3} />
            </span>
            <p className="min-w-0 flex-1 truncate text-sm text-ink">{item.message}</p>
            {item.actionLabel ? (
              <button
                type="button"
                className="shrink-0 rounded-lg px-2 py-1 text-sm font-semibold text-accent hover:bg-primary-soft"
                onClick={() => {
                  item.onAction?.();
                  dismiss(item.id);
                }}
              >
                {item.actionLabel}
              </button>
            ) : null}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
