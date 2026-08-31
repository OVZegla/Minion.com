import { addDays, addWeeks, subWeeks } from 'date-fns';
import { db } from '../db';
import { defaultSettings } from '../defaults';
import { clearAllData } from '../repo';
import { newId } from '@/lib/id';
import { nowISO, toDateISO, weekStart } from '@/lib/dates';
import { makeDemoPdf } from './pdf';
import { SEED_LEGAL_TERMS, SEED_SAE, SEED_SUBJECTS, SEED_TIMETABLE } from './data';
import type {
  AcademicYear,
  CalendarEvent,
  CaseLaw,
  Chapter,
  Course,
  CourseBlock,
  DocumentItem,
  Exam,
  Flashcard,
  FocusSession,
  Grade,
  InboxItem,
  LegalTerm,
  MethodDoc,
  Note,
  RevisionSession,
  SAE,
  SAETask,
  Semester,
  StudySheet,
  Subject,
  Task,
} from '@/types';

/**
 * SEED DE DEMONSTRATION
 *
 * Toutes les dates sont calculees a partir d'une DATE DE REFERENCE (aujourd'hui).
 * La demo reste donc pertinente quelle que soit la date de lancement :
 * le semestre a commence il y a 5 semaines, le partiel est dans 12 jours, etc.
 *
 * Contenu entierement fictif (matieres, horaires, enseignants, notes).
 */

type DistOmit<T, K extends PropertyKey> = T extends unknown ? Omit<T, K> : never;
type CourseBlockInput = DistOmit<CourseBlock, 'id'>;

const block = (b: CourseBlockInput): CourseBlock => ({ ...b, id: newId('blk') }) as CourseBlock;

