'use client';

import { useEffect, useMemo, useState } from 'react';
import { db } from '@/db/db';
import { Modal } from '@/components/ui/Modal';
import { MASTERY_LABEL } from '@/lib/progress';
import { nowISO } from '@/lib/dates';
import type { Flashcard, FlashcardResult, MasteryLevel } from '@/types';

/**
 * Lecteur de flashcards volontairement simple.
 * Les champs `dueAt`, `intervalDays` et `ease` existent deja dans le modele :
 * une repetition espacee pourra etre branchee plus tard sans migration.
 */
const RESULTS: { value: FlashcardResult; label: string; mastery: MasteryLevel }[] = [
  { value: 'again', label: 'À revoir', mastery: 'to_learn' },
  { value: 'hard', label: 'Difficile', mastery: 'to_review' },
  { value: 'good', label: 'Correct', mastery: 'to_review' },
  { value: 'easy', label: 'Maîtrisé', mastery: 'mastered' },
];

export function FlashcardPlayer({
  cards,
  open,
  onClose,
  title,
}: {
  cards: Flashcard[];
  open: boolean;
  onClose: () => void;
  title: string;
}) {
  const [index, setIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [done, setDone] = useState(0);

  const deck = useMemo(() => cards, [cards]);

  useEffect(() => {
    if (open) {
      setIndex(0);
      setRevealed(false);
      setDone(0);
    }
  }, [open]);

  const card = deck[index];

  const answer = async (result: (typeof RESULTS)[number]) => {
    if (!card) return;
    await db.flashcards.update(card.id, {
      mastery: result.mastery,
      lastReviewedAt: nowISO(),
      reviewCount: (card.reviewCount ?? 0) + 1,
      updatedAt: nowISO(),
    });
    setDone((value) => value + 1);
    setRevealed(false);
    setIndex((value) => value + 1);
  };

  return (
    <Modal open={open} onClose={onClose} title={title} size="md">
      {!card ? (
        <div className="py-10 text-center">
          <p className="text-[17px] font-semibold text-ink">
            {deck.length === 0 ? 'Aucune carte pour l’instant' : 'Série terminée 🎉'}
          </p>
          <p className="mt-1 text-sm text-muted">
            {deck.length === 0
              ? 'Crée des flashcards depuis une matière pour t’entraîner.'
              : `${done} carte${done > 1 ? 's' : ''} passée${done > 1 ? 's' : ''}.`}
          </p>
          <button type="button" className="btn-primary mt-4" onClick={onClose}>
            Fermer
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          <p className="text-center text-[12px] text-muted">
            Carte {index + 1} sur {deck.length}
          </p>

          <div className="rounded-2xl border border-line bg-surface2/50 p-6 text-center">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-muted">Question</p>
            <p className="mt-2 text-[17px] font-medium leading-relaxed text-ink">{card.question}</p>
          </div>

          {revealed ? (
            <div className="rounded-2xl border border-primary-line bg-primary-soft p-6 text-center">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-accent">Réponse</p>
              <p className="mt-2 text-[16px] leading-relaxed text-ink">{card.answer}</p>
            </div>
          ) : (
            <button
              type="button"
              className="btn-primary w-full justify-center"
              onClick={() => setRevealed(true)}
            >
              Afficher la réponse
            </button>
          )}

          {revealed ? (
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {RESULTS.map((result) => (
                <button
                  key={result.value}
                  type="button"
                  onClick={() => void answer(result)}
                  className="btn-outline justify-center text-[13px]"
                >
                  {result.label}
                </button>
              ))}
            </div>
          ) : null}

          <p className="text-center text-[11px] text-muted">
            État actuel : {MASTERY_LABEL[card.mastery]}
          </p>
        </div>
      )}
    </Modal>
  );
}
