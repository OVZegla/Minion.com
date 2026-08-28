import { newId } from '@/lib/id';
import type { CourseBlock } from '@/types';

export const BLOCK_LABELS: Record<CourseBlock['type'], string> = {
  heading: 'Titre',
  paragraph: 'Texte',
  bullets: 'Liste à puces',
  numbered: 'Liste numérotée',
  checklist: 'Cases à cocher',
  quote: 'Citation',
  divider: 'Séparateur',
  link: 'Lien',
  table: 'Tableau',
  callout: 'Encadré',
  article: 'Article de loi',
  caselaw: 'Jurisprudence',
};

export const CALLOUT_LABELS = {
  remember: 'À retenir',
  definition: 'Définition',
  example: 'Exemple',
  warning: 'Piège à éviter',
} as const;

/** Blocs proposes dans le menu d'ajout, dans l'ordre. */
export const BLOCK_MENU: { type: CourseBlock['type']; variant?: keyof typeof CALLOUT_LABELS; label: string }[] = [
  { type: 'heading', label: 'Titre' },
  { type: 'paragraph', label: 'Texte' },
  { type: 'bullets', label: 'Liste à puces' },
  { type: 'numbered', label: 'Liste numérotée' },
  { type: 'checklist', label: 'Cases à cocher' },
  { type: 'quote', label: 'Citation' },
  { type: 'table', label: 'Tableau' },
  { type: 'link', label: 'Lien' },
  { type: 'divider', label: 'Séparateur' },
  { type: 'callout', variant: 'remember', label: 'À retenir' },
  { type: 'callout', variant: 'definition', label: 'Définition' },
  { type: 'callout', variant: 'example', label: 'Exemple' },
  { type: 'callout', variant: 'warning', label: 'Piège à éviter' },
  { type: 'article', label: 'Article de loi' },
  { type: 'caselaw', label: 'Jurisprudence' },
];

export function createBlock(
  type: CourseBlock['type'],
  variant?: keyof typeof CALLOUT_LABELS,
): CourseBlock {
  const id = newId('blk');
  switch (type) {
    case 'heading':
      return { id, type, level: 2, text: '' };
    case 'paragraph':
      return { id, type, text: '' };
    case 'bullets':
      return { id, type, items: [''] };
    case 'numbered':
      return { id, type, items: [''] };
    case 'checklist':
      return { id, type, items: [{ text: '', done: false }] };
    case 'quote':
      return { id, type, text: '', source: '' };
    case 'divider':
      return { id, type };
    case 'link':
      return { id, type, url: '', label: '' };
    case 'table':
      return { id, type, header: ['Colonne 1', 'Colonne 2'], rows: [['', '']] };
    case 'callout':
      return { id, type, variant: variant ?? 'remember', title: '', text: '' };
    case 'article':
      return { id, type, code: '', reference: '', text: '', comment: '' };
    case 'caselaw':
      return { id, type, court: '', chamber: '', date: '', number: '', principle: '', scope: '' };
    default:
      return { id, type: 'paragraph', text: '' };
  }
}

/** Texte brut d'un bloc — sert a la recherche et aux resumes. */
export function blockToText(block: CourseBlock): string {
  switch (block.type) {
    case 'heading':
    case 'paragraph':
      return block.text;
    case 'quote':
      return `${block.text} ${block.source ?? ''}`;
    case 'bullets':
    case 'numbered':
      return block.items.join(' ');
    case 'checklist':
      return block.items.map((item) => item.text).join(' ');
    case 'link':
      return `${block.label ?? ''} ${block.url}`;
    case 'table':
      return [...block.header, ...block.rows.flat()].join(' ');
    case 'callout':
      return `${block.title ?? ''} ${block.text}`;
    case 'article':
      return `${block.code} ${block.reference} ${block.text} ${block.comment ?? ''}`;
    case 'caselaw':
      return `${block.court} ${block.chamber ?? ''} ${block.principle ?? ''} ${block.scope ?? ''}`;
    default:
      return '';
  }
}
