import type { Chapter, MasteryLevel } from '@/types';

/**
 * REGLE DE PROGRESSION (documentee, volontairement simple)
 *
 * Chaque element (chapitre, fiche, cours) porte un etat de maitrise auto-declare.
 * Chaque etat vaut un poids :
 *
 *   Pas commence  -> 0
 *   A apprendre   -> 0,25
 *   A revoir      -> 0,60
 *   Maitrise      -> 1
 *
 * La progression = moyenne des poids, arrondie au pourcent.
 * Ce sont des reperes personnels, pas une mesure de connaissances.
 */
export const MASTERY_WEIGHT: Record<MasteryLevel, number> = {
  not_started: 0,
  to_learn: 0.25,
  to_review: 0.6,
  mastered: 1,
};

export const MASTERY_LABEL: Record<MasteryLevel, string> = {
  not_started: 'Pas commencé',
  to_learn: 'À apprendre',
  to_review: 'À revoir',
  mastered: 'Maîtrisé',
};

export const MASTERY_ORDER: MasteryLevel[] = ['not_started', 'to_learn', 'to_review', 'mastered'];

/** Etat suivant dans le cycle — permet de changer l'etat en un clic. */
export function nextMastery(current: MasteryLevel): MasteryLevel {
  const i = MASTERY_ORDER.indexOf(current);
  return MASTERY_ORDER[(i + 1) % MASTERY_ORDER.length];
}

export interface ProgressResult {
  /** 0..100 */
  percent: number;
  total: number;
  mastered: number;
  counts: Record<MasteryLevel, number>;
}

export function computeProgress(items: { mastery: MasteryLevel }[]): ProgressResult {
  const counts: Record<MasteryLevel, number> = {
    not_started: 0,
    to_learn: 0,
    to_review: 0,
    mastered: 0,
  };
  for (const item of items) {
    const level = item?.mastery ?? 'not_started';
    counts[level] = (counts[level] ?? 0) + 1;
  }
  const total = items.length;
  if (total === 0) {
    return { percent: 0, total: 0, mastered: 0, counts };
  }
  const sum = items.reduce((acc, item) => acc + (MASTERY_WEIGHT[item?.mastery ?? 'not_started'] ?? 0), 0);
  return {
    percent: Math.round((sum / total) * 100),
    total,
    mastered: counts.mastered,
    counts,
  };
}

/** Progression d'une matiere : basee sur ses chapitres. */
export function subjectProgress(chapters: Chapter[]): ProgressResult {
  return computeProgress(chapters);
}

/** Progression d'un examen : uniquement les chapitres qu'il couvre. */
export function examProgress(chapters: Chapter[], chapterIds: string[]): ProgressResult {
  const set = new Set(chapterIds);
  const scoped = chapters.filter((c) => set.has(c.id));
  return computeProgress(scoped);
}
