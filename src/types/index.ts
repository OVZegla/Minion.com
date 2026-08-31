/**
 * minion.com — modele de donnees
 *
 * Convention:
 *  - tous les identifiants sont des chaines (nanoid-like, cf. lib/id.ts)
 *  - toutes les dates "jour" sont stockees en ISO court "YYYY-MM-DD" (local, pas de fuseau)
 *  - toutes les dates+heures sont stockees en ISO complet "YYYY-MM-DDTHH:mm" (local)
 *  - les horaires seuls sont "HH:mm"
 *
 * Ce choix evite les decalages de fuseau horaire pour un usage strictement local.
 */

export type ID = string;
/** "YYYY-MM-DD" */
export type DateISO = string;
/** "YYYY-MM-DDTHH:mm" */
export type DateTimeISO = string;
/** "HH:mm" */
export type TimeHM = string;

/* ------------------------------------------------------------------ */
/* Reglages & structure academique                                     */
/* ------------------------------------------------------------------ */

export type ThemeMode = 'light' | 'dark' | 'system';

export interface NotificationPrefs {
  courses: boolean;
  tasks: boolean;
  exams: boolean;
  revisions: boolean;
  sae: boolean;
}

export interface UserSettings {
  id: 'app';
  displayName: string;
  /** Intitule libre de la formation, ex: "BUT Carrieres Juridiques" */
  program: string;
  /** ex: "BUT 1" — libre */
  yearLabel: string;
  /** Parcours optionnel (BUT 2 / BUT 3), jamais impose */
  track?: string;
  currentAcademicYearId: ID | null;
  currentSemesterId: ID | null;
  theme: ThemeMode;
  weekStartsOnMonday: boolean;
  dayStartHour: number;
  dayEndHour: number;
  onboardingDone: boolean;
  demoDataLoaded: boolean;
  /** Affiche « minion.com » en haut de l'application (discretion en cours). */
  showAppName: boolean;
  notifications: NotificationPrefs;
  createdAt: DateTimeISO;
  updatedAt: DateTimeISO;
}

export interface AcademicYear {
  id: ID;
  /** ex: "2026 / 2027" */
  label: string;
  startDate: DateISO;
  endDate: DateISO;
  yearLabel: string;
  isArchived: boolean;
}

export interface Semester {
  id: ID;
  academicYearId: ID;
  /** ex: "Semestre 1" */
  label: string;
  /** 1..6 */
  number: number;
  startDate: DateISO;
  endDate: DateISO;
  isArchived: boolean;
}

/* ------------------------------------------------------------------ */
/* Matieres, chapitres, cours                                          */
/* ------------------------------------------------------------------ */

export type SubjectColorKey =
  | 'violet'
  | 'blue'
  | 'rose'
  | 'orange'
  | 'coral'
  | 'green'
  | 'sky'
  | 'amber'
  | 'teal'
  | 'indigo'
  | 'plum'
  | 'sand'
  | 'mint'
  | 'slate';

export interface Subject {
  id: ID;
  semesterId: ID;
  academicYearId: ID;
  name: string;
  shortName: string;
  color: SubjectColorKey;
  /** cle d'icone lucide, cf. lib/icons.ts */
  icon: string;
  teacher?: string;
  room?: string;
  description?: string;
  isArchived: boolean;
  createdAt: DateTimeISO;
  updatedAt: DateTimeISO;
}

/** 4 etats de maitrise — indicateurs personnels, pas une mesure scientifique */
export type MasteryLevel = 'not_started' | 'to_learn' | 'to_review' | 'mastered';

export interface Chapter {
  id: ID;
  subjectId: ID;
  title: string;
  order: number;
  mastery: MasteryLevel;
  notes?: string;
  updatedAt: DateTimeISO;
}

export type CourseKind = 'CM' | 'TD' | 'TP' | 'AUTRE';

