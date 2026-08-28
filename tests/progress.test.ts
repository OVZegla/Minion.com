import { describe, expect, it } from 'vitest';
import { computeProgress, examProgress, nextMastery, MASTERY_WEIGHT } from '@/lib/progress';
import type { Chapter, MasteryLevel } from '@/types';

const chapter = (id: string, mastery: MasteryLevel): Chapter => ({
  id,
  subjectId: 'sub',
  title: id,
  order: 0,
  mastery,
  updatedAt: '2026-01-01T10:00',
});

describe('progression', () => {
  it('retourne 0 % sans aucun élément', () => {
    const result = computeProgress([]);
    expect(result.percent).toBe(0);
    expect(result.total).toBe(0);
  });

  it('applique la règle documentée', () => {
    const items = [
      chapter('a', 'mastered'),
      chapter('b', 'mastered'),
      chapter('c', 'to_review'),
      chapter('d', 'to_learn'),
      chapter('e', 'not_started'),
    ];
    const expected = Math.round(((1 + 1 + 0.6 + 0.25 + 0) / 5) * 100);
    expect(computeProgress(items).percent).toBe(expected);
    expect(computeProgress(items).mastered).toBe(2);
  });

  it('atteint 100 % quand tout est maîtrisé', () => {
    expect(computeProgress([chapter('a', 'mastered'), chapter('b', 'mastered')]).percent).toBe(100);
  });

  it('ne compte que les chapitres de l’examen', () => {
    const chapters = [
      chapter('a', 'mastered'),
      chapter('b', 'not_started'),
      chapter('c', 'mastered'),
    ];
    expect(examProgress(chapters, ['a', 'c']).percent).toBe(100);
    expect(examProgress(chapters, ['a', 'b']).percent).toBe(50);
    expect(examProgress(chapters, []).percent).toBe(0);
  });

  it('fait tourner les états de maîtrise en boucle', () => {
    expect(nextMastery('not_started')).toBe('to_learn');
    expect(nextMastery('to_learn')).toBe('to_review');
    expect(nextMastery('to_review')).toBe('mastered');
    expect(nextMastery('mastered')).toBe('not_started');
  });

  it('garde des poids croissants', () => {
    expect(MASTERY_WEIGHT.not_started).toBeLessThan(MASTERY_WEIGHT.to_learn);
    expect(MASTERY_WEIGHT.to_learn).toBeLessThan(MASTERY_WEIGHT.to_review);
    expect(MASTERY_WEIGHT.to_review).toBeLessThan(MASTERY_WEIGHT.mastered);
  });
});
