import type { CourseKind, MasteryLevel, SubjectColorKey } from '@/types';

/**
 * DONNEES DE DEMONSTRATION — entierement fictives.
 * Elles servent uniquement a montrer l'interface.
 * Aucun horaire, aucun enseignant, aucune note ici ne correspond a une
 * formation reelle. L'utilisatrice peut tout supprimer ou tout modifier.
 */

export interface SeedSubject {
  key: string;
  name: string;
  shortName: string;
  color: SubjectColorKey;
  icon: string;
  teacher?: string;
  room?: string;
  description?: string;
  chapters: { title: string; mastery: MasteryLevel }[];
  courses: { title: string; kind: CourseKind; chapterIndex?: number }[];
}

export const SEED_SUBJECTS: SeedSubject[] = [
  {
    key: 'intro',
    name: 'Introduction générale au droit',
    shortName: 'Intro. droit',
    color: 'violet',
    icon: 'Scale',
    teacher: 'Mme Renaud',
    room: 'Amphi A',
    description: 'Les bases : ce qu’est la règle de droit, ses sources et son application.',
    chapters: [
      { title: 'Qu’est-ce que le droit ?', mastery: 'mastered' },
      { title: 'Les caractères de la règle de droit', mastery: 'mastered' },
      { title: 'Les sources du droit', mastery: 'mastered' },
      { title: 'La hiérarchie des normes', mastery: 'mastered' },
      { title: 'L’application de la loi dans le temps', mastery: 'to_review' },
      { title: 'La preuve', mastery: 'to_learn' },
    ],
    courses: [
      { title: 'Qu’est-ce que le droit ?', kind: 'CM', chapterIndex: 0 },
      { title: 'Les caractères de la règle de droit', kind: 'CM', chapterIndex: 1 },
      { title: 'Les sources du droit', kind: 'CM', chapterIndex: 2 },
      { title: 'La hiérarchie des normes', kind: 'CM', chapterIndex: 3 },
      { title: 'TD — Rechercher une source du droit', kind: 'TD', chapterIndex: 2 },
    ],
  },
  {
    key: 'constit',
    name: 'Droit constitutionnel 1',
    shortName: 'Droit constit.',
    color: 'blue',
    icon: 'Landmark',
    teacher: 'M. Delaunay',
    room: 'Amphi A',
    description: 'L’État, la Constitution, la séparation des pouvoirs et les institutions.',
    chapters: [
      { title: 'L’État', mastery: 'mastered' },
      { title: 'La Constitution', mastery: 'mastered' },
      { title: 'La hiérarchie des normes', mastery: 'mastered' },
      { title: 'La séparation des pouvoirs', mastery: 'mastered' },
      { title: 'Les régimes politiques', mastery: 'mastered' },
      { title: 'Les institutions de la Ve République', mastery: 'to_learn' },
      { title: 'Le contrôle de constitutionnalité', mastery: 'not_started' },
    ],
    courses: [
      { title: 'Notions fondamentales', kind: 'CM', chapterIndex: 0 },
      { title: 'L’État et ses éléments constitutifs', kind: 'CM', chapterIndex: 0 },
      { title: 'La Constitution', kind: 'CM', chapterIndex: 1 },
      { title: 'La hiérarchie des normes', kind: 'CM', chapterIndex: 2 },
      { title: 'La séparation des pouvoirs', kind: 'CM', chapterIndex: 3 },
      { title: 'Les régimes politiques', kind: 'TD', chapterIndex: 4 },
    ],
  },
  {
    key: 'personnes',
    name: 'Droit des personnes et de la famille',
    shortName: 'Droit personnes',
    color: 'rose',
    icon: 'Users',
    teacher: 'Mme Aubert',
    room: 'Amphi A',
    description: 'La personnalité juridique, l’identification et la protection de la personne.',
    chapters: [
      { title: 'La personnalité juridique', mastery: 'mastered' },
      { title: 'La personne physique', mastery: 'mastered' },
      { title: 'L’identification de la personne', mastery: 'to_review' },
      { title: 'La protection de la personne', mastery: 'to_review' },
      { title: 'Les incapacités', mastery: 'to_learn' },
      { title: 'La famille', mastery: 'not_started' },
    ],
    courses: [
      { title: 'La personnalité juridique', kind: 'CM', chapterIndex: 0 },
      { title: 'La personne physique', kind: 'CM', chapterIndex: 1 },
      { title: 'Identification de la personne', kind: 'CM', chapterIndex: 2 },
      { title: 'Protection de la personne', kind: 'CM', chapterIndex: 3 },
      { title: 'TD — Cas pratique sur la personnalité juridique', kind: 'TD', chapterIndex: 0 },
    ],
  },
  {
    key: 'judiciaire',
    name: 'Organisation judiciaire',
    shortName: 'Orga. judiciaire',
    color: 'coral',
    icon: 'Gavel',
    teacher: 'M. Perrin',
    room: 'Amphi B',
    description: 'Les juridictions, les acteurs de la justice et les voies de recours.',
    chapters: [
      { title: 'Les principes de la justice', mastery: 'mastered' },
      { title: 'L’ordre judiciaire', mastery: 'to_review' },
      { title: 'L’ordre administratif', mastery: 'to_review' },
      { title: 'Les acteurs de la justice', mastery: 'to_learn' },
      { title: 'Les voies de recours', mastery: 'not_started' },
    ],
    courses: [
      { title: 'Les principes de la justice', kind: 'CM', chapterIndex: 0 },
      { title: 'L’ordre judiciaire', kind: 'CM', chapterIndex: 1 },
      { title: 'L’ordre administratif', kind: 'CM', chapterIndex: 2 },
    ],
  },
  {
    key: 'methodo',
    name: 'Méthodologie juridique',
    shortName: 'Méthodo.',
    color: 'orange',
    icon: 'PenLine',
    teacher: 'Mme Renaud',
    room: 'B112',
    description: 'Fiche d’arrêt, cas pratique, dissertation, commentaire d’arrêt.',
    chapters: [
      { title: 'Le vocabulaire juridique', mastery: 'mastered' },
      { title: 'Lire une décision de justice', mastery: 'mastered' },
      { title: 'La fiche d’arrêt', mastery: 'to_review' },
      { title: 'Le cas pratique', mastery: 'to_learn' },
      { title: 'La dissertation juridique', mastery: 'to_learn' },
    ],
    courses: [
      { title: 'Le vocabulaire juridique', kind: 'TD', chapterIndex: 0 },
      { title: 'Lire une décision de justice', kind: 'TD', chapterIndex: 1 },
      { title: 'La fiche d’arrêt', kind: 'TD', chapterIndex: 2 },
      { title: 'Le cas pratique', kind: 'TD', chapterIndex: 3 },
    ],
  },
  {
    key: 'institutions',
    name: 'Institutions publiques 1',
    shortName: 'Institutions',
    color: 'indigo',
    icon: 'Building2',
    teacher: 'M. Delaunay',
    room: 'Amphi B',
    description: 'L’administration, les collectivités territoriales et les services publics.',
    chapters: [
      { title: 'L’État et l’administration', mastery: 'to_learn' },
      { title: 'Les collectivités territoriales', mastery: 'to_learn' },
      { title: 'La fonction publique', mastery: 'not_started' },
      { title: 'Les services publics', mastery: 'not_started' },
    ],
    courses: [
      { title: 'L’État et l’administration', kind: 'CM', chapterIndex: 0 },
      { title: 'Les collectivités territoriales', kind: 'CM', chapterIndex: 1 },
    ],
  },
  {
    key: 'compta',
    name: 'Comptabilité générale 1',
    shortName: 'Compta.',
    color: 'green',
    icon: 'Calculator',
    teacher: 'Mme Lambert',
    room: 'B204',
    description: 'Bilan, compte de résultat, écritures courantes et TVA.',
    chapters: [
      { title: 'Le bilan', mastery: 'mastered' },
      { title: 'Le compte de résultat', mastery: 'to_review' },
      { title: 'Le principe de la partie double', mastery: 'to_learn' },
      { title: 'Les écritures courantes', mastery: 'to_learn' },
      { title: 'La TVA', mastery: 'not_started' },
    ],
    courses: [
      { title: 'Le bilan', kind: 'TD', chapterIndex: 0 },
      { title: 'Le compte de résultat', kind: 'TD', chapterIndex: 1 },
      { title: 'La partie double', kind: 'TD', chapterIndex: 2 },
    ],
  },
  {
    key: 'orga',
    name: 'Structure et fonctionnement des organisations et RSE',
    shortName: 'Organisations',
    color: 'teal',
    icon: 'Network',
    teacher: 'M. Vidal',
    room: 'B205',
    description: 'Formes d’organisation, parties prenantes et responsabilité sociétale.',
    chapters: [
      { title: 'L’entreprise et son environnement', mastery: 'to_review' },
      { title: 'Les formes d’organisation', mastery: 'to_learn' },
      { title: 'La RSE', mastery: 'to_learn' },
      { title: 'Les parties prenantes', mastery: 'not_started' },
    ],
    courses: [
      { title: 'L’entreprise et son environnement', kind: 'CM', chapterIndex: 0 },
      { title: 'Les formes d’organisation', kind: 'CM', chapterIndex: 1 },
    ],
  },
  {
    key: 'expression',
    name: 'Expression et communication',
    shortName: 'Expression',
    color: 'plum',
    icon: 'MessageSquare',
    teacher: 'Mme Caron',
    room: 'B108',
    description: 'Prise de notes, synthèse de documents et expression orale.',
    chapters: [
      { title: 'La prise de notes', mastery: 'to_review' },
      { title: 'La synthèse de documents', mastery: 'to_review' },
      { title: 'L’expression orale', mastery: 'to_learn' },
    ],
    courses: [
      { title: 'La prise de notes efficace', kind: 'TD', chapterIndex: 0 },
      { title: 'La synthèse de documents', kind: 'TD', chapterIndex: 1 },
    ],
  },
  {
    key: 'anglais',
    name: 'Anglais appliqué aux domaines professionnels',
    shortName: 'Anglais',
    color: 'sky',
    icon: 'Languages',
    teacher: 'Ms Harper',
    room: 'C103',
    description: 'Vocabulaire juridique en anglais et communication professionnelle.',
    chapters: [
      { title: 'Legal vocabulary', mastery: 'to_review' },
      { title: 'Presenting a case', mastery: 'to_learn' },
      { title: 'Business writing', mastery: 'to_learn' },
    ],
    courses: [
      { title: 'Legal vocabulary', kind: 'TD', chapterIndex: 0 },
      { title: 'Presenting a case', kind: 'TD', chapterIndex: 1 },
    ],
  },
  {
    key: 'numerique',
    name: 'Outils numériques et communication',
    shortName: 'Outils num.',
    color: 'slate',
    icon: 'Laptop',
    teacher: 'M. Fabre',
    room: 'Salle informatique',
    description: 'Traitement de texte, tableur et recherche documentaire.',
    chapters: [
      { title: 'Traitement de texte avancé', mastery: 'mastered' },
      { title: 'Tableur', mastery: 'to_learn' },
      { title: 'Recherche documentaire juridique', mastery: 'to_learn' },
    ],
    courses: [
      { title: 'Mise en forme d’un document long', kind: 'TP', chapterIndex: 0 },
      { title: 'Premiers pas sur le tableur', kind: 'TP', chapterIndex: 1 },
    ],
  },
  {
    key: 'ppp',
    name: 'Projet personnel et professionnel',
    shortName: 'PPP',
    color: 'sand',
    icon: 'Compass',
    teacher: 'Mme Caron',
    description: 'Découverte des métiers du droit et construction du projet.',
    chapters: [
      { title: 'Découverte des métiers du droit', mastery: 'to_learn' },
      { title: 'CV et lettre de motivation', mastery: 'not_started' },
    ],
    courses: [{ title: 'Les métiers du droit', kind: 'AUTRE', chapterIndex: 0 }],
  },
];

