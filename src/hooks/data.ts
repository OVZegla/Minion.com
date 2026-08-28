'use client';

import { useLiveQuery } from 'dexie-react-hooks';
import { useMemo } from 'react';
import { db } from '@/db/db';
import { defaultSettings } from '@/db/defaults';
import { computeProgress } from '@/lib/progress';
import type {
  Chapter,
  Course,
  Subject,
  Task,
  UserSettings,
} from '@/types';

/**
 * Couche de lecture reactive (Dexie live queries).
 * Chaque page ne demande que ce dont elle a besoin ; les composants se
 * re-rendent automatiquement quand la base change.
 */

export function useSettings(): UserSettings | undefined {
  return useLiveQuery(async () => {
    const existing = await db.settings.get('app');
    return existing ?? defaultSettings();
  }, []);
}

export function useSubjects(includeArchived = false): Subject[] | undefined {
  return useLiveQuery(async () => {
    const all = await db.subjects.toArray();
    const filtered = includeArchived ? all : all.filter((s) => !s.isArchived);
    return filtered.sort((a, b) => a.name.localeCompare(b.name, 'fr'));
  }, [includeArchived]);
}

export function useSubject(id?: string | null): Subject | undefined {
  return useLiveQuery(async () => (id ? db.subjects.get(id) : undefined), [id]);
}

export function useSubjectMap(): Map<string, Subject> {
  const subjects = useSubjects(true);
  return useMemo(() => new Map((subjects ?? []).map((s) => [s.id, s])), [subjects]);
}

export function useChapters(subjectId?: string | null): Chapter[] | undefined {
  return useLiveQuery(async () => {
    const rows = subjectId
      ? await db.chapters.where('subjectId').equals(subjectId).toArray()
      : await db.chapters.toArray();
    return rows.sort((a, b) => a.order - b.order);
  }, [subjectId]);
}

export function useCourses(subjectId?: string | null): Course[] | undefined {
  return useLiveQuery(async () => {
    const rows = subjectId
      ? await db.courses.where('subjectId').equals(subjectId).toArray()
      : await db.courses.toArray();
    return rows.sort((a, b) => a.number - b.number);
  }, [subjectId]);
}

export function useCourse(id?: string | null): Course | undefined {
  return useLiveQuery(async () => (id ? db.courses.get(id) : undefined), [id]);
}

export function useTasks(): Task[] | undefined {
  return useLiveQuery(async () => {
    const rows = await db.tasks.toArray();
    return rows.sort(sortTasks);
  }, []);
}

export function useTasksBySubject(subjectId?: string | null): Task[] | undefined {
  return useLiveQuery(async () => {
    if (!subjectId) return [];
    const rows = await db.tasks.where('subjectId').equals(subjectId).toArray();
    return rows.sort(sortTasks);
  }, [subjectId]);
}

const PRIORITY_RANK: Record<string, number> = { urgent: 0, high: 1, normal: 2, low: 3 };

export function sortTasks(a: Task, b: Task): number {
  if (a.status !== b.status) return a.status === 'done' ? 1 : -1;
  if (a.dueDate && b.dueDate && a.dueDate !== b.dueDate) return a.dueDate < b.dueDate ? -1 : 1;
  if (a.dueDate && !b.dueDate) return -1;
  if (!a.dueDate && b.dueDate) return 1;
  return (PRIORITY_RANK[a.priority] ?? 2) - (PRIORITY_RANK[b.priority] ?? 2);
}

export function useEvents() {
  return useLiveQuery(() => db.events.toArray(), []);
}

export function useExams() {
  return useLiveQuery(async () => {
    const rows = await db.exams.toArray();
    return rows.sort((a, b) => a.date.localeCompare(b.date));
  }, []);
}

export function useExam(id?: string | null) {
  return useLiveQuery(async () => (id ? db.exams.get(id) : undefined), [id]);
}

export function useRevisionSessions() {
  return useLiveQuery(async () => {
    const rows = await db.revisionSessions.toArray();
    return rows.sort((a, b) => a.date.localeCompare(b.date));
  }, []);
}

export function useStudySheets(subjectId?: string | null) {
  return useLiveQuery(async () => {
    const rows = subjectId
      ? await db.studySheets.where('subjectId').equals(subjectId).toArray()
      : await db.studySheets.toArray();
    return rows.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }, [subjectId]);
}

export function useStudySheet(id?: string | null) {
  return useLiveQuery(async () => (id ? db.studySheets.get(id) : undefined), [id]);
}

