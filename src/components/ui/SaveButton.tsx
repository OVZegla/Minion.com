'use client';

import clsx from 'clsx';
import { Check, Loader2, Save } from 'lucide-react';
import { useState } from 'react';
import type { Autosave } from '@/hooks/useAutosave';

/**
 * Bouton « Enregistrer » de sécurité.
 *
 * Tout est déjà enregistré tout seul : ce bouton ne sert qu'à le voir noir sur
 * blanc quand on préfère vérifier avant de fermer. Il affiche aussi l'état de
 * la sauvegarde automatique, donc il remplace l'ancienne petite mention.
 */
export function SaveButton({ autosave, className }: { autosave: Autosave; className?: string }) {
  const [justSaved, setJustSaved] = useState(false);
  const busy = autosave.state === 'saving';
  const done = justSaved || autosave.state === 'saved';

  return (
    <button
      type="button"
      title="Tout est enregistré automatiquement — Ctrl+S pour enregistrer tout de suite"
      onClick={async () => {
        await autosave.saveNow();
        setJustSaved(true);
        window.setTimeout(() => setJustSaved(false), 1800);
      }}
      className={clsx('btn-soft h-9 gap-1.5 px-3 text-[13px]', className)}
    >
      {busy ? (
        <Loader2 size={15} className="animate-spin" />
      ) : done ? (
        <Check size={15} className="text-[color:var(--success)]" />
      ) : (
        <Save size={15} />
      )}
      <span>{busy ? 'Enregistrement…' : done ? 'Enregistré' : 'Enregistrer'}</span>
    </button>
  );
}
