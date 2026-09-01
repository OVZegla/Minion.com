import { db, TABLE_NAMES, type TableName } from './db';
import { defaultSettings } from './defaults';
import { newId } from '@/lib/id';
import { nowISO } from '@/lib/dates';
import type {
  CalendarEvent,
  Chapter,
  Course,
  DocumentItem,
  Exam,
  Flashcard,
  ID,
  RevisionSession,
  SAE,
  StudySheet,
  Subject,
  Task,
  UserSettings,
} from '@/types';

/* ----------------------------- Reglages ----------------------------- */

export async function readSettings(): Promise<UserSettings> {
  const existing = await db.settings.get('app');
  if (existing) return existing;
  const created = defaultSettings();
  await db.settings.put(created);
  return created;
}

export async function updateSettings(patch: Partial<UserSettings>): Promise<void> {
  const current = await readSettings();
  await db.settings.put({ ...current, ...patch, id: 'app', updatedAt: nowISO() });
}

/* ----------------------------- Matieres ----------------------------- */

export async function createSubject(input: Partial<Subject> & { name: string }): Promise<ID> {
  const settings = await readSettings();
  const ts = nowISO();
  const id = input.id ?? newId('sub');
  const subject: Subject = {
    id,
    semesterId: input.semesterId ?? settings.currentSemesterId ?? '',
    academicYearId: input.academicYearId ?? settings.currentAcademicYearId ?? '',
    name: input.name,
    shortName: input.shortName?.trim() || shortenName(input.name),
    color: input.color ?? 'slate',
    icon: input.icon ?? 'BookOpen',
    teacher: input.teacher,
    room: input.room,
    description: input.description,
    isArchived: input.isArchived ?? false,
    createdAt: ts,
    updatedAt: ts,
  };
  await db.subjects.put(subject);
  return id;
}

export function shortenName(name: string): string {
  const clean = name.trim();
  if (clean.length <= 18) return clean;
  const words = clean.split(/\s+/).filter((w) => w.length > 2);
  if (words.length >= 2) {
    return words
      .slice(0, 3)
      .map((w) => w[0].toUpperCase() + w.slice(1, 4))
      .join(' ');
  }
  return clean.slice(0, 18);
}

/**
 * Suppression en cascade CONTROLEE d'une matiere.
 * On supprime ce qui n'a aucun sens sans la matiere (chapitres, cours, fiches,
 * examens, revisions, flashcards, notes) et on DETACHE ce qui garde du sens
 * seul (taches, documents, evenements, jurisprudences, lexique, resultats).
 */
export async function deleteSubjectCascade(subjectId: ID): Promise<void> {
  await db.transaction(
    'rw',
    [
      db.subjects,
      db.chapters,
      db.courses,
      db.studySheets,
      db.exams,
      db.revisionSessions,
      db.flashcards,
      db.notes,
      db.tasks,
      db.documents,
      db.events,
      db.caseLaws,
      db.legalTerms,
      db.grades,
      db.focusSessions,
    ],
    async () => {
      const exams = await db.exams.where('subjectId').equals(subjectId).toArray();
      const examIds = new Set(exams.map((e) => e.id));

      await db.chapters.where('subjectId').equals(subjectId).delete();
      await db.courses.where('subjectId').equals(subjectId).delete();
      await db.studySheets.where('subjectId').equals(subjectId).delete();
      await db.revisionSessions.where('subjectId').equals(subjectId).delete();
      await db.flashcards.where('subjectId').equals(subjectId).delete();
      await db.notes.where('subjectId').equals(subjectId).delete();
      await db.exams.where('subjectId').equals(subjectId).delete();
      await db.grades.where('subjectId').equals(subjectId).delete();

      // Detachements
      await detach(db.tasks, 'subjectId', subjectId, (t: Task) => ({
        subjectId: null,
        courseId: null,
        examId: t.examId && examIds.has(t.examId) ? null : t.examId,
      }));
      await detach(db.documents, 'subjectId', subjectId, () => ({
        subjectId: null,
        courseId: null,
        sheetId: null,
      }));
      await detach(db.events, 'subjectId', subjectId, () => ({
        subjectId: null,
        courseId: null,
        examId: null,
        revisionSessionId: null,
      }));
      await detach(db.caseLaws, 'subjectId', subjectId, () => ({ subjectId: null, courseId: null }));
      await detach(db.legalTerms, 'subjectId', subjectId, () => ({ subjectId: null, chapterId: null }));
      await detach(db.focusSessions, 'subjectId', subjectId, () => ({
        subjectId: null,
        courseId: null,
        chapterId: null,
      }));

      await db.subjects.delete(subjectId);
    },
  );
}

