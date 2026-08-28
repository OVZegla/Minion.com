import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it } from 'vitest';
import { db } from '@/db/db';
import {
  clearAllData,
  createChapter,
  createCourse,
  createExam,
  createRevisionSession,
  createSubject,
  createTask,
  deleteChapterCascade,
  deleteCourseCascade,
  deleteExamCascade,
  deleteRevisionSession,
  deleteSubjectCascade,
  readSettings,
  toggleTask,
} from '@/db/repo';
import { seedDemoData } from '@/db/seed';
import { exportBackup, parseBackup, restoreBackup } from '@/db/backup';
import { computeProgress } from '@/lib/progress';
import { nowISO } from '@/lib/dates';

beforeEach(async () => {
  await clearAllData();
});

describe('relations et suppression en cascade', () => {
  it('crée une matière, un chapitre, un cours et une tâche liés', async () => {
    const subjectId = await createSubject({ name: 'Droit administratif', color: 'blue' });
    const chapterId = await createChapter(subjectId, 'Les actes administratifs');
    const courseId = await createCourse({
      subjectId,
      title: 'Introduction',
      chapterId,
    });
    const taskId = await createTask({ title: 'Lire le chapitre', subjectId, courseId });

    const course = await db.courses.get(courseId);
    expect(course?.chapterId).toBe(chapterId);
    expect(course?.number).toBe(1);

    const task = await db.tasks.get(taskId);
    expect(task?.subjectId).toBe(subjectId);
    expect(task?.status).toBe('todo');
  });

  it('numérote les cours dans l’ordre de création', async () => {
    const subjectId = await createSubject({ name: 'Matière' });
    await createCourse({ subjectId, title: 'Cours A' });
    const second = await createCourse({ subjectId, title: 'Cours B' });
    expect((await db.courses.get(second))?.number).toBe(2);
  });

  it('détache les cours et fiches quand un chapitre est supprimé', async () => {
    const subjectId = await createSubject({ name: 'Matière' });
    const chapterId = await createChapter(subjectId, 'Chapitre 1');
    const courseId = await createCourse({ subjectId, title: 'Cours', chapterId });
    const examId = await createExam({
      subjectId,
      title: 'Partiel',
      date: '2026-10-08',
      chapterIds: [chapterId],
    });

    await deleteChapterCascade(chapterId);

    expect(await db.chapters.get(chapterId)).toBeUndefined();
    expect((await db.courses.get(courseId))?.chapterId).toBeNull();
    expect((await db.exams.get(examId))?.chapterIds).toEqual([]);
  });

  it('supprime le contenu d’une matière mais conserve les tâches', async () => {
    const subjectId = await createSubject({ name: 'Matière' });
    const chapterId = await createChapter(subjectId, 'Chapitre');
    const courseId = await createCourse({ subjectId, title: 'Cours', chapterId });
    const taskId = await createTask({ title: 'Devoir', subjectId, courseId });
    await createExam({ subjectId, title: 'Partiel', date: '2026-10-08' });

    await deleteSubjectCascade(subjectId);

    expect(await db.subjects.get(subjectId)).toBeUndefined();
    expect(await db.chapters.count()).toBe(0);
    expect(await db.courses.count()).toBe(0);
    expect(await db.exams.count()).toBe(0);

    const task = await db.tasks.get(taskId);
    expect(task).toBeDefined();
    expect(task?.subjectId).toBeNull();
    expect(task?.courseId).toBeNull();
  });

  it('détache les tâches quand un cours est supprimé', async () => {
    const subjectId = await createSubject({ name: 'Matière' });
    const courseId = await createCourse({ subjectId, title: 'Cours' });
    const taskId = await createTask({ title: 'Devoir', subjectId, courseId });

    await deleteCourseCascade(courseId);

    expect((await db.tasks.get(taskId))?.courseId).toBeNull();
    expect((await db.tasks.get(taskId))?.subjectId).toBe(subjectId);
  });

  it('détache les révisions quand l’examen est supprimé', async () => {
    const subjectId = await createSubject({ name: 'Matière' });
    const examId = await createExam({ subjectId, title: 'Partiel', date: '2026-10-08' });
    const sessionId = await createRevisionSession({
      subjectId,
      examId,
      title: 'Révision',
      date: '2026-10-01',
    });

    await deleteExamCascade(examId);

    expect((await db.revisionSessions.get(sessionId))?.examId).toBeNull();
  });
});

describe('tâches', () => {
  it('bascule une tâche et enregistre la date de fin', async () => {
    const taskId = await createTask({ title: 'Fiche d’arrêt' });
    await toggleTask(taskId);
    const done = await db.tasks.get(taskId);
    expect(done?.status).toBe('done');
    expect(done?.completedAt).toBeTruthy();

    await toggleTask(taskId);
    const reopened = await db.tasks.get(taskId);
    expect(reopened?.status).toBe('todo');
    expect(reopened?.completedAt).toBeNull();
  });
});

describe('sessions de révision', () => {
  it('crée puis supprime l’événement de calendrier associé', async () => {
    const subjectId = await createSubject({ name: 'Matière' });
    const sessionId = await createRevisionSession({
      subjectId,
      title: 'La Constitution',
      date: '2026-10-01',
      time: '18:00',
      durationMinutes: 45,
    });

    const event = await db.events.where('revisionSessionId').equals(sessionId).first();
    expect(event).toBeDefined();
    expect(event?.startTime).toBe('18:00');
    expect(event?.endTime).toBe('18:45');

    await deleteRevisionSession(sessionId);
    expect(await db.events.where('revisionSessionId').equals(sessionId).count()).toBe(0);
  });
});