/** Emploi du temps hebdomadaire fictif (0 = dimanche, 1 = lundi...). */
export interface SeedSlot {
  weekday: number;
  start: string;
  end: string;
  subjectKey?: string;
  kind: CourseKind | 'PERSO';
  room?: string;
  title?: string;
}

export const SEED_TIMETABLE: SeedSlot[] = [
  { weekday: 1, start: '09:00', end: '10:30', subjectKey: 'intro', kind: 'CM', room: 'Amphi A' },
  { weekday: 1, start: '10:45', end: '12:15', subjectKey: 'constit', kind: 'CM', room: 'Amphi A' },
  { weekday: 1, start: '14:00', end: '15:30', subjectKey: 'methodo', kind: 'TD', room: 'B112' },
  { weekday: 1, start: '15:45', end: '17:15', subjectKey: 'expression', kind: 'TD', room: 'B108' },

  { weekday: 2, start: '08:30', end: '10:00', subjectKey: 'compta', kind: 'TD', room: 'B204' },
  { weekday: 2, start: '10:15', end: '11:45', subjectKey: 'judiciaire', kind: 'CM', room: 'Amphi B' },
  { weekday: 2, start: '13:30', end: '15:00', subjectKey: 'personnes', kind: 'CM', room: 'Amphi A' },
  { weekday: 2, start: '15:15', end: '16:45', subjectKey: 'anglais', kind: 'TD', room: 'C103' },

  { weekday: 3, start: '09:00', end: '10:30', subjectKey: 'institutions', kind: 'CM', room: 'Amphi B' },
  { weekday: 3, start: '10:45', end: '12:15', subjectKey: 'constit', kind: 'TD', room: 'B112' },

  { weekday: 4, start: '09:00', end: '10:30', subjectKey: 'orga', kind: 'CM', room: 'B205' },
  { weekday: 4, start: '10:45', end: '12:15', subjectKey: 'numerique', kind: 'TP', room: 'Salle informatique' },
  { weekday: 4, start: '14:00', end: '15:30', subjectKey: 'personnes', kind: 'TD', room: 'B108' },
  { weekday: 4, start: '15:45', end: '17:15', subjectKey: 'ppp', kind: 'AUTRE' },

  { weekday: 5, start: '09:00', end: '10:30', subjectKey: 'intro', kind: 'TD' },
  { weekday: 5, start: '10:45', end: '12:15', subjectKey: 'methodo', kind: 'TD' },
  { weekday: 5, start: '14:00', end: '17:00', kind: 'PERSO', title: 'Créneau de travail personnel' },
];