export function useDocuments() {
  return useLiveQuery(async () => {
    const rows = await db.documents.toArray();
    return rows.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }, []);
}

export function useSAEs() {
  return useLiveQuery(async () => {
    const rows = await db.saes.toArray();
    return rows.sort((a, b) => a.code.localeCompare(b.code, 'fr'));
  }, []);
}

export function useSAE(id?: string | null) {
  return useLiveQuery(async () => (id ? db.saes.get(id) : undefined), [id]);
}

export function useSAETasks(saeId?: string | null) {
  return useLiveQuery(async () => {
    const rows = saeId
      ? await db.saeTasks.where('saeId').equals(saeId).toArray()
      : await db.saeTasks.toArray();
    return rows.sort((a, b) => a.order - b.order);
  }, [saeId]);
}

export function useFlashcards(subjectId?: string | null) {
  return useLiveQuery(async () => {
    const rows = subjectId
      ? await db.flashcards.where('subjectId').equals(subjectId).toArray()
      : await db.flashcards.toArray();
    return rows;
  }, [subjectId]);
}

export function useGrades() {
  return useLiveQuery(async () => {
    const rows = await db.grades.toArray();
    return rows.sort((a, b) => b.date.localeCompare(a.date));
  }, []);
}

export function useFocusSessions() {
  return useLiveQuery(async () => db.focusSessions.toArray(), []);
}

export function useInbox() {
  return useLiveQuery(async () => {
    const rows = await db.inbox.toArray();
    return rows.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }, []);
}

export function usePendingInboxCount(): number {
  const items = useInbox();
  return (items ?? []).filter((item) => item.status === 'pending').length;
}

export function useCaseLaws() {
  return useLiveQuery(async () => {
    const rows = await db.caseLaws.toArray();
    return rows.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }, []);
}

export function useLegalTerms() {
  return useLiveQuery(async () => {
    const rows = await db.legalTerms.toArray();
    return rows.sort((a, b) => a.term.localeCompare(b.term, 'fr'));
  }, []);
}

export function useMethodDocs() {
  return useLiveQuery(async () => {
    const rows = await db.methodDocs.toArray();
    return rows.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }, []);
}

export function useMethodDoc(id?: string | null) {
  return useLiveQuery(async () => (id ? db.methodDocs.get(id) : undefined), [id]);
}

export function useNotes(courseId?: string | null) {
  return useLiveQuery(async () => {
    if (!courseId) return [];
    return db.notes.where('courseId').equals(courseId).toArray();
  }, [courseId]);
}

export function useAcademicYears() {
  return useLiveQuery(async () => db.academicYears.toArray(), []);
}

export function useSemesters() {
  return useLiveQuery(async () => {
    const rows = await db.semesters.toArray();
    return rows.sort((a, b) => a.startDate.localeCompare(b.startDate));
  }, []);
}

/** Progression par matiere, calculee a partir des chapitres (regle documentee). */
export function useProgressBySubject(): Map<string, ReturnType<typeof computeProgress>> {
  const chapters = useChapters();
  return useMemo(() => {
    const bySubject = new Map<string, Chapter[]>();
    for (const chapter of chapters ?? []) {
      const list = bySubject.get(chapter.subjectId) ?? [];
      list.push(chapter);
      bySubject.set(chapter.subjectId, list);
    }
    const out = new Map<string, ReturnType<typeof computeProgress>>();
    for (const [subjectId, list] of bySubject) out.set(subjectId, computeProgress(list));
    return out;
  }, [chapters]);
}

/** Compteurs par matiere : cours, fiches, taches en attente. */
export function useSubjectCounters() {
  const courses = useCourses();
  const sheets = useStudySheets();
  const tasks = useTasks();
  return useMemo(() => {
    const out = new Map<string, { courses: number; sheets: number; openTasks: number }>();
    const bump = (id: string | null | undefined, key: 'courses' | 'sheets' | 'openTasks') => {
      if (!id) return;
      const entry = out.get(id) ?? { courses: 0, sheets: 0, openTasks: 0 };
      entry[key] += 1;
      out.set(id, entry);
    };
    for (const course of courses ?? []) bump(course.subjectId, 'courses');
    for (const sheet of sheets ?? []) bump(sheet.subjectId, 'sheets');
    for (const task of tasks ?? []) if (task.status !== 'done') bump(task.subjectId, 'openTasks');
    return out;
  }, [courses, sheets, tasks]);
}
