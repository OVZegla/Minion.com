import type { SubjectColorKey } from '@/types';

export interface ColorTokens {
  /** pastille / barre pleine */
  solid: string;
  /** fond doux (mode clair) */
  soft: string;
  /** texte sur fond doux (mode clair) */
  text: string;
  /** fond doux (mode sombre) */
  softDark: string;
  /** texte sur fond doux (mode sombre) */
  textDark: string;
  label: string;
}

/** Palette volontairement desaturee : elegante, jamais criarde. */
export const SUBJECT_COLORS: Record<SubjectColorKey, ColorTokens> = {
  violet: { solid: '#8b6ddb', soft: '#f2edfd', text: '#5b3fa8', softDark: '#2a2340', textDark: '#c5b3f5', label: 'Violet' },
  blue: { solid: '#5b8dd9', soft: '#eaf1fc', text: '#2f5f9e', softDark: '#1e2a3d', textDark: '#a8c8f2', label: 'Bleu' },
  rose: { solid: '#dd7fa4', soft: '#fdeef3', text: '#a34a6d', softDark: '#3a2129', textDark: '#f4b6cd', label: 'Rose' },
  orange: { solid: '#e3934e', soft: '#fdf1e6', text: '#a35f1d', softDark: '#3a2a19', textDark: '#f2bd88', label: 'Orange' },
  coral: { solid: '#dd7a70', soft: '#fdeeec', text: '#a44a41', softDark: '#3a2320', textDark: '#f3b0a8', label: 'Corail' },
  green: { solid: '#5aa87c', soft: '#eaf6ef', text: '#2f7150', softDark: '#1c2f25', textDark: '#a4d8bb', label: 'Vert' },
  sky: { solid: '#5fb2cc', soft: '#e9f5fa', text: '#2c7793', softDark: '#1a2c33', textDark: '#a5d9e9', label: 'Bleu clair' },
  amber: { solid: '#d9a441', soft: '#fdf5e3', text: '#94690f', softDark: '#332a15', textDark: '#eccd85', label: 'Ambre' },
  teal: { solid: '#4fa89c', soft: '#e8f5f3', text: '#2a7269', softDark: '#1a2e2b', textDark: '#9dd6cd', label: 'Turquoise' },
  indigo: { solid: '#6f77cf', soft: '#eeeffb', text: '#434b9e', softDark: '#22243d', textDark: '#b3b8f0', label: 'Indigo' },
  plum: { solid: '#a76ba0', soft: '#f8edf6', text: '#7a4173', softDark: '#332235', textDark: '#e0b2da', label: 'Prune' },
  sand: { solid: '#b59a72', soft: '#f7f2e9', text: '#7d6640', softDark: '#302a20', textDark: '#dccbaa', label: 'Sable' },
  mint: { solid: '#6fbb92', soft: '#ecf7f1', text: '#3a7f5b', softDark: '#1d2e26', textDark: '#aee0c4', label: 'Menthe' },
  slate: { solid: '#7d8896', soft: '#eff1f4', text: '#4d5764', softDark: '#252a30', textDark: '#bcc5d0', label: 'Ardoise' },
};

export const SUBJECT_COLOR_KEYS = Object.keys(SUBJECT_COLORS) as SubjectColorKey[];

export function colorTokens(key: string | undefined | null): ColorTokens {
  return SUBJECT_COLORS[(key as SubjectColorKey) ?? 'slate'] ?? SUBJECT_COLORS.slate;
}

/**
 * Variables CSS a poser en style inline sur un element portant la classe `.sc`.
 *
 * On n'ecrit JAMAIS `--c-soft` / `--c-text` en inline : une declaration inline
 * l'emporterait sur la regle `.dark .sc`, et le mode sombre garderait les
 * couleurs claires. On expose donc les deux variantes, et c'est la feuille de
 * style qui choisit laquelle devient `--c-soft` / `--c-text`.
 */
export function colorVars(key: string | undefined | null): React.CSSProperties {
  const c = colorTokens(key);
  return {
    ['--c-solid' as string]: c.solid,
    ['--c-soft-light' as string]: c.soft,
    ['--c-text-light' as string]: c.text,
    ['--c-soft-dark' as string]: c.softDark,
    ['--c-text-dark' as string]: c.textDark,
  } as React.CSSProperties;
}
