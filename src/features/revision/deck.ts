import type { Flashcard, MasteryLevel } from '@/types';

/**
 * Constitution d'un paquet de révision.
 *
 * Sorti de la page pour être vérifiable : le tirage aléatoire et les filtres
 * sont testés avec un générateur contrôlé, sans navigateur.
 */

export interface DeckFilters {
  /** null ou absent = toutes les matières */
  subjectId?: string | null;
  /** liste vide = tous les niveaux */
  mastery?: MasteryLevel[];
  /** null = sans limite d'ancienneté */
  addedWithinDays?: number | null;
  /** recherche libre dans la question et la réponse */
  query?: string;
}

export type DeckOrder = 'recent' | 'ancien' | 'aleatoire';

const normalize = (value: string): string =>
  value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

/** Applique les filtres choisis. `now` est injecté pour rendre le test stable. */
export function filterCards(
  cards: Flashcard[],
  filters: DeckFilters,
  now: Date = new Date(),
): Flashcard[] {
  const needle = filters.query ? normalize(filters.query.trim()) : '';
  const levels = filters.mastery && filters.mastery.length > 0 ? new Set(filters.mastery) : null;
  const limit =
    filters.addedWithinDays != null
      ? now.getTime() - filters.addedWithinDays * 24 * 60 * 60 * 1000
      : null;

  return cards.filter((card) => {
    if (filters.subjectId && card.subjectId !== filters.subjectId) return false;
    if (levels && !levels.has(card.mastery)) return false;
    if (limit !== null) {
      const added = Date.parse(card.createdAt);
      if (!Number.isFinite(added) || added < limit) return false;
    }
    if (needle) {
      const haystack = normalize(`${card.question} ${card.answer}`);
      if (!haystack.includes(needle)) return false;
    }
    return true;
  });
}

/** Trie sans modifier le tableau reçu. */
export function sortCards(cards: Flashcard[], order: DeckOrder, random = Math.random): Flashcard[] {
  if (order === 'aleatoire') return shuffle(cards, random);
  const copy = [...cards];
  copy.sort((a, b) => {
    const diff = Date.parse(a.createdAt) - Date.parse(b.createdAt);
    return order === 'recent' ? -diff : diff;
  });
  return copy;
}

/** Mélange de Fisher-Yates. Le tableau d'origine n'est pas modifié. */
export function shuffle<T>(items: T[], random = Math.random): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

/**
 * Paquet d'une séance : mélange puis coupe au nombre de cartes demandé.
 * `count` à 0 ou négatif signifie « toutes les cartes ».
 */
export function buildSession(cards: Flashcard[], count: number, random = Math.random): Flashcard[] {
  const mixed = shuffle(cards, random);
  if (!Number.isFinite(count) || count <= 0) return mixed;
  return mixed.slice(0, count);
}