export const SEED_SAE = [
  {
    code: 'SAÉ 1.01',
    title:
      'Fonctions et activités juridiques, comptables, financières et/ou organisationnelles au sein d’une organisation',
    status: 'done' as const,
    subjectKeys: ['orga', 'compta'],
    offsetStart: -35,
    offsetDue: -7,
    description: 'Observation des grandes fonctions d’une organisation. Rendu déposé.',
  },
  {
    code: 'SAÉ 1.02',
    title:
      'Formulation d’un conseil juridique, comptable, financier et/ou organisationnel au sein d’une organisation',
    status: 'in_progress' as const,
    subjectKeys: ['intro', 'personnes', 'methodo'],
    offsetStart: -14,
    offsetDue: 16,
    description: 'Travail de groupe : formuler un conseil à partir d’une situation donnée.',
  },
  {
    code: 'SAÉ 1.03',
    title: 'Sécurisation d’activités d’une organisation',
    status: 'upcoming' as const,
    subjectKeys: ['judiciaire', 'institutions'],
    offsetStart: 21,
    offsetDue: 49,
    description: 'À démarrer après les partiels.',
  },
  {
    code: 'SAÉ 1.04',
    title: 'Rédaction professionnelle au sein d’une organisation',
    status: 'to_deliver' as const,
    subjectKeys: ['expression', 'numerique'],
    offsetStart: -21,
    offsetDue: 4,
    description: 'Dossier écrit à rendre en fin de semaine.',
  },
];