/* eslint-disable @typescript-eslint/no-explicit-any */
async function detach(
  table: any,
  field: string,
  value: string,
  patch: (row: any) => Record<string, unknown>,
): Promise<void> {
  const rows = await table.where(field).equals(value).toArray();
  for (const row of rows) {
    await table.update(row.id, patch(row));
  }
}
/* eslint-enable @typescript-eslint/no-explicit-any */

/* ----------------------------- Chapitres ---------------------------- */

export async function createChapter(subjectId: ID, title: string, order?: number): Promise<ID> {
  const count = order ?? (await db.chapters.where('subjectId').equals(subjectId).count());
  const chapter: Chapter = {
    id: newId('chp'),
    subjectId,
    title,
    order: count,
    mastery: 'not_started',
    updatedAt: nowISO(),
  };
  await db.chapters.put(chapter);
  return chapter.id;
}

/* ---------------------------- Flashcards ---------------------------- */

/** Cree une carte de revision. Question et reponse sont du texte simple. */
export async function createFlashcard(input: {
  subjectId: ID;
  question: string;
  answer: string;
  chapterId?: ID | null;
  courseId?: ID | null;
  sheetId?: ID | null;
}): Promise<ID> {
  const ts = nowISO();
  const card: Flashcard = {
    id: newId('fcd'),
    subjectId: input.subjectId,
    chapterId: input.chapterId ?? null,
    courseId: input.courseId ?? null,
    sheetId: input.sheetId ?? null,
    question: input.question.trim(),
    answer: input.answer.trim(),
    mastery: 'not_started',
    lastReviewedAt: null,
    dueAt: null,
    intervalDays: null,
    ease: null,
    reviewCount: 0,
    createdAt: ts,
    updatedAt: ts,
  };
  await db.flashcards.put(card);
  return card.id;
}

export async function deleteChapterCascade(chapterId: ID): Promise<void> {
  await db.transaction(
    'rw',
    [db.chapters, db.courses, db.studySheets, db.flashcards, db.revisionSessions, db.exams, db.legalTerms],
    async () => {
      await db.courses.where('chapterId').equals(chapterId).modify({ chapterId: null });
      await db.studySheets.where('chapterId').equals(chapterId).modify({ chapterId: null });
      await db.flashcards.where('chapterId').equals(chapterId).modify({ chapterId: null });
      await db.revisionSessions.where('chapterId').equals(chapterId).modify({ chapterId: null });
      await db.legalTerms.where('chapterId').equals(chapterId).modify({ chapterId: null });
      const exams = await db.exams.toArray();
      for (const exam of exams) {
        if (exam.chapterIds.includes(chapterId)) {
          await db.exams.update(exam.id, {
            chapterIds: exam.chapterIds.filter((c) => c !== chapterId),
          });
        }
      }
      await db.chapters.delete(chapterId);
    },
  );
}

/* ------------------------------- Cours ------------------------------ */

export async function createCourse(input: Partial<Course> & { subjectId: ID; title: string }): Promise<ID> {
  const ts = nowISO();
  const existing = await db.courses.where('subjectId').equals(input.subjectId).count();
  const course: Course = {
    id: input.id ?? newId('crs'),
    subjectId: input.subjectId,
    chapterId: input.chapterId ?? null,
    title: input.title,
    number: input.number ?? existing + 1,
    date: input.date,
    kind: input.kind ?? 'CM',
    teacher: input.teacher,
    room: input.room,
    blocks: input.blocks ?? [],
    keywords: input.keywords ?? [],
    status: input.status ?? 'to_write',
    mastery: input.mastery ?? 'not_started',
    favorite: input.favorite ?? false,
    createdAt: ts,
    updatedAt: ts,
  };
  await db.courses.put(course);
  return course.id;
}