describe('seed de démonstration', () => {
  it('produit des données cohérentes et reliées', async () => {
    await seedDemoData(new Date(2026, 8, 17));

    const subjects = await db.subjects.toArray();
    expect(subjects.length).toBe(12);

    const settings = await readSettings();
    expect(settings.demoDataLoaded).toBe(true);
    expect(settings.currentSemesterId).toBeTruthy();

    // toutes les entités pointent vers des matières existantes
    const subjectIds = new Set(subjects.map((subject) => subject.id));
    for (const course of await db.courses.toArray()) {
      expect(subjectIds.has(course.subjectId)).toBe(true);
    }
    for (const exam of await db.exams.toArray()) {
      expect(subjectIds.has(exam.subjectId)).toBe(true);
    }

    // les chapitres d'examen existent réellement
    const chapterIds = new Set((await db.chapters.toArray()).map((chapter) => chapter.id));
    for (const exam of await db.exams.toArray()) {
      for (const id of exam.chapterIds) expect(chapterIds.has(id)).toBe(true);
    }

    // la progression vient bien des données
    const constit = subjects.find((subject) => subject.name.startsWith('Droit constitutionnel'));
    const chapters = await db.chapters.where('subjectId').equals(constit!.id).toArray();
    expect(chapters).toHaveLength(7);
    expect(computeProgress(chapters).percent).toBeGreaterThan(0);
    expect(computeProgress(chapters).percent).toBeLessThan(100);
  });

  it('calcule les dates par rapport à la date de référence', async () => {
    const reference = new Date(2026, 8, 17);
    await seedDemoData(reference);
    const exams = await db.exams.toArray();
    const partiel = exams.find((exam) => exam.title.includes('Droit constitutionnel'));
    expect(partiel?.date).toBe('2026-09-29'); // référence + 12 jours
    const urgent = (await db.tasks.toArray()).find((task) => task.priority === 'urgent');
    expect(urgent?.dueDate).toBe('2026-09-18'); // référence + 1 jour
  });

  it('crée un emploi du temps hebdomadaire récurrent', async () => {
    await seedDemoData(new Date(2026, 8, 17));
    const recurring = (await db.events.toArray()).filter((event) => event.recurrence);
    expect(recurring.length).toBeGreaterThanOrEqual(17);
    for (const event of recurring) {
      expect(event.recurrence?.freq).toBe('weekly');
      expect(event.recurrence?.byWeekday.length).toBeGreaterThan(0);
    }
  });
});

describe('export / import', () => {
  it('exporte puis réimporte les données à l’identique', async () => {
    await seedDemoData(new Date(2026, 8, 17));
    const before = {
      subjects: await db.subjects.count(),
      courses: await db.courses.count(),
      tasks: await db.tasks.count(),
      documents: await db.documents.count(),
    };

    const backup = await exportBackup();
    const parsed = parseBackup(JSON.stringify(backup));
    expect(parsed.summary.counts.subjects).toBe(before.subjects);

    await clearAllData();
    expect(await db.subjects.count()).toBe(0);

    await restoreBackup(parsed);
    expect(await db.subjects.count()).toBe(before.subjects);
    expect(await db.courses.count()).toBe(before.courses);
    expect(await db.tasks.count()).toBe(before.tasks);
    expect(await db.documents.count()).toBe(before.documents);
  });

  it('restaure les fichiers joints', async () => {
    await seedDemoData(new Date(2026, 8, 17));
    const original = (await db.documents.toArray()).find((doc) => doc.kind === 'pdf');
    expect(original?.blob).toBeInstanceOf(Blob);

    const backup = await exportBackup();
    await clearAllData();
    await restoreBackup(parseBackup(JSON.stringify(backup)));

    const restored = await db.documents.get(original!.id);
    expect(restored?.blob).toBeInstanceOf(Blob);
    expect(restored?.size).toBe(original?.size);
  });

  it('refuse un fichier qui n’est pas une sauvegarde', () => {
    expect(() => parseBackup('pas du json')).toThrow();
    expect(() => parseBackup(JSON.stringify({ app: 'autre-appli', version: 1 }))).toThrow();
    expect(() =>
      parseBackup(JSON.stringify({ app: 'minion.com', version: 99, exportedAt: '', tables: {} })),
    ).toThrow();
  });

  it('assainit les chaînes importées', async () => {
    const payload = {
      app: 'minion.com',
      version: 1,
      exportedAt: nowISO(),
      tables: {
        subjects: [
          {
            id: 'sub-x',
            name: `Droit${String.fromCharCode(0)}${String.fromCharCode(7)} civil`,
            shortName: 'Civil',
            color: 'blue',
            icon: 'BookOpen',
            semesterId: '',
            academicYearId: '',
            isArchived: false,
            createdAt: nowISO(),
            updatedAt: nowISO(),
          },
        ],
      },
    };
    await restoreBackup(parseBackup(JSON.stringify(payload)));
    const subject = await db.subjects.get('sub-x');
    expect(subject?.name).toBe('Droit civil');
  });
});