/** Blocs de l'editeur de cours — contenu structure, jamais du HTML brut */
export type CourseBlock =
  | { id: ID; type: 'heading'; level: 1 | 2 | 3; text: string }
  | { id: ID; type: 'paragraph'; text: string }
  | { id: ID; type: 'bullets'; items: string[] }
  | { id: ID; type: 'numbered'; items: string[] }
  | { id: ID; type: 'checklist'; items: { text: string; done: boolean }[] }
  | { id: ID; type: 'quote'; text: string; source?: string }
  | { id: ID; type: 'divider' }
  | { id: ID; type: 'link'; url: string; label?: string }
  | { id: ID; type: 'table'; header: string[]; rows: string[][] }
  | { id: ID; type: 'callout'; variant: 'remember' | 'definition' | 'example' | 'warning'; title?: string; text: string }
  | { id: ID; type: 'article'; code: string; reference: string; text: string; comment?: string }
  | {
      id: ID;
      type: 'caselaw';
      court: string;
      chamber?: string;
      date?: string;
      number?: string;
      principle?: string;
      scope?: string;
    };

export type CourseStatus = 'to_write' | 'in_progress' | 'complete';

export interface Course {
  id: ID;
  subjectId: ID;
  chapterId?: ID | null;
  title: string;
  /** numero d'ordre dans la matiere (Cours 01, 02...) */
  number: number;
  date?: DateISO;
  kind: CourseKind;
  teacher?: string;
  room?: string;
  blocks: CourseBlock[];
  keywords: string[];
  status: CourseStatus;
  mastery: MasteryLevel;
  favorite: boolean;
  createdAt: DateTimeISO;
  updatedAt: DateTimeISO;
}

/** Note libre rattachee a un cours et/ou une matiere */
export interface Note {
  id: ID;
  courseId?: ID | null;
  subjectId?: ID | null;
  title: string;
  text: string;
  createdAt: DateTimeISO;
  updatedAt: DateTimeISO;
}

/* ------------------------------------------------------------------ */
/* Boite d'entree                                                      */
/* ------------------------------------------------------------------ */

export interface InboxItem {
  id: ID;
  text: string;
  /** id d'un Document deja stocke (photo / piece jointe) */
  attachmentId?: ID | null;
  status: 'pending' | 'filed' | 'archived';
  filedAs?: string;
  createdAt: DateTimeISO;
}

/* ------------------------------------------------------------------ */
/* Taches                                                              */
/* ------------------------------------------------------------------ */

export type TaskType =
  | 'devoir'
  | 'td'
  | 'lecture'
  | 'fiche'
  | 'revision'
  | 'projet'
  | 'admin'
  | 'perso';

export type Priority = 'low' | 'normal' | 'high' | 'urgent';
export type TaskStatus = 'todo' | 'doing' | 'done';

export interface TaskSubItem {
  id: ID;
  text: string;
  done: boolean;
}

export interface Task {
  id: ID;
  title: string;
  description?: string;
  subjectId?: ID | null;
  courseId?: ID | null;
  examId?: ID | null;
  saeId?: ID | null;
  type: TaskType;
  dueDate?: DateISO | null;
  dueTime?: TimeHM | null;
  priority: Priority;
  status: TaskStatus;
  subtasks: TaskSubItem[];
  /** minutes */
  estimatedMinutes?: number | null;
  completedAt?: DateTimeISO | null;
  createdAt: DateTimeISO;
  updatedAt: DateTimeISO;
}

/* ------------------------------------------------------------------ */
/* Calendrier                                                          */
/* ------------------------------------------------------------------ */

export type EventType =
  | 'cours'
  | 'cm'
  | 'td'
  | 'tp'
  | 'examen'
  | 'devoir'
  | 'revision'
  | 'sae'
  | 'rdv'
  | 'perso';

export interface Recurrence {
  freq: 'weekly';
  interval: number;
  /** 0 = dimanche ... 6 = samedi */
  byWeekday: number[];
  until?: DateISO | null;
  /** dates exclues "YYYY-MM-DD" */
  exceptions: DateISO[];
}