export async function deleteCourseCascade(courseId: ID): Promise<void> {
  await db.transaction(
    'rw',
    [db.courses, db.notes, db.flashcards, db.documents, db.tasks, db.events, db.studySheets, db.caseLaws, db.methodDocs],
    async () => {
      await db.notes.where('courseId').equals(courseId).delete();
      await db.flashcards.where('courseId').equals(courseId).modify({ courseId: null });
      await db.documents.where('courseId').equals(courseId).modify({ courseId: null });
      await db.tasks.where('courseId').equals(courseId).modify({ courseId: null });
      await db.events.where('courseId').equals(courseId).modify({ courseId: null });
      await db.studySheets.where('courseId').equals(courseId).modify({ courseId: null });
      await db.caseLaws.where('courseId').equals(courseId).modify({ courseId: null });
      await db.methodDocs.where('courseId').equals(courseId).modify({ courseId: null });
      await db.courses.delete(courseId);
    },
  );
}

/* ------------------------------ Taches ------------------------------ */

export async function createTask(input: Partial<Task> & { title: string }): Promise<ID> {
  const ts = nowISO();
  const task: Task = {
    id: input.id ?? newId('tsk'),
    title: input.title,
    description: input.description,
    subjectId: input.subjectId ?? null,
    courseId: input.courseId ?? null,
    examId: input.examId ?? null,
    saeId: input.saeId ?? null,
    type: input.type ?? 'devoir',
    dueDate: input.dueDate ?? null,
    dueTime: input.dueTime ?? null,
    priority: input.priority ?? 'normal',
    status: input.status ?? 'todo',
    subtasks: input.subtasks ?? [],
    estimatedMinutes: input.estimatedMinutes ?? null,
    completedAt: input.completedAt ?? null,
    createdAt: ts,
    updatedAt: ts,
  };
  await db.tasks.put(task);
  return task.id;
}

export async function toggleTask(taskId: ID): Promise<void> {
  const task = await db.tasks.get(taskId);
  if (!task) return;
  const done = task.status === 'done';
  await db.tasks.update(taskId, {
    status: done ? 'todo' : 'done',
    completedAt: done ? null : nowISO(),
    updatedAt: nowISO(),
  });
}

/* ------------------------------ Examens ----------------------------- */

export async function createExam(input: Partial<Exam> & { subjectId: ID; title: string; date: string }): Promise<ID> {
  const ts = nowISO();
  const exam: Exam = {
    id: input.id ?? newId('exm'),
    subjectId: input.subjectId,
    title: input.title,
    kind: input.kind ?? 'partiel',
    date: input.date,
    time: input.time ?? null,
    durationMinutes: input.durationMinutes ?? null,
    room: input.room,
    coefficient: input.coefficient ?? null,
    notes: input.notes,
    chapterIds: input.chapterIds ?? [],
    createdAt: ts,
    updatedAt: ts,
  };
  await db.exams.put(exam);
  return exam.id;
}

export async function deleteExamCascade(examId: ID): Promise<void> {
  await db.transaction('rw', [db.exams, db.revisionSessions, db.tasks, db.events, db.documents], async () => {
    await db.revisionSessions.where('examId').equals(examId).modify({ examId: null });
    await db.tasks.where('examId').equals(examId).modify({ examId: null });
    await db.events.where('examId').equals(examId).delete();
    await db.documents.where('examId').equals(examId).modify({ examId: null });
    await db.exams.delete(examId);
  });
}

/* ----------------------------- Revisions ---------------------------- */

/** Cree une session de revision ET l'evenement calendrier correspondant. */
export async function createRevisionSession(
  input: Partial<RevisionSession> & { subjectId: ID; title: string; date: string },
): Promise<ID> {
  const ts = nowISO();
  const session: RevisionSession = {
    id: input.id ?? newId('rev'),
    subjectId: input.subjectId,
    examId: input.examId ?? null,
    chapterId: input.chapterId ?? null,
    courseId: input.courseId ?? null,
    title: input.title,
    date: input.date,
    time: input.time ?? null,
    durationMinutes: input.durationMinutes ?? 45,
    status: input.status ?? 'planned',
    notes: input.notes,
    createdAt: ts,
    updatedAt: ts,
  };
  await db.revisionSessions.put(session);
  await syncRevisionEvent(session);
  return session.id;
}

