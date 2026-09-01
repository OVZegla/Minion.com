import {
  AlertTriangle,
  BookMarked,
  CheckSquare,
  Heading,
  Landmark,
  Lightbulb,
  Link2,
  List,
  ListOrdered,
  Minus,
  Quote,
  Scale,
  Sparkles,
  Table,
  Text,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { newId } from '@/lib/id';
import { richToPlain } from '@/lib/richtext';
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

export interface BlockMenuEntry {
  type: CourseBlock['type'];
  variant?: keyof typeof CALLOUT_LABELS;
  label: string;
  icon: LucideIcon;
  /** courte explication affichee sous le nom */
  hint: string;
}

/** Blocs proposes dans le menu d'ajout, dans l'ordre. */
export const BLOCK_MENU: BlockMenuEntry[] = [
  { type: 'paragraph', label: 'Texte', icon: Text, hint: 'Un paragraphe' },
  { type: 'heading', label: 'Titre', icon: Heading, hint: 'Découper le cours' },
  { type: 'bullets', label: 'Liste à puces', icon: List, hint: 'Énumération' },
  { type: 'numbered', label: 'Liste numérotée', icon: ListOrdered, hint: 'Étapes ordonnées' },
  { type: 'checklist', label: 'Cases à cocher', icon: CheckSquare, hint: 'À faire, à vérifier' },
  { type: 'quote', label: 'Citation', icon: Quote, hint: 'Avec sa source' },
  { type: 'table', label: 'Tableau', icon: Table, hint: 'Comparer deux régimes' },
  { type: 'link', label: 'Lien', icon: Link2, hint: 'Légifrance, Dalloz…' },
  { type: 'divider', label: 'Séparateur', icon: Minus, hint: 'Aérer la page' },
  { type: 'callout', variant: 'remember', label: 'À retenir', icon: Sparkles, hint: 'L’essentiel' },
  {
    type: 'callout',
    variant: 'definition',
    label: 'Définition',
    icon: BookMarked,
    hint: 'Un terme précis',
  },
  { type: 'callout', variant: 'example', label: 'Exemple', icon: Lightbulb, hint: 'Un cas concret' },
  {
    type: 'callout',
    variant: 'warning',
    label: 'Piège à éviter',
    icon: AlertTriangle,
    hint: 'Erreur classique',
  },
  { type: 'article', label: 'Article de loi', icon: Landmark, hint: 'Code et référence' },
  { type: 'caselaw', label: 'Jurisprudence', icon: Scale, hint: 'Décision et portée' },
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

/**
 * Texte brut d'un bloc — sert a la recherche, aux resumes et aux compteurs.
 * La mise en forme (gras, couleur, taille) est retiree.
 */
export function blockToText(block: CourseBlock): string {
  const plain = richToPlain;
  switch (block.type) {
    case 'heading':
    case 'paragraph':
      return plain(block.text);
    case 'quote':
      return `${plain(block.text)} ${block.source ?? ''}`;
    case 'bullets':
    case 'numbered':
      return block.items.map(plain).join(' ');
    case 'checklist':
      return block.items.map((item) => plain(item.text)).join(' ');
    case 'link':
      return `${block.label ?? ''} ${block.url}`;
    case 'table':
      return [...block.header, ...block.rows.flat()].join(' ');
    case 'callout':
      return `${block.title ?? ''} ${plain(block.text)}`;
    case 'article':
      return `${block.code} ${block.reference} ${plain(block.text)} ${plain(block.comment ?? '')}`;
    case 'caselaw':
      return `${block.court} ${block.chamber ?? ''} ${plain(block.principle ?? '')} ${plain(block.scope ?? '')}`;
    default:
      return '';
  }
}