export interface CalendarEvent {
  id: ID;
  title: string;
  type: EventType;
  subjectId?: ID | null;
  courseId?: ID | null;
  examId?: ID | null;
  taskId?: ID | null;
  saeId?: ID | null;
  revisionSessionId?: ID | null;
  /** date de debut (premiere occurrence si recurrent) */
  date: DateISO;
  startTime: TimeHM;
  endTime: TimeHM;
  allDay: boolean;
  room?: string;
  teacher?: string;
  notes?: string;
  recurrence?: Recurrence | null;
  createdAt: DateTimeISO;
  updatedAt: DateTimeISO;
}

/** Occurrence calculee (jamais stockee) */
export interface EventOccurrence {
  key: string;
  event: CalendarEvent;
  date: DateISO;
  start: Date;
  end: Date;
  isRecurring: boolean;
}

/* ------------------------------------------------------------------ */
/* Examens & revisions                                                 */
/* ------------------------------------------------------------------ */

export type ExamKind = 'partiel' | 'controle' | 'oral' | 'tp' | 'rattrapage' | 'autre';

export interface Exam {
  id: ID;
  subjectId: ID;
  title: string;
  kind: ExamKind;
  date: DateISO;
  time?: TimeHM | null;
  durationMinutes?: number | null;
  room?: string;
  coefficient?: number | null;
  notes?: string;
  chapterIds: ID[];
  createdAt: DateTimeISO;
  updatedAt: DateTimeISO;
}

export type RevisionStatus = 'planned' | 'done' | 'postponed' | 'cancelled';

export interface RevisionSession {
  id: ID;
  subjectId: ID;
  examId?: ID | null;
  chapterId?: ID | null;
  courseId?: ID | null;
  title: string;
  date: DateISO;
  time?: TimeHM | null;
  durationMinutes: number;
  status: RevisionStatus;
  notes?: string;
  createdAt: DateTimeISO;
  updatedAt: DateTimeISO;
}

/* ------------------------------------------------------------------ */
/* Flashcards & fiches                                                 */
/* ------------------------------------------------------------------ */

export type FlashcardResult = 'again' | 'hard' | 'good' | 'easy';

export interface Flashcard {
  id: ID;
  subjectId: ID;
  chapterId?: ID | null;
  courseId?: ID | null;
  sheetId?: ID | null;
  question: string;
  answer: string;
  mastery: MasteryLevel;
  /** champs prevus pour une future repetition espacee (non utilises en V1) */
  lastReviewedAt?: DateTimeISO | null;
  dueAt?: DateISO | null;
  intervalDays?: number | null;
  ease?: number | null;
  reviewCount: number;
  createdAt: DateTimeISO;
  updatedAt: DateTimeISO;
}

export interface StudySheetSection {
  id: ID;
  title: string;
  content: string;
}

export interface StudySheet {
  id: ID;
  subjectId: ID;
  chapterId?: ID | null;
  courseId?: ID | null;
  title: string;
  sections: StudySheetSection[];
  mastery: MasteryLevel;
  favorite: boolean;
  createdAt: DateTimeISO;
  updatedAt: DateTimeISO;
}

/* ------------------------------------------------------------------ */
/* Documents                                                           */
/* ------------------------------------------------------------------ */

export type DocKind = 'pdf' | 'word' | 'ppt' | 'image' | 'link' | 'autre';

export interface DocumentItem {
  id: ID;
  name: string;
  kind: DocKind;
  /** taille en octets (0 pour un lien) */
  size: number;
  mimeType?: string;
  /** URL externe pour kind === 'link' */
  url?: string;
  /**
   * Contenu binaire stocke localement dans IndexedDB.
   * Une future version pourra remplacer ce champ par une reference cloud
   * (cf. storageRef) sans changer le reste du modele.
   */
  blob?: Blob;
  storageRef?: string | null;
  /**
   * Chemin du fichier reellement ecrit sur le disque par l'application de
   * bureau (classement automatique). Absent sur le web.
   */
  localPath?: string | null;
  subjectId?: ID | null;
  courseId?: ID | null;
  taskId?: ID | null;
  examId?: ID | null;
  saeId?: ID | null;
  sheetId?: ID | null;
  favorite: boolean;
  createdAt: DateTimeISO;
}