export async function syncRevisionEvent(session: RevisionSession): Promise<void> {
  const existing = await db.events.where('revisionSessionId').equals(session.id).first();
  if (session.status === 'cancelled') {
    if (existing) await db.events.delete(existing.id);
    return;
  }
  const start = session.time ?? '18:00';
  const [h, m] = start.split(':').map(Number);
  const endMinutes = h * 60 + m + session.durationMinutes;
  const end = `${String(Math.floor(endMinutes / 60) % 24).padStart(2, '0')}:${String(endMinutes % 60).padStart(2, '0')}`;
  const ts = nowISO();
  const payload: CalendarEvent = {
    id: existing?.id ?? newId('evt'),
    title: session.title,
    type: 'revision',
    subjectId: session.subjectId,
    courseId: session.courseId ?? null,
    examId: session.examId ?? null,
    taskId: null,
    saeId: null,
    revisionSessionId: session.id,
    date: session.date,
    startTime: start,
    endTime: end,
    allDay: false,
    notes: session.notes,
    recurrence: null,
    createdAt: existing?.createdAt ?? ts,
    updatedAt: ts,
  };
  await db.events.put(payload);
}

export async function deleteRevisionSession(sessionId: ID): Promise<void> {
  await db.transaction('rw', [db.revisionSessions, db.events], async () => {
    await db.events.where('revisionSessionId').equals(sessionId).delete();
    await db.revisionSessions.delete(sessionId);
  });
}

/* ------------------------------ Fiches ------------------------------ */

export async function createStudySheet(
  input: Partial<StudySheet> & { subjectId: ID; title: string },
): Promise<ID> {
  const ts = nowISO();
  const sheet: StudySheet = {
    id: input.id ?? newId('sht'),
    subjectId: input.subjectId,
    chapterId: input.chapterId ?? null,
    courseId: input.courseId ?? null,
    title: input.title,
    sections: input.sections ?? defaultSheetSections(),
    mastery: input.mastery ?? 'not_started',
    favorite: input.favorite ?? false,
    createdAt: ts,
    updatedAt: ts,
  };
  await db.studySheets.put(sheet);
  return sheet.id;
}

export function defaultSheetSections() {
  return [
    { id: newId('sec'), title: 'Définitions', content: '' },
    { id: newId('sec'), title: 'Principes', content: '' },
    { id: newId('sec'), title: 'Articles', content: '' },
    { id: newId('sec'), title: 'Jurisprudences', content: '' },
    { id: newId('sec'), title: 'Exemples', content: '' },
    { id: newId('sec'), title: 'À retenir', content: '' },
  ];
}

export async function duplicateStudySheet(sheetId: ID): Promise<ID | null> {
  const sheet = await db.studySheets.get(sheetId);
  if (!sheet) return null;
  const ts = nowISO();
  const copy: StudySheet = {
    ...sheet,
    id: newId('sht'),
    title: `${sheet.title} (copie)`,
    sections: sheet.sections.map((s) => ({ ...s, id: newId('sec') })),
    createdAt: ts,
    updatedAt: ts,
  };
  await db.studySheets.put(copy);
  return copy.id;
}

export async function deleteStudySheetCascade(sheetId: ID): Promise<void> {
  await db.transaction('rw', [db.studySheets, db.flashcards, db.documents], async () => {
    await db.flashcards.where('sheetId').equals(sheetId).modify({ sheetId: null });
    await db.documents.where('sheetId').equals(sheetId).modify({ sheetId: null });
    await db.studySheets.delete(sheetId);
  });
}

/* -------------------------------- SAE ------------------------------- */

export async function deleteSAECascade(saeId: ID): Promise<void> {
  await db.transaction('rw', [db.saes, db.saeTasks, db.tasks, db.documents, db.events], async () => {
    await db.saeTasks.where('saeId').equals(saeId).delete();
    await db.tasks.where('saeId').equals(saeId).modify({ saeId: null });
    await db.documents.where('saeId').equals(saeId).modify({ saeId: null });
    await db.events.where('saeId').equals(saeId).modify({ saeId: null });
    await db.saes.delete(saeId);
  });
}

export async function saeProgress(saeId: ID): Promise<{ done: number; total: number; percent: number }> {
  const tasks = await db.saeTasks.where('saeId').equals(saeId).toArray();
  const done = tasks.filter((t) => t.status === 'done').length;
  const total = tasks.length;
  return { done, total, percent: total ? Math.round((done / total) * 100) : 0 };
}

/* ----------------------------- Documents ---------------------------- */

export async function deleteDocument(id: ID): Promise<void> {
  await db.documents.delete(id);
}

/* ------------------------- Remise a zero ---------------------------- */

export async function clearAllData(): Promise<void> {
  const instance = db as unknown as Record<TableName, { clear: () => Promise<void> }>;
  for (const name of TABLE_NAMES) {
    await instance[name].clear();
  }
}

export type { SAE, DocumentItem, Subject };
