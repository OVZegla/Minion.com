import type { BlockBackground } from '@/types';

/** Fonds proposés pour un bloc, avec leur teinte d'aperçu. */
export const BACKGROUNDS: { key: BlockBackground; label: string; preview: string }[] = [
  { key: 'aucun', label: 'Aucun fond', preview: 'transparent' },
  { key: 'rouge', label: 'Rouge', preview: '#fecaca' },
  { key: 'orange', label: 'Orange', preview: '#fed7aa' },
  { key: 'jaune', label: 'Jaune', preview: '#fef08a' },
  { key: 'citron', label: 'Citron', preview: '#d9f99d' },
  { key: 'vert', label: 'Vert', preview: '#bbf7d0' },
  { key: 'menthe', label: 'Menthe', preview: '#6ee7b7' },
  { key: 'turquoise', label: 'Turquoise', preview: '#99f6e4' },
  { key: 'ciel', label: 'Ciel', preview: '#bae6fd' },
  { key: 'bleu', label: 'Bleu', preview: '#93c5fd' },
  { key: 'indigo', label: 'Indigo', preview: '#c7d2fe' },
  { key: 'violet', label: 'Violet', preview: '#e9d5ff' },
  { key: 'rose', label: 'Rose', preview: '#fbcfe8' },
  { key: 'gris', label: 'Gris', preview: '#e2e8f0' },
];