/* ------------------------------------------------------------------ */
/* SAE                                                                 */
/* ------------------------------------------------------------------ */

export type SAEStatus = 'upcoming' | 'in_progress' | 'to_deliver' | 'done';

export interface SAEMember {
  id: ID;
  firstName: string;
  email?: string;
  role?: string;
}

export interface SAE {
  id: ID;
  semesterId: ID;
  code: string;
  title: string;
  description?: string;
  startDate?: DateISO | null;
  dueDate?: DateISO | null;
  status: SAEStatus;
  subjectIds: ID[];
  members: SAEMember[];
  notes?: string;
  createdAt: DateTimeISO;
  updatedAt: DateTimeISO;
}

export type SAETaskStatus = 'todo' | 'doing' | 'done';

export interface SAETask {
  id: ID;
  saeId: ID;
  title: string;
  status: SAETaskStatus;
  assignee?: string;
  dueDate?: DateISO | null;
  order: number;
}

/* ------------------------------------------------------------------ */
/* Resultats, focus, outils juridiques                                 */
/* ------------------------------------------------------------------ */

export interface Grade {
  id: ID;
  subjectId: ID;
  label: string;
  value: number;
  outOf: number;
  coefficient?: number | null;
  date: DateISO;
  notes?: string;
  createdAt: DateTimeISO;
}

export interface FocusSession {
  id: ID;
  subjectId?: ID | null;
  courseId?: ID | null;
  chapterId?: ID | null;
  label?: string;
  plannedMinutes: number | null;
  /** duree reellement travaillee, en secondes */
  seconds: number;
  startedAt: DateTimeISO;
  endedAt?: DateTimeISO | null;
  completed: boolean;
}

export interface CaseLaw {
  id: ID;
  court: string;
  chamber?: string;
  date?: DateISO | null;
  /** date affichee librement si non normalisee */
  dateLabel?: string;
  number?: string;
  subjectId?: ID | null;
  courseId?: ID | null;
  theme?: string;
  facts?: string;
  principle?: string;
  solution?: string;
  scope?: string;
  tags: string[];
  favorite: boolean;
  createdAt: DateTimeISO;
  updatedAt: DateTimeISO;
}

export interface LegalTerm {
  id: ID;
  term: string;
  definition: string;
  subjectId?: ID | null;
  chapterId?: ID | null;
  examples?: string;
  favorite: boolean;
  createdAt: DateTimeISO;
  updatedAt: DateTimeISO;
}

/* ------------------------------------------------------------------ */
/* Methodologie juridique                                              */
/* ------------------------------------------------------------------ */

export type MethodTemplate = 'fiche_arret' | 'cas_pratique' | 'dissertation' | 'commentaire';

export interface MethodDoc {
  id: ID;
  template: MethodTemplate;
  title: string;
  subjectId?: ID | null;
  courseId?: ID | null;
  /** cle de champ -> contenu ; les cles dependent du modele (cf. features/legal-tools) */
  fields: Record<string, string>;
  /** cas pratique : plusieurs problemes juridiques */
  repeatable?: { id: ID; fields: Record<string, string> }[];
  createdAt: DateTimeISO;
  updatedAt: DateTimeISO;
}

/* ------------------------------------------------------------------ */
/* Notifications & rappels                                             */
/* ------------------------------------------------------------------ */

export type NotifCategory = 'courses' | 'tasks' | 'exams' | 'revisions' | 'sae' | 'inbox';

export interface AppNotification {
  id: ID;
  category: NotifCategory;
  title: string;
  body?: string;
  href?: string;
  read: boolean;
  createdAt: DateTimeISO;
}

export type ReminderOffset =
  | 'at_time'
  | '30m'
  | '1h'
  | '1d'
  | '3d'
  | '1w'
  | 'custom';

export interface Reminder {
  id: ID;
  targetType: 'task' | 'exam' | 'event' | 'revision' | 'sae';
  targetId: ID;
  offset: ReminderOffset;
  /** minutes avant, utilise quand offset === 'custom' */
  customMinutes?: number | null;
  fireAt: DateTimeISO;
  fired: boolean;
}
