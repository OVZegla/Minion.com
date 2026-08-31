'use client';

import { Sparkles, X } from 'lucide-react';
import { useUi } from '@/components/layout/AppProviders';
import { useSettings } from '@/hooks/data';

/**
 * Phrase d'encouragement du jour.
 * Tirée une seule fois par ouverture de l'application, elle reste la même
 * pendant toute la session et peut être masquée d'un clic.
 */
export function Encouragement() {
  const { encouragement, dismissEncouragement } = useUi();
  const settings = useSettings();

  if (!encouragement) return null;
  if (settings && settings.showEncouragement === false) return null;

  return (
    <div className="sc animate-slide-up flex items-start gap-3 rounded-2xl border border-primary-line bg-primary-soft px-4 py-3.5">
      <span
        aria-hidden
        className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-xl bg-primary text-[color:var(--primary-ink)]"
      >
        <Sparkles size={15} />
      </span>
      <p
        data-encouragement
        className="min-w-0 flex-1 text-[14px] font-medium leading-relaxed text-accent"
      >
        {encouragement}
      </p>
      <button
        type="button"
        onClick={dismissEncouragement}
        aria-label="Masquer ce message"
        className="-mr-1 -mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-accent/70 transition hover:bg-primary/30 hover:text-accent"
      >
        <X size={15} />
      </button>
    </div>
  );
}
