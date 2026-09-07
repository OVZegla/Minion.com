import type {
  InternalDomain,
  PestelDimension,
  SwotAnalysis,
  SwotItem,
  SwotPolarity,
  SwotSide,
} from '@/types';

/**
 * Diagnostic d'entreprise : PESTEL pour l'environnement, diagnostic interne
 * pour l'entreprise elle-même, et la matrice SWOT qui synthétise les deux.
 *
 * La matrice n'est jamais saisie à part : elle est **déduite** des constats.
 * Un constat externe favorable est une opportunité, un constat interne
 * défavorable est une faiblesse, et ainsi de suite. Ranger le même constat
 * deux fois, une fois dans le PESTEL et une fois dans le SWOT, serait la
 * meilleure façon de les voir diverger.
 */

export const PESTEL_LABELS: Record<PestelDimension, string> = {
  politique: 'Politique',
  economique: 'Économique',
  socioculturel: 'Socioculturel',
  technologique: 'Technologique',
  ecologique: 'Écologique',
  legal: 'Légal',
};

/** Ce que recouvre chaque dimension, pour ne pas rester devant une case vide. */
export const PESTEL_HINTS: Record<PestelDimension, string> = {
  politique: 'Stabilité du gouvernement, politiques publiques, fiscalité, subventions',
  economique: 'Croissance, inflation, taux d’intérêt, pouvoir d’achat, chômage',
  socioculturel: 'Démographie, modes de vie, attentes des consommateurs, éducation',
  technologique: 'Innovations, numérique, recherche, obsolescence des équipements',
  ecologique: 'Climat, énergie, déchets, attentes environnementales',
  legal: 'Droit du travail, droit de la concurrence, normes, protection des données',
};

export const INTERNAL_LABELS: Record<InternalDomain, string> = {
  humain: 'Ressources humaines',
  financier: 'Finances',
  commercial: 'Commercial et marketing',
  organisation: 'Organisation',
  technique: 'Production et technique',
  image: 'Image et réputation',
};

export const INTERNAL_HINTS: Record<InternalDomain, string> = {
  humain: 'Compétences, climat social, turnover, formation',
  financier: 'Rentabilité, trésorerie, endettement, investissements',
  commercial: 'Clientèle, gamme, prix, réseau de distribution, notoriété',
  organisation: 'Structure, processus, circulation de l’information, management',
  technique: 'Outil de production, capacité, qualité, savoir-faire',
  image: 'Réputation, marque, responsabilité sociale, avis clients',
};

export const PESTEL_ORDER: PestelDimension[] = [
  'politique',
  'economique',
  'socioculturel',
  'technologique',
  'ecologique',
  'legal',
];

export const INTERNAL_ORDER: InternalDomain[] = [
  'humain',
  'financier',
  'commercial',
  'organisation',
  'technique',
  'image',
];

/** Les quatre cases de la matrice. */
export type SwotQuadrant = 'forces' | 'faiblesses' | 'opportunites' | 'menaces';

export const QUADRANT_LABELS: Record<SwotQuadrant, string> = {
  forces: 'Forces',
  faiblesses: 'Faiblesses',
  opportunites: 'Opportunités',
  menaces: 'Menaces',
};

/** Rappelle d'où vient chaque case, pour ne pas confondre interne et externe. */
export const QUADRANT_ORIGIN: Record<SwotQuadrant, string> = {
  forces: 'Diagnostic interne · ce sur quoi l’entreprise peut s’appuyer',
  faiblesses: 'Diagnostic interne · ce qui la freine',
  opportunites: 'Environnement (PESTEL) · ce dont elle peut profiter',
  menaces: 'Environnement (PESTEL) · ce qui peut lui nuire',
};

/** La case d'un constat se déduit de son origine et de son sens. */
export function quadrantOf(side: SwotSide, polarity: SwotPolarity): SwotQuadrant {
  if (side === 'interne') return polarity === 'favorable' ? 'forces' : 'faiblesses';
  return polarity === 'favorable' ? 'opportunites' : 'menaces';
}

/** Les constats d'une case, du plus important au moins important. */
export function itemsOfQuadrant(items: SwotItem[], quadrant: SwotQuadrant): SwotItem[] {
  return items
    .filter((item) => quadrantOf(item.side, item.polarity) === quadrant)
    .sort((a, b) => b.weight - a.weight);
}

/** Les constats d'une dimension PESTEL ou d'un domaine interne. */
export function itemsOfCategory(
  items: SwotItem[],
  side: SwotSide,
  category: PestelDimension | InternalDomain,
): SwotItem[] {
  return items.filter((item) => item.side === side && item.category === category);
}

export interface SwotSummary {
  forces: number;
  faiblesses: number;
  opportunites: number;
  menaces: number;
  total: number;
  /** dimensions PESTEL sur lesquelles rien n'a encore été noté */
  missingPestel: PestelDimension[];
  /** domaines internes encore vides */
  missingInternal: InternalDomain[];
}

/** Compte les constats et signale ce qui n'a pas encore été exploré. */
export function summarize(items: SwotItem[]): SwotSummary {
  const count = (quadrant: SwotQuadrant) => itemsOfQuadrant(items, quadrant).length;
  return {
    forces: count('forces'),
    faiblesses: count('faiblesses'),
    opportunites: count('opportunites'),
    menaces: count('menaces'),
    total: items.length,
    missingPestel: PESTEL_ORDER.filter(
      (dimension) => itemsOfCategory(items, 'externe', dimension).length === 0,
    ),
    missingInternal: INTERNAL_ORDER.filter(
      (domain) => itemsOfCategory(items, 'interne', domain).length === 0,
    ),
  };
}

/**
 * Avancement du diagnostic, en pourcentage.
 *
 * La règle est volontairement simple et lisible : douze cases à explorer
 * (six dimensions PESTEL, six domaines internes), une case compte pour
 * remplie dès qu'elle porte au moins un constat. Ce n'est pas une note,
 * seulement un repère de ce qui reste à regarder.
 */
export function completion(items: SwotItem[]): number {
  const explored =
    PESTEL_ORDER.filter((d) => itemsOfCategory(items, 'externe', d).length > 0).length +
    INTERNAL_ORDER.filter((d) => itemsOfCategory(items, 'interne', d).length > 0).length;
  return Math.round((explored / (PESTEL_ORDER.length + INTERNAL_ORDER.length)) * 100);
}

/** Texte brut d'une analyse — recherche et exports. */
export function swotToText(analysis: SwotAnalysis): string {
  return [analysis.title, analysis.company, ...analysis.items.map((item) => item.text)].join(' ');
}
