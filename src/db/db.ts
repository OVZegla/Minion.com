import Dexie, { type Table } from 'dexie';
import type {
  AcademicYear,
  AppNotification,
  CalendarEvent,
  CaseLaw,
  Chapter,
  Course,
  DocumentItem,
  Exam,
  Flashcard,
  FocusSession,
  Grade,
  InboxItem,
  LegalTerm,
  MethodDoc,
  Note,
  Reminder,
  RevisionSession,
  SAE,
  SAETask,
  Semester,
  StudySheet,
  Subject,
  Task,
  UserSettings,
} from '@/types';

/**
 * Base locale IndexedDB.
 * Local-first : aucune connexion requise, aucune cle API, tout reste sur l'appareil.
 * L'ajout ulterieur d'une synchronisation (Supabase, Postgres...) se ferait
 * au-dessus de cette couche, sans changer les modeles.
 */
export class MinionDB extends Dexie {
  settings!: Table<UserSettings, string>;
  academicYears!: Table<AcademicYear, string>;
  semesters!: Table<Semester, string>;
  subjects!: Table<Subject, string>;
  chapters!: Table<Chapter, string>;
  courses!: Table<Course, string>;
  notes!: Table<Note, string>;
  inbox!: Table<InboxItem, string>;
  tasks!: Table<Task, string>;
  events!: Table<CalendarEvent, string>;
  exams!: Table<Exam, string>;
  revisionSessions!: Table<RevisionSession, string>;
  flashcards!: Table<Flashcard, string>;
  studySheets!: Table<StudySheet, string>;
  documents!: Table<DocumentItem, string>;
  saes!: Table<SAE, string>;
  saeTasks!: Table<SAETask, string>;
  grades!: Table<Grade, string>;
  focusSessions!: Table<FocusSession, string>;
  caseLaws!: Table<CaseLaw, string>;
  legalTerms!: Table<LegalTerm, string>;
  methodDocs!: Table<MethodDoc, string>;
  notifications!: Table<AppNotification, string>;
  reminders!: Table<Reminder, string>;

  constructor() {
    super('minion-com');
    this.version(1).stores({
      settings: 'id',
      academicYears: 'id, isArchived',
      semesters: 'id, academicYearId, isArchived',
      subjects: 'id, semesterId, academicYearId, isArchived, name',
      chapters: 'id, subjectId, order',
      courses: 'id, subjectId, chapterId, date, favorite, number',
      notes: 'id, courseId, subjectId',
      inbox: 'id, status, createdAt',
      tasks: 'id, subjectId, courseId, examId, saeId, status, dueDate, priority',
      events: 'id, date, subjectId, courseId, examId, type, revisionSessionId',
      exams: 'id, subjectId, date',
      revisionSessions: 'id, subjectId, examId, chapterId, date, status',
      flashcards: 'id, subjectId, chapterId, courseId, sheetId',
      studySheets: 'id, subjectId, chapterId, courseId, favorite',
      documents: 'id, subjectId, courseId, taskId, examId, saeId, sheetId, favorite, createdAt',
      saes: 'id, semesterId, status',
      saeTasks: 'id, saeId, status, order',
      grades: 'id, subjectId, date',
      focusSessions: 'id, subjectId, courseId, startedAt',
      caseLaws: 'id, subjectId, courseId, favorite',
      legalTerms: 'id, subjectId, chapterId, term, favorite',
      methodDocs: 'id, template, subjectId, courseId',
      notifications: 'id, read, createdAt, category',
      reminders: 'id, targetType, targetId, fireAt, fired',
    });
  }
}

let _db: MinionDB | null = null;

/** Instance unique, creee uniquement cote navigateur. */
export function getDB(): MinionDB {
  if (!_db) _db = new MinionDB();
  return _db;
}

export const db = new Proxy({} as MinionDB, {
  get(_target, prop) {
    const instance = getDB();
    const value = Reflect.get(instance as object, prop);
    return typeof value === 'function' ? value.bind(instance) : value;
  },
});

/** Ordre stable des tables — utilise par l'export/import et la remise a zero. */
export const TABLE_NAMES = [
  'settings',
  'academicYears',
  'semesters',
  'subjects',
  'chapters',
  'courses',
  'notes',
  'inbox',
  'tasks',
  'events',
  'exams',
  'revisionSessions',
  'flashcards',
  'studySheets',
  'documents',
  'saes',
  'saeTasks',
  'grades',
  'focusSessions',
  'caseLaws',
  'legalTerms',
  'methodDocs',
  'notifications',
  'reminders',
] as const;

export type TableName = (typeof TABLE_NAMES)[number];