export const SEED_LEGAL_TERMS = [
  {
    term: 'Personne physique',
    definition: 'Être humain titulaire de droits et d’obligations.',
    subjectKey: 'personnes',
  },
  {
    term: 'Personne morale',
    definition: 'Groupement doté de la personnalité juridique (société, association, collectivité...).',
    subjectKey: 'personnes',
  },
  {
    term: 'Jurisprudence',
    definition: 'Ensemble des décisions rendues par les juridictions.',
    subjectKey: 'intro',
  },
  {
    term: 'Doctrine',
    definition: 'Ensemble des travaux et analyses des auteurs sur le droit.',
    subjectKey: 'intro',
  },
  {
    term: 'Constitution',
    definition: 'Texte qui organise les pouvoirs publics et garantit des droits fondamentaux.',
    subjectKey: 'constit',
  },
  {
    term: 'Hiérarchie des normes',
    definition: 'Classement des règles de droit : chaque norme doit respecter celles qui lui sont supérieures.',
    subjectKey: 'constit',
  },
  {
    term: 'Compétence',
    definition: 'Aptitude d’une juridiction à connaître d’un litige.',
    subjectKey: 'judiciaire',
  },
  {
    term: 'Juridiction',
    definition: 'Organe chargé de trancher les litiges en appliquant le droit.',
    subjectKey: 'judiciaire',
  },
];
