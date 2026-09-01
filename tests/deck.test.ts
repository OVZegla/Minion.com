import { describe, expect, it } from 'vitest';
import { buildSession, filterCards, shuffle, sortCards } from '@/features/revision/deck';
import type { Flashcard, MasteryLevel } from '@/types';

const card = (
  id: string,
  overrides: Partial<Flashcard> = {},
): Flashcard => ({
  id,
  subjectId: 'sub_1',
  chapterId: null,
  courseId: null,
  sheetId: null,
  question: `Question ${id}`,
  answer: `Réponse ${id}`,
  mastery: 'not_started' as MasteryLevel,
  lastReviewedAt: null,
  dueAt: null,
  intervalDays: null,
  ease: null,
  reviewCount: 0,
  createdAt: '2026-01-01T08:00',
  updatedAt: '2026-01-01T08:00',
  ...overrides,
});

const NOW = new Date('2026-03-01T12:00:00Z');

describe('filterCards', () => {
  const cards = [
    card('a', { subjectId: 'sub_1', mastery: 'not_started', createdAt: '2026-02-27T08:00' }),
    card('b', { subjectId: 'sub_2', mastery: 'mastered', createdAt: '2026-01-05T08:00' }),
    card('c', { subjectId: 'sub_1', mastery: 'to_learn', createdAt: '2026-02-01T08:00' }),
  ];

  it('sans filtre, garde tout', () => {
    expect(filterCards(cards, {}, NOW)).toHaveLength(3);
  });

  it('filtre par matière', () => {
    expect(filterCards(cards, { subjectId: 'sub_1' }, NOW).map((c) => c.id)).toEqual(['a', 'c']);
  });

  it('filtre par niveau de maîtrise', () => {
    expect(filterCards(cards, { mastery: ['mastered'] }, NOW).map((c) => c.id)).toEqual(['b']);
    expect(
      filterCards(cards, { mastery: ['not_started', 'to_learn'] }, NOW).map((c) => c.id),
    ).toEqual(['a', 'c']);
  });

  it('une liste de niveaux vide ne filtre rien', () => {
    expect(filterCards(cards, { mastery: [] }, NOW)).toHaveLength(3);
  });

  it('filtre par date d’ajout', () => {
    expect(filterCards(cards, { addedWithinDays: 7 }, NOW).map((c) => c.id)).toEqual(['a']);
    // 45 jours avant le 1er mars : la carte de janvier tombe hors fenêtre.
    expect(filterCards(cards, { addedWithinDays: 45 }, NOW).map((c) => c.id)).toEqual(['a', 'c']);
    expect(filterCards(cards, { addedWithinDays: 120 }, NOW).map((c) => c.id)).toEqual(['a', 'b', 'c']);
  });

  it('cherche sans tenir compte des accents ni de la casse', () => {
    const accented = [card('x', { question: 'La hiérarchie des normes' })];
    expect(filterCards(accented, { query: 'HIERARCHIE' }, NOW)).toHaveLength(1);
    expect(filterCards(accented, { query: 'absent' }, NOW)).toHaveLength(0);
  });

  it('combine les filtres', () => {
    expect(
      filterCards(cards, { subjectId: 'sub_1', mastery: ['to_learn'] }, NOW).map((c) => c.id),
    ).toEqual(['c']);
  });
});

describe('sortCards', () => {
  const cards = [
    card('vieux', { createdAt: '2026-01-01T08:00' }),
    card('recent', { createdAt: '2026-02-20T08:00' }),
    card('moyen', { createdAt: '2026-02-01T08:00' }),
  ];

  it('trie du plus récent au plus ancien', () => {
    expect(sortCards(cards, 'recent').map((c) => c.id)).toEqual(['recent', 'moyen', 'vieux']);
  });

  it('trie du plus ancien au plus récent', () => {
    expect(sortCards(cards, 'ancien').map((c) => c.id)).toEqual(['vieux', 'moyen', 'recent']);
  });

  it('ne modifie pas le tableau reçu', () => {
    const original = cards.map((c) => c.id);
    sortCards(cards, 'ancien');
    expect(cards.map((c) => c.id)).toEqual(original);
  });
});

describe('shuffle et buildSession', () => {
  const cards = Array.from({ length: 10 }, (_, i) => card(String(i)));
  // Générateur contrôlé : les tests ne dépendent pas du hasard.
  const seeded = () => {
    let state = 42;
    return () => {
      state = (state * 1103515245 + 12345) % 2147483648;
      return state / 2147483648;
    };
  };

  it('le mélange garde exactement les mêmes cartes', () => {
    const mixed = shuffle(cards, seeded());
    expect(mixed).toHaveLength(10);
    expect(mixed.map((c) => c.id).sort()).toEqual(cards.map((c) => c.id).sort());
  });

  it('le mélange change vraiment l’ordre', () => {
    const mixed = shuffle(cards, seeded());
    expect(mixed.map((c) => c.id)).not.toEqual(cards.map((c) => c.id));
  });

  it('une séance limitée rend le nombre demandé, sans doublon', () => {
    const deck = buildSession(cards, 4, seeded());
    expect(deck).toHaveLength(4);
    expect(new Set(deck.map((c) => c.id)).size).toBe(4);
  });

  it('demander plus de cartes qu’il n’en existe rend tout', () => {
    expect(buildSession(cards, 99, seeded())).toHaveLength(10);
  });

  it('zéro signifie toutes les cartes', () => {
    expect(buildSession(cards, 0, seeded())).toHaveLength(10);
  });
});
