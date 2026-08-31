import { describe, expect, it } from 'vitest';
import {
  categoryFor,
  documentFolder,
  documentRelativePath,
  isFilable,
  safeFileName,
  slugify,
} from '@/lib/library';
import type { Chapter, Subject } from '@/types';

const subject = (name: string, shortName = name): Subject => ({
  id: 'sub1',
  semesterId: 's',
  academicYearId: 'y',
  name,
  shortName,
  color: 'blue',
  icon: 'BookOpen',
  isArchived: false,
  createdAt: '2026-01-01T08:00',
  updatedAt: '2026-01-01T08:00',
});

const chapter = (order: number): Chapter => ({
  id: 'chp1',
  subjectId: 'sub1',
  title: 'Chapitre',
  order,
  mastery: 'not_started',
  updatedAt: '2026-01-01T08:00',
});

describe('slugify', () => {
  it('retire accents, ponctuation et majuscules', () => {
    expect(slugify('Droit des affaires')).toBe('droit-des-affaires');
    expect(slugify('Méthodologie juridique')).toBe('methodologie-juridique');
    expect(slugify('Droit constitutionnel 1')).toBe('droit-constitutionnel-1');
    expect(slugify("L’État & la Constitution")).toBe('l-etat-la-constitution');
  });

  it('ne renvoie jamais une chaîne vide', () => {
    expect(slugify('   ')).toBe('sans-nom');
    expect(slugify('///')).toBe('sans-nom');
  });
});

describe('safeFileName', () => {
  it('retire les séparateurs de chemin', () => {
    expect(safeFileName('../../secret.pdf')).not.toContain('..');
    expect(safeFileName('dossier/CM03.pdf')).toBe('CM03.pdf');
    expect(safeFileName('C:\\temp\\note.pdf')).toBe('note.pdf');
  });

  it('remplace les caractères interdits par Windows', () => {
    expect(safeFileName('TD n°1 : cas pratique?.pdf')).toBe('TD n°1 - cas pratique-.pdf');
  });

  it('garde un nom par défaut', () => {
    expect(safeFileName('')).toBe('document');
    expect(safeFileName('...')).toBe('document');
  });
});

describe('catégorie', () => {
  it('découle du rattachement du document', () => {
    expect(categoryFor({ courseId: 'c1' })).toBe('cours');
    expect(categoryFor({ sheetId: 'f1' })).toBe('fiches');
    expect(categoryFor({ examId: 'e1' })).toBe('examens');
    expect(categoryFor({ taskId: 't1' })).toBe('devoirs');
    expect(categoryFor({ saeId: 's1' })).toBe('sae');
    expect(categoryFor({ subjectId: 'sub1' })).toBe('matieres');
    expect(categoryFor({})).toBe('divers');
  });

  it('donne la priorité au cours', () => {
    expect(categoryFor({ courseId: 'c1', subjectId: 'sub1', examId: 'e1' })).toBe('cours');
  });
});

describe('dossier de destination', () => {
  it('range un cours par matière et chapitre', () => {
    const folder = documentFolder(
      { courseId: 'c1', subjectId: 'sub1' },
      { subject: subject('Droit des affaires'), chapter: chapter(0) },
    );
    expect(folder).toBe('cours/droit-des-affaires-chapitre1');
  });

  it('numérote les chapitres à partir de 1', () => {
    const folder = documentFolder(
      { courseId: 'c1' },
      { subject: subject('Droit des affaires'), chapter: chapter(4) },
    );
    expect(folder).toBe('cours/droit-des-affaires-chapitre5');
  });

  it('omet le chapitre quand il est inconnu', () => {
    const folder = documentFolder({ courseId: 'c1' }, { subject: subject('Droit des affaires') });
    expect(folder).toBe('cours/droit-des-affaires');
  });

  it('utilise le nom court de la matière', () => {
    const folder = documentFolder(
      { sheetId: 'f1' },
      { subject: subject('Introduction générale au droit', 'Intro. droit') },
    );
    expect(folder).toBe('fiches/intro-droit');
  });

  it('se limite à la catégorie sans matière', () => {
    expect(documentFolder({})).toBe('divers');
    expect(documentFolder({ examId: 'e1' })).toBe('examens');
  });

  it('produit un chemin relatif complet', () => {
    const path = documentRelativePath(
      { courseId: 'c1', name: 'CM03 — La Constitution.pdf' },
      { subject: subject('Droit constitutionnel 1', 'Droit constit.'), chapter: chapter(1) },
    );
    expect(path).toBe('cours/droit-constit-chapitre2/CM03 — La Constitution.pdf');
  });

  it('ne classe jamais un lien', () => {
    expect(isFilable({ kind: 'link' })).toBe(false);
    expect(isFilable({ kind: 'pdf' })).toBe(true);
  });
});
