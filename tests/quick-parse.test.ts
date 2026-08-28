import { describe, expect, it } from 'vitest';
import { parseQuickInput } from '@/lib/quick-parse';
import { toDateISO } from '@/lib/dates';
import { addDays } from 'date-fns';

const subjects = [
  { id: 'sub1', name: 'Droit constitutionnel 1', shortName: 'Droit constit.' },
  { id: 'sub2', name: 'Méthodologie juridique', shortName: 'Méthodo.' },
];

// Un mercredi, pour des tests de jours de la semaine stables.
const now = new Date(2026, 8, 16, 9, 0);

describe('saisie rapide', () => {
  it('détecte « demain »', () => {
    const parsed = parseQuickInput('Rendre le cas pratique demain', subjects, now);
    expect(parsed.date).toBe(toDateISO(addDays(now, 1)));
    expect(parsed.title).toBe('Rendre le cas pratique');
  });

  it('détecte un jour de la semaine et une matière', () => {
    const parsed = parseQuickInput('Faire fiche droit constitutionnel vendredi', subjects, now);
    expect(parsed.subjectId).toBe('sub1');
    expect(parsed.date).toBe('2026-09-18');
    expect(parsed.title.toLowerCase()).toContain('faire fiche');
    expect(parsed.title.toLowerCase()).not.toContain('vendredi');
  });

  it('détecte une date explicite', () => {
    const parsed = parseQuickInput('Contrôle le 8 octobre', subjects, now);
    expect(parsed.date).toBe('2026-10-08');
    expect(parsed.matchedDateLabel).toBe('8 octobre');
  });

  it('bascule sur l’année suivante si la date est passée', () => {
    const parsed = parseQuickInput('Oral le 3 mars', subjects, now);
    expect(parsed.date).toBe('2027-03-03');
  });

  it('détecte une heure', () => {
    const parsed = parseQuickInput('Réunion groupe à 14h30', subjects, now);
    expect(parsed.time).toBe('14:30');
  });

  it('ne devine rien quand il n’y a rien à deviner', () => {
    const parsed = parseQuickInput('Relire mes notes', subjects, now);
    expect(parsed.date).toBeNull();
    expect(parsed.subjectId).toBeNull();
    expect(parsed.title).toBe('Relire mes notes');
  });

  it('ignore les accents pour trouver la matière', () => {
    const parsed = parseQuickInput('TD methodologie juridique lundi', subjects, now);
    expect(parsed.subjectId).toBe('sub2');
  });

  it('ne renvoie jamais un titre vide', () => {
    const parsed = parseQuickInput('demain', subjects, now);
    expect(parsed.title.length).toBeGreaterThan(0);
  });
});
