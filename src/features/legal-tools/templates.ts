import type { MethodTemplate } from '@/types';

export interface TemplateField {
  key: string;
  label: string;
  multiline?: boolean;
  placeholder?: string;
}

export interface TemplateDefinition {
  id: MethodTemplate;
  name: string;
  description: string;
  /** champs d'en-tete (references) */
  header: TemplateField[];
  /** corps du document */
  body: TemplateField[];
  /** bloc repetable (ex : plusieurs problemes juridiques) */
  repeatable?: { label: string; fields: TemplateField[] };
}

/**
 * Modeles de methodologie juridique.
 * Ce sont des trames de travail universitaire : l'application ne donne
 * aucun conseil juridique, elle aide seulement a structurer le devoir.
 */
export const TEMPLATES: Record<MethodTemplate, TemplateDefinition> = {
  fiche_arret: {
    id: 'fiche_arret',
    name: 'Fiche d’arrêt',
    description: 'Résumer une décision de justice de façon structurée.',
    header: [
      { key: 'juridiction', label: 'Juridiction' },
      { key: 'chambre', label: 'Chambre' },
      { key: 'date', label: 'Date' },
      { key: 'reference', label: 'Référence' },
    ],
    body: [
      { key: 'faits', label: 'Faits', multiline: true },
      { key: 'procedure', label: 'Procédure', multiline: true },
      { key: 'pretentions', label: 'Prétentions des parties', multiline: true },
      { key: 'probleme', label: 'Problème de droit', multiline: true },
      { key: 'solution', label: 'Solution', multiline: true },
      { key: 'motifs', label: 'Motifs', multiline: true },
      { key: 'portee', label: 'Portée', multiline: true },
    ],
  },
  cas_pratique: {
    id: 'cas_pratique',
    name: 'Cas pratique',
    description: 'Traiter un ou plusieurs problèmes juridiques à partir de faits.',
    header: [],
    body: [{ key: 'faits', label: '1. Faits pertinents', multiline: true }],
    repeatable: {
      label: 'Problème juridique',
      fields: [
        { key: 'qualification', label: '2. Qualification juridique', multiline: true },
        { key: 'probleme', label: '3. Problème juridique', multiline: true },
        { key: 'regle', label: '4. Règle de droit', multiline: true },
        { key: 'application', label: '5. Application au cas', multiline: true },
        { key: 'conclusion', label: '6. Conclusion', multiline: true },
      ],
    },
  },
  dissertation: {
    id: 'dissertation',
    name: 'Dissertation juridique',
    description: 'Construire une introduction et un plan en deux parties.',
    header: [{ key: 'sujet', label: 'Sujet' }],
    body: [
      { key: 'definitions', label: 'Définition des termes', multiline: true },
      { key: 'delimitation', label: 'Délimitation', multiline: true },
      { key: 'interet', label: 'Intérêt du sujet', multiline: true },
      { key: 'problematique', label: 'Problématique', multiline: true },
      { key: 'annonce', label: 'Annonce du plan', multiline: true },
      { key: 'i', label: 'I.' },
      { key: 'i_a', label: 'I. A.', multiline: true },
      { key: 'i_b', label: 'I. B.', multiline: true },
      { key: 'ii', label: 'II.' },
      { key: 'ii_a', label: 'II. A.', multiline: true },
      { key: 'ii_b', label: 'II. B.', multiline: true },
    ],
  },
  commentaire: {
    id: 'commentaire',
    name: 'Commentaire d’arrêt',
    description: 'Analyser une décision et en construire le plan.',
    header: [{ key: 'reference', label: 'Référence de l’arrêt' }],
    body: [
      { key: 'contexte', label: 'Contexte', multiline: true },
      { key: 'problematique', label: 'Problématique', multiline: true },
      { key: 'interet', label: 'Intérêt', multiline: true },
      { key: 'plan', label: 'Plan', multiline: true },
      { key: 'i', label: 'I.' },
      { key: 'i_a', label: 'I. A.', multiline: true },
      { key: 'i_b', label: 'I. B.', multiline: true },
      { key: 'ii', label: 'II.' },
      { key: 'ii_a', label: 'II. A.', multiline: true },
      { key: 'ii_b', label: 'II. B.', multiline: true },
    ],
  },
};

export const TEMPLATE_LIST = Object.values(TEMPLATES);