export async function seedDemoData(
  reference = new Date(),
  options: { onboarded?: boolean } = {},
): Promise<void> {
  await clearAllData();

  const ts = nowISO();
  const today = new Date(reference);
  today.setHours(0, 0, 0, 0);
  const d = (offset: number) => toDateISO(addDays(today, offset));

  // Le semestre a demarre le lundi d'il y a 5 semaines : l'app parait deja utilisee.
  const semesterStart = weekStart(subWeeks(today, 5));
  const semesterEnd = addWeeks(semesterStart, 18);

  const startYear =
    semesterStart.getMonth() >= 6 ? semesterStart.getFullYear() : semesterStart.getFullYear() - 1;

  /* ------------------------- Annee & semestres ------------------------ */

  const year: AcademicYear = {
    id: newId('yr'),
    label: `${startYear} / ${startYear + 1}`,
    startDate: toDateISO(semesterStart),
    endDate: toDateISO(addWeeks(semesterStart, 40)),
    yearLabel: 'BUT 1',
    isArchived: false,
  };

  const semester1: Semester = {
    id: newId('sem'),
    academicYearId: year.id,
    label: 'Semestre 1',
    number: 1,
    startDate: toDateISO(semesterStart),
    endDate: toDateISO(semesterEnd),
    isArchived: false,
  };

  const semester2: Semester = {
    id: newId('sem'),
    academicYearId: year.id,
    label: 'Semestre 2',
    number: 2,
    startDate: toDateISO(addWeeks(semesterStart, 19)),
    endDate: toDateISO(addWeeks(semesterStart, 40)),
    isArchived: false,
  };

  await db.academicYears.put(year);
  await db.semesters.bulkPut([semester1, semester2]);

  /* --------------------- Matieres, chapitres, cours ------------------- */

  const subjects: Subject[] = [];
  const chapters: Chapter[] = [];
  const courses: Course[] = [];
  const subjectByKey = new Map<string, Subject>();
  const chapterByKey = new Map<string, Chapter[]>();
  const courseByKey = new Map<string, Course[]>();

  SEED_SUBJECTS.forEach((seed) => {
    const subject: Subject = {
      id: newId('sub'),
      semesterId: semester1.id,
      academicYearId: year.id,
      name: seed.name,
      shortName: seed.shortName,
      color: seed.color,
      icon: seed.icon,
      teacher: seed.teacher,
      room: seed.room,
      description: seed.description,
      isArchived: false,
      createdAt: ts,
      updatedAt: ts,
    };
    subjects.push(subject);
    subjectByKey.set(seed.key, subject);

    const subjectChapters = seed.chapters.map((chapter, index) => ({
      id: newId('chp'),
      subjectId: subject.id,
      title: chapter.title,
      order: index,
      mastery: chapter.mastery,
      updatedAt: ts,
    }));
    chapters.push(...subjectChapters);
    chapterByKey.set(seed.key, subjectChapters);

    // Les cours passes sont repartis sur les 5 semaines ecoulees.
    const subjectCourses = seed.courses.map((course, index) => {
      const chapter =
        course.chapterIndex !== undefined ? subjectChapters[course.chapterIndex] : undefined;
      const courseDate = addDays(semesterStart, index * 7 + 1);
      const isPast = courseDate.getTime() <= today.getTime();
      return {
        id: newId('crs'),
        subjectId: subject.id,
        chapterId: chapter?.id ?? null,
        title: course.title,
        number: index + 1,
        date: toDateISO(courseDate),
        kind: course.kind,
        teacher: seed.teacher,
        room: seed.room,
        blocks: [] as CourseBlock[],
        keywords: [],
        status: isPast ? ('complete' as const) : ('to_write' as const),
        mastery: chapter?.mastery ?? 'not_started',
        favorite: false,
        createdAt: ts,
        updatedAt: ts,
      } satisfies Course;
    });
    courses.push(...subjectCourses);
    courseByKey.set(seed.key, subjectCourses);
  });

  const S = (key: string) => subjectByKey.get(key)!;
  const CH = (key: string, index: number) => chapterByKey.get(key)![index];
  const CO = (key: string, index: number) => courseByKey.get(key)![index];

  // Quelques cours recoivent un vrai contenu structure pour montrer l'editeur.
  const constitConstitution = CO('constit', 2);
  constitConstitution.blocks = [
    block({ type: 'heading', level: 2, text: 'Plan du cours' }),
    block({
      type: 'numbered',
      items: ['La notion de Constitution', 'L’élaboration de la Constitution', 'La révision de la Constitution'],
    }),
    block({
      type: 'callout',
      variant: 'definition',
      title: 'Définition',
      text: 'La Constitution est la norme qui organise les pouvoirs publics et garantit des droits fondamentaux.',
    }),
    block({
      type: 'paragraph',
      text: 'Notes de démonstration — remplace ce texte par tes propres notes de cours.',
    }),
    block({
      type: 'callout',
      variant: 'remember',
      title: 'À retenir',
      text: 'La Constitution occupe le sommet de la hiérarchie des normes en droit interne.',
    }),
    block({
      type: 'article',
      code: 'Code civil',
      reference: 'Article 1240',
      text: 'Ajoute ici le texte exact de l’article depuis ta source officielle.',
      comment: 'Bloc « Article de loi » : référence, code, contenu et commentaire personnel.',
    }),
    block({
      type: 'caselaw',
      court: 'Cour de cassation',
      chamber: 'Assemblée plénière',
      date: '17 novembre 2000',
      principle: 'À compléter avec tes notes de cours.',
      scope: 'À compléter.',
    }),
    block({
      type: 'callout',
      variant: 'warning',
      title: 'Piège à éviter',
      text: 'Ne pas confondre révision de la Constitution et changement de Constitution.',
    }),
  ];
  constitConstitution.keywords = ['constitution', 'norme suprême', 'révision'];
  constitConstitution.favorite = true;

  const methodoFiche = CO('methodo', 2);
  methodoFiche.blocks = [
    block({ type: 'heading', level: 2, text: 'Les étapes de la fiche d’arrêt' }),
    block({
      type: 'numbered',
      items: [
        'Les faits',
        'La procédure',
        'Les prétentions des parties',
        'Le problème de droit',
        'La solution',
        'La portée',
      ],
    }),
    block({
      type: 'callout',
      variant: 'example',
      title: 'Exemple',
      text: 'Reformule les faits sans reprendre le vocabulaire de la décision.',
    }),
    block({
      type: 'checklist',
      items: [
        { text: 'Identifier la juridiction', done: true },
        { text: 'Repérer la date et le numéro', done: true },
        { text: 'Formuler le problème de droit sous forme de question', done: false },
      ],
    }),
  ];
  methodoFiche.keywords = ['méthode', 'fiche d’arrêt'];

  const introSources = CO('intro', 2);
  introSources.blocks = [
    block({ type: 'heading', level: 2, text: 'Les sources du droit' }),
    block({
      type: 'bullets',
      items: ['Sources internationales', 'Sources constitutionnelles', 'Sources législatives', 'Sources réglementaires'],
    }),
    block({ type: 'divider' }),
    block({
      type: 'quote',
      text: 'Notes de démonstration — à remplacer par ton cours.',
      source: 'minion.com',
    }),
  ];

  await db.subjects.bulkPut(subjects);
  await db.chapters.bulkPut(chapters);
  await db.courses.bulkPut(courses);

  /* --------------------------- Emploi du temps ------------------------ */

  const events: CalendarEvent[] = SEED_TIMETABLE.map((slot) => {
    const subject = slot.subjectKey ? S(slot.subjectKey) : null;
    const firstDate = firstWeekdayOnOrAfter(semesterStart, slot.weekday);
    return {
      id: newId('evt'),
      title: slot.title ?? subject?.name ?? 'Créneau',
      type:
        slot.kind === 'CM'
          ? 'cm'
          : slot.kind === 'TD'
            ? 'td'
            : slot.kind === 'TP'
              ? 'tp'
              : slot.kind === 'PERSO'
                ? 'perso'
                : 'cours',
      subjectId: subject?.id ?? null,
      courseId: null,
      examId: null,
      taskId: null,
      saeId: null,
      revisionSessionId: null,
      date: toDateISO(firstDate),
      startTime: slot.start,
      endTime: slot.end,
      allDay: false,
      room: slot.room,
      teacher: subject?.teacher,
      recurrence: {
        freq: 'weekly',
        interval: 1,
        byWeekday: [slot.weekday],
        until: toDateISO(semesterEnd),
        exceptions: [],
      },
      createdAt: ts,
      updatedAt: ts,
    } satisfies CalendarEvent;
  });

  /* ------------------------------ Examens ----------------------------- */

  const constitChapters = chapterByKey.get('constit')!;
  const examConstit: Exam = {
    id: newId('exm'),
    subjectId: S('constit').id,
    title: 'Partiel S1 — Droit constitutionnel',
    kind: 'partiel',
    date: d(12),
    time: '09:00',
    durationMinutes: 120,
    room: 'B205',
    coefficient: 2,
    notes: 'Sujet au choix : dissertation ou cas pratique.',
    chapterIds: constitChapters.map((c) => c.id),
    createdAt: ts,
    updatedAt: ts,
  };

  const examCompta: Exam = {
    id: newId('exm'),
    subjectId: S('compta').id,
    title: 'Contrôle — Comptabilité générale',
    kind: 'controle',
    date: d(6),
    time: '08:30',
    durationMinutes: 60,
    room: 'B204',
    coefficient: 1,
    chapterIds: chapterByKey.get('compta')!.slice(0, 3).map((c) => c.id),
    createdAt: ts,
    updatedAt: ts,
  };

  const examIntro: Exam = {
    id: newId('exm'),
    subjectId: S('intro').id,
    title: 'Partiel S1 — Introduction générale au droit',
    kind: 'partiel',
    date: d(20),
    time: '14:00',
    durationMinutes: 120,
    room: 'Amphi A',
    coefficient: 2,
    chapterIds: chapterByKey.get('intro')!.map((c) => c.id),
    createdAt: ts,
    updatedAt: ts,
  };

  const examAnglais: Exam = {
    id: newId('exm'),
    subjectId: S('anglais').id,
    title: 'Oral — Anglais appliqué',
    kind: 'oral',
    date: d(26),
    time: '10:15',
    room: 'C103',
    chapterIds: chapterByKey.get('anglais')!.slice(0, 2).map((c) => c.id),
    createdAt: ts,
    updatedAt: ts,
  };

  const exams = [examCompta, examConstit, examIntro, examAnglais];
  await db.exams.bulkPut(exams);

  for (const exam of exams) {
    events.push({
      id: newId('evt'),
      title: exam.title,
      type: 'examen',
      subjectId: exam.subjectId,
      courseId: null,
      examId: exam.id,
      taskId: null,
      saeId: null,
      revisionSessionId: null,
      date: exam.date,
      startTime: exam.time ?? '09:00',
      endTime: addMinutes(exam.time ?? '09:00', exam.durationMinutes ?? 90),
      allDay: false,
      room: exam.room,
      recurrence: null,
      createdAt: ts,
      updatedAt: ts,
    });
  }

  /* ------------------------------ Taches ------------------------------ */

  const tasks: Task[] = [
    {
      id: newId('tsk'),
      title: 'Cas pratique sur la personnalité juridique',
      description: 'Traiter les 2 questions du polycopié. Méthode : qualification, règle, application.',
      subjectId: S('personnes').id,
      courseId: CO('personnes', 4).id,
      examId: null,
      saeId: null,
      type: 'devoir',
      dueDate: d(1),
      dueTime: '23:59',
      priority: 'urgent',
      status: 'todo',
      subtasks: [
        { id: newId('sub'), text: 'Relire le cours', done: true },
        { id: newId('sub'), text: 'Question 1', done: false },
        { id: newId('sub'), text: 'Question 2', done: false },
      ],
      estimatedMinutes: 90,
      completedAt: null,
      createdAt: ts,
      updatedAt: ts,
    },
    {
      id: newId('tsk'),
      title: 'Fiche d’arrêt — Cour de cassation',
      description: 'Reprendre la trame vue en TD.',
      subjectId: S('methodo').id,
      courseId: methodoFiche.id,
      examId: null,
      saeId: null,
      type: 'fiche',
      dueDate: d(3),
      dueTime: null,
      priority: 'high',
      status: 'todo',
      subtasks: [],
      estimatedMinutes: 60,
      completedAt: null,
      createdAt: ts,
      updatedAt: ts,
    },
    {
      id: newId('tsk'),
      title: 'Relire le chapitre « La hiérarchie des normes »',
      subjectId: S('constit').id,
      courseId: CO('constit', 3).id,
      examId: examConstit.id,
      saeId: null,
      type: 'revision',
      dueDate: d(4),
      dueTime: null,
      priority: 'normal',
      status: 'todo',
      subtasks: [],
      estimatedMinutes: 45,
      completedAt: null,
      createdAt: ts,
      updatedAt: ts,
    },
    {
      id: newId('tsk'),
      title: 'Terminer l’exercice comptable',
      subjectId: S('compta').id,
      courseId: null,
      examId: examCompta.id,
      saeId: null,
      type: 'td',
      dueDate: d(5),
      dueTime: null,
      priority: 'normal',
      status: 'todo',
      subtasks: [],
      estimatedMinutes: 40,
      completedAt: null,
      createdAt: ts,
      updatedAt: ts,
    },
    {
      id: newId('tsk'),
      title: 'Lire le chapitre sur l’ordre administratif',
      subjectId: S('judiciaire').id,
      courseId: CO('judiciaire', 2).id,
      examId: null,
      saeId: null,
      type: 'lecture',
      dueDate: d(8),
      dueTime: null,
      priority: 'low',
      status: 'todo',
      subtasks: [],
      estimatedMinutes: 30,
      completedAt: null,
      createdAt: ts,
      updatedAt: ts,
    },
    {
      id: newId('tsk'),
      title: 'Rendre le questionnaire PPP',
      subjectId: S('ppp').id,
      courseId: null,
      examId: null,
      saeId: null,
      type: 'admin',
      dueDate: d(-2),
      dueTime: null,
      priority: 'high',
      status: 'todo',
      subtasks: [],
      estimatedMinutes: 20,
      completedAt: null,
      createdAt: ts,
      updatedAt: ts,
    },
    ...[
      { title: 'Fiche : les sources du droit', key: 'intro', offset: -1, type: 'fiche' as const },
      { title: 'Exercices TVA', key: 'compta', offset: -2, type: 'td' as const },
      { title: 'Quiz de vocabulaire juridique', key: 'methodo', offset: -3, type: 'revision' as const },
    ].map((done) => ({
      id: newId('tsk'),
      title: done.title,
      subjectId: S(done.key).id,
      courseId: null,
      examId: null,
      saeId: null,
      type: done.type,
      dueDate: d(done.offset),
      dueTime: null,
      priority: 'normal' as const,
      status: 'done' as const,
      subtasks: [],
      estimatedMinutes: 30,
      completedAt: toDateISO(addDays(today, done.offset)) + 'T18:30',
      createdAt: ts,
      updatedAt: ts,
    })),
  ];

  /* ---------------------------- Revisions ----------------------------- */

  const revisionPlan: { offset: number; chapterIndex: number; minutes: number; status: RevisionSession['status'] }[] = [
    { offset: -4, chapterIndex: 0, minutes: 45, status: 'done' },
    { offset: -2, chapterIndex: 1, minutes: 45, status: 'done' },
    { offset: 0, chapterIndex: 2, minutes: 20, status: 'planned' },
    { offset: 2, chapterIndex: 3, minutes: 45, status: 'planned' },
    { offset: 4, chapterIndex: 4, minutes: 45, status: 'planned' },
    { offset: 7, chapterIndex: 5, minutes: 60, status: 'planned' },
    { offset: 9, chapterIndex: 6, minutes: 60, status: 'planned' },
  ];

  const revisionSessions: RevisionSession[] = revisionPlan.map((plan) => ({
    id: newId('rev'),
    subjectId: S('constit').id,
    examId: examConstit.id,
    chapterId: constitChapters[plan.chapterIndex].id,
    courseId: null,
    title: constitChapters[plan.chapterIndex].title,
    date: d(plan.offset),
    time: plan.offset === 0 ? '18:00' : '18:00',
    durationMinutes: plan.minutes,
    status: plan.status,
    createdAt: ts,
    updatedAt: ts,
  }));

  revisionSessions.push(
    {
      id: newId('rev'),
      subjectId: S('judiciaire').id,
      examId: null,
      chapterId: chapterByKey.get('judiciaire')![1].id,
      courseId: null,
      title: 'Ordre judiciaire / ordre administratif',
      date: d(0),
      time: '19:00',
      durationMinutes: 15,
      status: 'planned',
      createdAt: ts,
      updatedAt: ts,
    },
    {
      id: newId('rev'),
      subjectId: S('anglais').id,
      examId: examAnglais.id,
      chapterId: chapterByKey.get('anglais')![0].id,
      courseId: null,
      title: 'Legal vocabulary',
      date: d(0),
      time: '20:00',
      durationMinutes: 10,
      status: 'planned',
      createdAt: ts,
      updatedAt: ts,
    },
  );

  for (const session of revisionSessions) {
    if (session.status === 'cancelled') continue;
    events.push({
      id: newId('evt'),
      title: session.title,
      type: 'revision',
      subjectId: session.subjectId,
      courseId: null,
      examId: session.examId ?? null,
      taskId: null,
      saeId: null,
      revisionSessionId: session.id,
      date: session.date,
      startTime: session.time ?? '18:00',
      endTime: addMinutes(session.time ?? '18:00', session.durationMinutes),
      allDay: false,
      recurrence: null,
      createdAt: ts,
      updatedAt: ts,
    });
  }

  /* ------------------------------- SAE -------------------------------- */

  const saes: SAE[] = SEED_SAE.map((seed) => ({
    id: newId('sae'),
    semesterId: semester1.id,
    code: seed.code,
    title: seed.title,
    description: seed.description,
    startDate: d(seed.offsetStart),
    dueDate: d(seed.offsetDue),
    status: seed.status,
    subjectIds: seed.subjectKeys.map((key) => S(key).id),
    members:
      seed.code === 'SAÉ 1.02'
        ? [
            { id: newId('mbr'), firstName: 'Camille', role: 'Recherche juridique' },
            { id: newId('mbr'), firstName: 'Sofia', role: 'Présentation' },
            { id: newId('mbr'), firstName: 'Yanis', role: 'Relecture' },
          ]
        : [],
    notes: seed.code === 'SAÉ 1.02' ? 'Prochaine réunion de groupe : jeudi midi.' : undefined,
    createdAt: ts,
    updatedAt: ts,
  }));

  const sae102 = saes.find((s) => s.code === 'SAÉ 1.02')!;
  const sae104 = saes.find((s) => s.code === 'SAÉ 1.04')!;

  const saeTasks: SAETask[] = [
    { title: 'Recherche juridique', status: 'done', assignee: 'Camille' },
    { title: 'Présentation PowerPoint', status: 'doing', assignee: 'Sofia' },
    { title: 'Relecture', status: 'todo', assignee: 'Yanis' },
    { title: 'Présentation orale', status: 'todo' },
  ].map((task, index) => ({
    id: newId('sat'),
    saeId: sae102.id,
    title: task.title,
    status: task.status as SAETask['status'],
    assignee: task.assignee,
    dueDate: null,
    order: index,
  }));

  saeTasks.push(
    {
      id: newId('sat'),
      saeId: sae104.id,
      title: 'Rédiger le dossier',
      status: 'doing',
      dueDate: d(3),
      order: 0,
    },
    {
      id: newId('sat'),
      saeId: sae104.id,
      title: 'Relire et mettre en forme',
      status: 'todo',
      dueDate: d(4),
      order: 1,
    },
  );

  tasks.push({
    id: newId('tsk'),
    title: 'Préparer les slides de la SAÉ 1.02',
    subjectId: S('methodo').id,
    courseId: null,
    examId: null,
    saeId: sae102.id,
    type: 'projet',
    dueDate: d(9),
    dueTime: null,
    priority: 'normal',
    status: 'todo',
    subtasks: [],
    estimatedMinutes: 120,
    completedAt: null,
    createdAt: ts,
    updatedAt: ts,
  });

  events.push({
    id: newId('evt'),
    title: 'Rendu — SAÉ 1.04',
    type: 'sae',
    subjectId: S('expression').id,
    courseId: null,
    examId: null,
    taskId: null,
    saeId: sae104.id,
    revisionSessionId: null,
    date: d(4),
    startTime: '00:00',
    endTime: '23:59',
    allDay: true,
    recurrence: null,
    createdAt: ts,
    updatedAt: ts,
  });

  /* ------------------------------ Fiches ------------------------------ */

  const sheets: StudySheet[] = [
    {
      id: newId('sht'),
      subjectId: S('constit').id,
      chapterId: constitChapters[1].id,
      courseId: constitConstitution.id,
      title: 'La Constitution — l’essentiel',
      sections: [
        { id: newId('sec'), title: 'Définitions', content: 'Constitution : norme qui organise les pouvoirs publics.' },
        { id: newId('sec'), title: 'Principes', content: 'Suprématie de la Constitution dans l’ordre interne.' },
        { id: newId('sec'), title: 'Articles', content: 'À compléter depuis ta source officielle.' },
        { id: newId('sec'), title: 'Jurisprudences', content: 'À compléter avec tes notes de cours.' },
        { id: newId('sec'), title: 'Exemples', content: 'Exemple de démonstration.' },
        { id: newId('sec'), title: 'À retenir', content: 'Distinguer élaboration et révision de la Constitution.' },
      ],
      mastery: 'to_review',
      favorite: true,
      createdAt: ts,
      updatedAt: ts,
    },
    {
      id: newId('sht'),
      subjectId: S('intro').id,
      chapterId: chapterByKey.get('intro')![2].id,
      courseId: introSources.id,
      title: 'Les sources du droit',
      sections: [
        { id: newId('sec'), title: 'Définitions', content: 'Source du droit : origine d’une règle de droit.' },
        { id: newId('sec'), title: 'Principes', content: 'Hiérarchie entre les sources.' },
        { id: newId('sec'), title: 'À retenir', content: 'Distinguer sources écrites et non écrites.' },
      ],
      mastery: 'mastered',
      favorite: false,
      createdAt: ts,
      updatedAt: ts,
    },
    {
      id: newId('sht'),
      subjectId: S('personnes').id,
      chapterId: chapterByKey.get('personnes')![0].id,
      courseId: CO('personnes', 0).id,
      title: 'La personnalité juridique',
      sections: [
        { id: newId('sec'), title: 'Définitions', content: 'Aptitude à être titulaire de droits et d’obligations.' },
        { id: newId('sec'), title: 'À retenir', content: 'Personne physique / personne morale.' },
      ],
      mastery: 'to_learn',
      favorite: false,
      createdAt: ts,
      updatedAt: ts,
    },
    {
      id: newId('sht'),
      subjectId: S('methodo').id,
      chapterId: chapterByKey.get('methodo')![2].id,
      courseId: methodoFiche.id,
      title: 'Méthode — la fiche d’arrêt',
      sections: [
        { id: newId('sec'), title: 'Principes', content: 'Faits, procédure, prétentions, problème, solution, portée.' },
        { id: newId('sec'), title: 'À retenir', content: 'Le problème de droit se formule sous forme de question.' },
      ],
      mastery: 'mastered',
      favorite: true,
      createdAt: ts,
      updatedAt: ts,
    },
    {
      id: newId('sht'),
      subjectId: S('anglais').id,
      chapterId: chapterByKey.get('anglais')![0].id,
      courseId: null,
      title: 'Legal vocabulary',
      sections: [{ id: newId('sec'), title: 'À retenir', content: 'court, claim, evidence, ruling...' }],
      mastery: 'to_learn',
      favorite: false,
      createdAt: ts,
      updatedAt: ts,
    },
  ];

  /* ---------------------------- Flashcards ---------------------------- */

  const flashcards: Flashcard[] = [
    {
      subjectKey: 'personnes',
      question: 'Qu’est-ce qu’une personne morale ?',
      answer: 'Un groupement doté de la personnalité juridique (société, association, collectivité…).',
      mastery: 'to_review' as const,
    },
    {
      subjectKey: 'personnes',
      question: 'Qu’est-ce que la personnalité juridique ?',
      answer: 'L’aptitude à être titulaire de droits et d’obligations.',
      mastery: 'mastered' as const,
    },
    {
      subjectKey: 'constit',
      question: 'Quels sont les trois éléments constitutifs de l’État ?',
      answer: 'Un territoire, une population et un pouvoir politique organisé.',
      mastery: 'mastered' as const,
    },
    {
      subjectKey: 'constit',
      question: 'Que signifie la hiérarchie des normes ?',
      answer: 'Chaque norme doit respecter les normes qui lui sont supérieures.',
      mastery: 'to_review' as const,
    },
    {
      subjectKey: 'methodo',
      question: 'Quelles sont les étapes d’une fiche d’arrêt ?',
      answer: 'Faits, procédure, prétentions des parties, problème de droit, solution, portée.',
      mastery: 'mastered' as const,
    },
    {
      subjectKey: 'methodo',
      question: 'Comment se formule un problème de droit ?',
      answer: 'Sous forme d’une question juridique générale, sans nommer les parties.',
      mastery: 'to_learn' as const,
    },
    {
      subjectKey: 'judiciaire',
      question: 'Quels sont les deux ordres de juridiction en France ?',
      answer: 'L’ordre judiciaire et l’ordre administratif.',
      mastery: 'to_review' as const,
    },
    {
      subjectKey: 'intro',
      question: 'Cite trois caractères de la règle de droit.',
      answer: 'Générale, obligatoire, sanctionnée par l’autorité publique.',
      mastery: 'mastered' as const,
    },
    {
      subjectKey: 'anglais',
      question: 'Traduis « tribunal » en anglais.',
      answer: 'Court.',
      mastery: 'to_learn' as const,
    },
    {
      subjectKey: 'compta',
      question: 'Que représente le bilan ?',
      answer: 'La photographie du patrimoine de l’entreprise à une date donnée.',
      mastery: 'to_review' as const,
    },
  ].map((card) => ({
    id: newId('fcd'),
    subjectId: S(card.subjectKey).id,
    chapterId: null,
    courseId: null,
    sheetId: null,
    question: card.question,
    answer: card.answer,
    mastery: card.mastery,
    lastReviewedAt: null,
    dueAt: null,
    intervalDays: null,
    ease: null,
    reviewCount: 0,
    createdAt: ts,
    updatedAt: ts,
  }));

  /* ---------------------------- Documents ----------------------------- */

  const documents: DocumentItem[] = [
    {
      id: newId('doc'),
      name: 'CM03 — La Constitution.pdf',
      kind: 'pdf',
      blob: makeDemoPdf('CM03 - La Constitution', ['Plan du cours', '1. La notion de Constitution', '2. La revision']),
      mimeType: 'application/pdf',
      subjectId: S('constit').id,
      courseId: constitConstitution.id,
      favorite: true,
      createdAt: toDateISO(addDays(today, -9)) + 'T10:30',
    },
    {
      id: newId('doc'),
      name: 'TD02 — Trame de fiche d’arrêt.pdf',
      kind: 'pdf',
      blob: makeDemoPdf('TD02 - Trame de fiche d arret', ['Faits', 'Procedure', 'Probleme de droit', 'Solution']),
      mimeType: 'application/pdf',
      subjectId: S('methodo').id,
      courseId: methodoFiche.id,
      favorite: false,
      createdAt: toDateISO(addDays(today, -6)) + 'T15:10',
    },
    {
      id: newId('doc'),
      name: 'Plan de cours — Introduction générale au droit.pdf',
      kind: 'pdf',
      blob: makeDemoPdf('Plan de cours - Introduction generale au droit', ['Chapitre 1', 'Chapitre 2', 'Chapitre 3']),
      mimeType: 'application/pdf',
      subjectId: S('intro').id,
      favorite: false,
      createdAt: toDateISO(addDays(today, -30)) + 'T09:05',
    },
    {
      id: newId('doc'),
      name: 'SAÉ 1.02 — consignes.pdf',
      kind: 'pdf',
      blob: makeDemoPdf('SAE 1.02 - Consignes', ['Travail de groupe', 'Rendu ecrit + oral']),
      mimeType: 'application/pdf',
      saeId: sae102.id,
      subjectId: S('methodo').id,
      favorite: false,
      createdAt: toDateISO(addDays(today, -13)) + 'T11:45',
    },
    {
      id: newId('doc'),
      name: 'Légifrance',
      kind: 'link',
      url: 'https://www.legifrance.gouv.fr',
      subjectId: S('intro').id,
      favorite: true,
      createdAt: toDateISO(addDays(today, -20)) + 'T08:00',
    },
  ].map((doc) => ({
    size: doc.blob ? doc.blob.size : 0,
    storageRef: null,
    chapterId: null,
    ...doc,
  })) as DocumentItem[];

  /* ------------------------ Boite d'entree & notes -------------------- */

  const inbox: InboxItem[] = [
    {
      id: newId('inb'),
      text: 'Contrôle droit constitutionnel — vérifier la salle',
      status: 'pending',
      createdAt: toDateISO(addDays(today, -1)) + 'T10:12',
    },
    {
      id: newId('inb'),
      text: 'Faire fiche arrêt pour vendredi',
      status: 'pending',
      createdAt: toDateISO(addDays(today, -1)) + 'T14:44',
    },
    {
      id: newId('inb'),
      text: 'Demander le poly de compta à Camille',
      status: 'filed',
      filedAs: 'Tâche',
      createdAt: toDateISO(addDays(today, -5)) + 'T09:20',
    },
  ];

  const notes: Note[] = [
    {
      id: newId('nte'),
      courseId: constitConstitution.id,
      subjectId: S('constit').id,
      title: 'Remarque du prof',
      text: 'Insister sur la distinction entre pouvoir constituant originaire et dérivé.',
      createdAt: ts,
      updatedAt: ts,
    },
  ];

  /* ------------------------ Outils juridiques ------------------------- */

  const caseLaws: CaseLaw[] = [
    {
      id: newId('cas'),
      court: 'Cour de cassation',
      chamber: 'Assemblée plénière',
      date: null,
      dateLabel: '17 novembre 2000',
      number: '',
      subjectId: S('personnes').id,
      courseId: CO('personnes', 0).id,
      theme: 'Responsabilité / enfant à naître',
      facts: 'À compléter avec tes notes de cours.',
      principle: 'À compléter avec tes notes de cours.',
      solution: 'À compléter.',
      scope: 'À compléter.',
      tags: ['responsabilité', 'personne'],
      favorite: true,
      createdAt: ts,
      updatedAt: ts,
    },
    {
      id: newId('cas'),
      court: 'Conseil d’État',
      chamber: '',
      date: null,
      dateLabel: '',
      number: '',
      subjectId: S('judiciaire').id,
      courseId: null,
      theme: 'Ordre administratif — fiche à compléter',
      facts: '',
      principle: '',
      solution: '',
      scope: '',
      tags: ['à compléter'],
      favorite: false,
      createdAt: ts,
      updatedAt: ts,
    },
  ];

  const legalTerms: LegalTerm[] = SEED_LEGAL_TERMS.map((term, index) => ({
    id: newId('lex'),
    term: term.term,
    definition: term.definition,
    subjectId: S(term.subjectKey).id,
    chapterId: null,
    examples: '',
    favorite: index < 2,
    createdAt: ts,
    updatedAt: ts,
  }));

  const methodDocs: MethodDoc[] = [
    {
      id: newId('mth'),
      template: 'fiche_arret',
      title: 'Fiche d’arrêt — TD 2',
      subjectId: S('methodo').id,
      courseId: methodoFiche.id,
      fields: {
        juridiction: 'Cour de cassation',
        chambre: 'Première chambre civile',
        date: '',
        reference: '',
        faits: 'Résumé des faits (démonstration).',
        procedure: 'Rappel de la procédure.',
        pretentions: 'Prétentions des parties.',
        probleme: 'Formuler ici le problème de droit.',
        solution: 'Solution retenue.',
        motifs: 'Motifs de la décision.',
        portee: 'Portée de la décision.',
      },
      createdAt: ts,
      updatedAt: ts,
    },
    {
      id: newId('mth'),
      template: 'cas_pratique',
      title: 'Cas pratique — personnalité juridique',
      subjectId: S('personnes').id,
      courseId: CO('personnes', 4).id,
      fields: { faits: 'Faits pertinents à sélectionner.' },
      repeatable: [
        {
          id: newId('pb'),
          fields: {
            qualification: 'Qualification juridique des faits.',
            probleme: 'Problème juridique n°1.',
            regle: 'Règle de droit applicable.',
            application: 'Application au cas.',
            conclusion: 'Conclusion.',
          },
        },
      ],
      createdAt: ts,
      updatedAt: ts,
    },
  ];

  /* ---------------------- Resultats & sessions ------------------------ */

  const grades: Grade[] = [
    {
      id: newId('grd'),
      subjectId: S('constit').id,
      label: 'TD n°1',
      value: 14,
      outOf: 20,
      coefficient: 1,
      date: d(-12),
      createdAt: ts,
    },
    {
      id: newId('grd'),
      subjectId: S('methodo').id,
      label: 'Fiche d’arrêt',
      value: 16,
      outOf: 20,
      coefficient: 1,
      date: d(-8),
      createdAt: ts,
    },
    {
      id: newId('grd'),
      subjectId: S('compta').id,
      label: 'Contrôle',
      value: 12.5,
      outOf: 20,
      coefficient: 2,
      date: d(-5),
      createdAt: ts,
    },
    {
      id: newId('grd'),
      subjectId: S('intro').id,
      label: 'Interrogation écrite',
      value: 15,
      outOf: 20,
      coefficient: null,
      date: d(-16),
      createdAt: ts,
    },
  ];

  const focusPlan: { key: string; minutes: number; dayOffset: number }[] = [
    { key: 'constit', minutes: 45, dayOffset: -1 },
    { key: 'constit', minutes: 45, dayOffset: -2 },
    { key: 'constit', minutes: 40, dayOffset: -4 },
    { key: 'personnes', minutes: 50, dayOffset: -1 },
    { key: 'personnes', minutes: 45, dayOffset: -3 },
    { key: 'intro', minutes: 45, dayOffset: -2 },
    { key: 'intro', minutes: 25, dayOffset: -5 },
    { key: 'compta', minutes: 45, dayOffset: -3 },
    { key: 'anglais', minutes: 25, dayOffset: -4 },
    { key: 'anglais', minutes: 15, dayOffset: -6 },
    { key: 'methodo', minutes: 60, dayOffset: -5 },
  ];

  const focusSessions: FocusSession[] = focusPlan.map((plan) => {
    const started = addDays(today, plan.dayOffset);
    started.setHours(18, 0, 0, 0);
    return {
      id: newId('foc'),
      subjectId: S(plan.key).id,
      courseId: null,
      chapterId: null,
      plannedMinutes: plan.minutes,
      seconds: plan.minutes * 60,
      startedAt: toDateISO(started) + 'T18:00',
      endedAt: toDateISO(started) + 'T' + addMinutes('18:00', plan.minutes),
      completed: true,
    };
  });

  /* ---------------------------- Ecriture ------------------------------ */

  await db.events.bulkPut(events);
  await db.tasks.bulkPut(tasks);
  await db.revisionSessions.bulkPut(revisionSessions);
  await db.saes.bulkPut(saes);
  await db.saeTasks.bulkPut(saeTasks);
  await db.studySheets.bulkPut(sheets);
  await db.flashcards.bulkPut(flashcards);
  await db.documents.bulkPut(documents);
  await db.inbox.bulkPut(inbox);
  await db.notes.bulkPut(notes);
  await db.caseLaws.bulkPut(caseLaws);
  await db.legalTerms.bulkPut(legalTerms);
  await db.methodDocs.bulkPut(methodDocs);
  await db.grades.bulkPut(grades);
  await db.focusSessions.bulkPut(focusSessions);

  await db.settings.put(
    defaultSettings({
      currentAcademicYearId: year.id,
      currentSemesterId: semester1.id,
      onboardingDone: options.onboarded ?? true,
      demoDataLoaded: true,
    }),
  );
}

/* ------------------------------ Utilitaires --------------------------- */

function firstWeekdayOnOrAfter(from: Date, weekday: number): Date {
  const date = new Date(from);
  while (date.getDay() !== weekday) {
    date.setDate(date.getDate() + 1);
  }
  return date;
}

function addMinutes(time: string, minutes: number): string {
  const [h, m] = time.split(':').map(Number);
  const total = h * 60 + m + minutes;
  const hh = Math.floor(total / 60) % 24;
  return `${String(hh).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
}
