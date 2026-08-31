import { deaccent } from './text';
import type { Chapter, Course, DocumentItem, Subject } from '@/types';

/**
 * CLASSEMENT AUTOMATIQUE DES DOCUMENTS SUR LE DISQUE
 *
 * Regle (documentee, volontairement previsible) :
 *
 *   <dossier choisi>/<categorie>/<matiere>-chapitre<N>/<fichier>
 *
 * Exemples :
 *   cours/droit-des-affaires-chapitre1/CM03.pdf
 *   fiches/droit-constitutionnel/les-sources.pdf
 *   examens/comptabilite-generale/annales.pdf
 *   divers/reglement-interieur.pdf
 *
 * Le chapitre n'apparait que s'il est connu ; la matiere que si elle est
 * renseignee. Les liens (kind === 'link') n'ont pas de fichier a ecrire.
 */

export type LibraryCategory =
  | 'cours'
  | 'fiches'
  | 'examens'
  | 'devoirs'
  | 'sae'
  | 'matieres'
  | 'divers';

export const CATEGORY_LABEL: Record<LibraryCategory, string> = {
  cours: 'Cours',
  fiches: 'Fiches',
  examens: 'Examens',
  devoirs: 'Devoirs',
  sae: 'SAÉ',
  matieres: 'Matières',
  divers: 'Divers',
};

/** "Droit des affaires 1" -> "droit-des-affaires-1" */
export function slugify(value: string): string {
  const plain = deaccent(value)
    .toLowerCase()
    .replace(/['’]/g, ' ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
  return plain || 'sans-nom';
}

/** Retire tout ce qui pourrait sortir du dossier ou gener Windows. */
export function safeFileName(name: string): string {
  const base = name.split(/[/\\]/).pop() ?? name;
  const cleaned = base
    // eslint-disable-next-line no-control-regex
    .replace(/[<>:"/\\|?*]/g, '-')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/^\.+/, '')
    .slice(0, 120);
  return cleaned || 'document';
}

export function categoryFor(document: Partial<DocumentItem>): LibraryCategory {
  if (document.courseId) return 'cours';
  if (document.sheetId) return 'fiches';
  if (document.examId) return 'examens';
  if (document.taskId) return 'devoirs';
  if (document.saeId) return 'sae';
  if (document.subjectId) return 'matieres';
  return 'divers';
}

export interface FolderContext {
  subject?: Subject | null;
  course?: Course | null;
  chapter?: Chapter | null;
}

/**
 * Dossier relatif ou ranger le document, separateurs "/".
 * Le processus principal se charge de le traduire en chemin systeme.
 */
export function documentFolder(
  document: Partial<DocumentItem>,
  context: FolderContext = {},
): string {
  const category = categoryFor(document);
  const { subject, chapter } = context;

  if (!subject) return category;

  const subjectSlug = slugify(subject.shortName || subject.name);
  if (chapter) {
    return `${category}/${subjectSlug}-chapitre${chapter.order + 1}`;
  }
  return `${category}/${subjectSlug}`;
}

/** Chemin relatif complet, affiche dans l'interface avant meme l'ecriture. */
export function documentRelativePath(
  document: Partial<DocumentItem> & { name: string },
  context: FolderContext = {},
): string {
  return `${documentFolder(document, context)}/${safeFileName(document.name)}`;
}

/** Un lien n'a pas de fichier : rien a classer sur le disque. */
export function isFilable(document: Partial<DocumentItem>): boolean {
  return document.kind !== 'link';
}
