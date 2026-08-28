'use client';

import { use, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  BookOpen,
  CalendarClock,
  FileText,
  FolderOpen,
  GraduationCap,
  ListTodo,
  Pencil,
  Plus,
} from 'lucide-react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/db/db';
import {
  useChapters,
  useCourses,
  useEvents,
  useExams,
  useRevisionSessions,
  useStudySheets,
  useSubject,
  useTasksBySubject,
} from '@/hooks/data';
import { EmptyState, PageHeader, ProgressBar, Segmented, SubjectBadge } from '@/components/ui';
import { ChapterList } from '@/features/subjects/ChapterList';
import { SubjectEditor } from '@/features/subjects/SubjectEditor';
import { TaskCard } from '@/features/tasks/TaskCard';
import { toggleTask } from '@/db/repo';
import { nextUpcoming } from '@/features/calendar/helpers';
import { computeProgress, MASTERY_LABEL } from '@/lib/progress';
import { fmtDayShort, fmtDuration, relativeCountdown, relativeDayLabel } from '@/lib/dates';
import { useUi } from '@/components/layout/AppProviders';
import { formatBytes } from '@/lib/text';

type Tab = 'apercu' | 'cours' | 'fiches' | 'documents' | 'devoirs' | 'examens' | 'revisions';

export default function SubjectPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const subject = useSubject(id);
  const chapters = useChapters(id);
  const courses = useCourses(id);
  const sheets = useStudySheets(id);
  const tasks = useTasksBySubject(id);
  const exams = useExams();
  const sessions = useRevisionSessions();
  const events = useEvents();
  const documents = useLiveQuery(
    async () => db.documents.where('subjectId').equals(id).toArray(),
    [id],
  );
  const [tab, setTab] = useState<Tab>('apercu');
  const [editing, setEditing] = useState(false);
  const { openQuickAdd } = useUi();

  const subjectExams = useMemo(
    () => (exams ?? []).filter((exam) => exam.subjectId === id),
    [exams, id],
  );
  const subjectSessions = useMemo(
    () => (sessions ?? []).filter((session) => session.subjectId === id),
    [sessions, id],
  );
  const nextCourse = useMemo(
    () => nextUpcoming((events ?? []).filter((event) => event.subjectId === id)),
    [events, id],
  );

  const progress = computeProgress(chapters ?? []);
  const openTasks = (tasks ?? []).filter((task) => task.status !== 'done');
  const nextExam = subjectExams.find((exam) => relativeCountdown(exam.date) !== 'hier');
  const nextTask = openTasks.find((task) => task.dueDate);

  if (subject === undefined) return null;
  if (!subject) {
    return (
      <EmptyState
        title="Matière introuvable"
        description="Elle a peut-être été supprimée."
        action={
          <Link href="/matieres" className="btn-primary">
            Retour aux matières
          </Link>
        }
      />
    );
  }

  const TABS: { value: Tab; label: string }[] = [
    { value: 'apercu', label: 'Vue d’ensemble' },
    { value: 'cours', label: `Cours (${courses?.length ?? 0})` },
    { value: 'fiches', label: `Fiches (${sheets?.length ?? 0})` },
    { value: 'documents', label: `Documents (${documents?.length ?? 0})` },
    { value: 'devoirs', label: `Devoirs (${openTasks.length})` },
    { value: 'examens', label: `Examens (${subjectExams.length})` },
    { value: 'revisions', label: `Révisions (${subjectSessions.length})` },
  ];

  return (
    <>
      <PageHeader
        title={subject.name}
        subtitle={[subject.teacher, subject.room].filter(Boolean).join(' · ') || undefined}
        actions={
          <>
            <button type="button" className="btn-outline" onClick={() => setEditing(true)}>
              <Pencil size={15} />
              Modifier
            </button>
            <button type="button" className="btn-primary" onClick={() => openQuickAdd('course')}>
              <Plus size={16} />
              Cours
            </button>
          </>
        }
      >
        <div className="flex flex-wrap items-center gap-3">
          <SubjectBadge name={subject.shortName} color={subject.color} />
          {subject.isArchived ? (
            <span className="chip text-muted">Archivée</span>
          ) : null}
          <div className="min-w-[180px] flex-1 sm:max-w-xs">
            <ProgressBar value={progress.percent} color={subject.color} label="Progression" />
          </div>
        </div>
        {subject.description ? (
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted">{subject.description}</p>
        ) : null}
      </PageHeader>

      <div className="mb-6 -mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
        <Segmented ariaLabel="Sections de la matière" value={tab} onChange={setTab} options={TABS} />
      </div>

      {tab === 'apercu' ? (
        <div className="space-y-6">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <InfoCard
              icon={<CalendarClock size={15} />}
              label="Prochain cours"
              value={
                nextCourse
                  ? `${fmtDayShort(nextCourse.date)} · ${nextCourse.event.startTime}`
                  : 'Aucun prévu'
              }
              hint={nextCourse?.event.room}
            />
            <InfoCard
              icon={<ListTodo size={15} />}
              label="Prochain devoir"
              value={nextTask ? relativeDayLabel(nextTask.dueDate!) : 'Rien à rendre'}
              hint={nextTask?.title}
            />
            <InfoCard
              icon={<GraduationCap size={15} />}
              label="Prochain examen"
              value={nextExam ? relativeCountdown(nextExam.date) : 'Aucun'}
              hint={nextExam?.title}
            />
            <InfoCard
              icon={<BookOpen size={15} />}
              label="Progression"
              value={`${progress.percent} %`}
              hint={`${progress.mastered}/${progress.total} chapitres maîtrisés`}
            />
          </div>

          <section>
            <h2 className="mb-3 text-[15px] font-semibold text-ink">Chapitres</h2>
            <ChapterList subjectId={id} chapters={chapters ?? []} />
            <p className="mt-2 text-[12px] text-muted">
              Repères personnels : {Object.values(MASTERY_LABEL).join(' · ')}.
            </p>
          </section>

          {(documents ?? []).length > 0 ? (
            <section>
              <h2 className="mb-3 text-[15px] font-semibold text-ink">Derniers documents</h2>
              <ul className="space-y-2">
                {(documents ?? []).slice(0, 3).map((doc) => (
                  <li
                    key={doc.id}
                    className="flex items-center gap-3 rounded-2xl border border-line bg-surface px-3.5 py-3"
                  >
                    <FolderOpen size={16} className="shrink-0 text-muted" />
                    <span className="min-w-0 flex-1 truncate text-[14px] text-ink">{doc.name}</span>
                    <span className="shrink-0 text-[12px] text-muted">
                      {doc.kind === 'link' ? 'Lien' : formatBytes(doc.size)}
                    </span>
                  </li>
                ))}
              </ul>
              <Link href="/documents" className="btn-ghost mt-2 text-[13px]">
                Tous les documents
              </Link>
            </section>
          ) : null}
        </div>
      ) : null}

      {tab === 'cours' ? (
        (courses ?? []).length === 0 ? (
          <EmptyState
            icon={<BookOpen size={20} />}
            title="Aucun cours pour cette matière"
            description="Ajoute ta première séance pour commencer à prendre des notes."
            action={
              <button type="button" className="btn-primary" onClick={() => openQuickAdd('course')}>
                Créer un cours
              </button>
            }
          />
        ) : (
          <ul className="space-y-2">
            {(courses ?? []).map((course) => (
              <li key={course.id}>
                <Link
                  href={`/cours/${course.id}`}
                  className="flex items-center gap-3 rounded-2xl border border-line bg-surface px-4 py-3 transition hover:border-primary-line"
                >
                  <span className="w-12 shrink-0 text-[12px] font-semibold uppercase tracking-wide text-muted">
                    {String(course.number).padStart(2, '0')}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[14px] font-medium text-ink">
                      {course.title}
                    </span>
                    <span className="mt-0.5 block text-[12px] text-muted">
                      {course.kind}
                      {course.date ? ` · ${fmtDayShort(course.date)}` : ''}
                    </span>
                  </span>
                  <span className="chip shrink-0 text-muted">{MASTERY_LABEL[course.mastery]}</span>
                </Link>
              </li>
            ))}
          </ul>
        )
      ) : null}

      {tab === 'fiches' ? (
        (sheets ?? []).length === 0 ? (
          <EmptyState
            icon={<FileText size={20} />}
            title="Aucune fiche"
            description="Crée ta première fiche de révision."
            action={
              <button type="button" className="btn-primary" onClick={() => openQuickAdd('sheet')}>
                Créer une fiche
              </button>
            }
          />
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2">
            {(sheets ?? []).map((sheet) => (
              <li key={sheet.id}>
                <Link
                  href={`/fiches/${sheet.id}`}
                  className="block rounded-2xl border border-line bg-surface p-4 transition hover:border-primary-line"
                >
                  <p className="truncate text-[14px] font-semibold text-ink">{sheet.title}</p>
                  <p className="mt-1 text-[12px] text-muted">
                    {sheet.sections.length} sections · {MASTERY_LABEL[sheet.mastery]}
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        )
      ) : null}

      {tab === 'documents' ? (
        (documents ?? []).length === 0 ? (
          <EmptyState
            icon={<FolderOpen size={20} />}
            title="Aucun document"
            description="Dépose un PDF, une image ou un lien pour le retrouver ici."
            action={
              <button type="button" className="btn-primary" onClick={() => openQuickAdd('document')}>
                Ajouter un document
              </button>
            }
          />
        ) : (
          <ul className="space-y-2">
            {(documents ?? []).map((doc) => (
              <li
                key={doc.id}
                className="flex items-center gap-3 rounded-2xl border border-line bg-surface px-3.5 py-3"
              >
                <FolderOpen size={16} className="shrink-0 text-muted" />
                <span className="min-w-0 flex-1 truncate text-[14px] text-ink">{doc.name}</span>
                <span className="shrink-0 text-[12px] text-muted">
                  {doc.kind === 'link' ? 'Lien' : formatBytes(doc.size)}
                </span>
              </li>
            ))}
          </ul>
        )
      ) : null}

      {tab === 'devoirs' ? (
        (tasks ?? []).length === 0 ? (
          <EmptyState
            icon={<ListTodo size={20} />}
            title="Rien à faire ici 🎉"
            description="Aucune tâche liée à cette matière."
            action={
              <button type="button" className="btn-primary" onClick={() => openQuickAdd('task')}>
                Ajouter une tâche
              </button>
            }
          />
        ) : (
          <ul className="space-y-2">
            {(tasks ?? []).map((task) => (
              <li key={task.id}>
                <TaskCard task={task} subject={subject} onToggle={() => void toggleTask(task.id)} />
              </li>
            ))}
          </ul>
        )
      ) : null}

      {tab === 'examens' ? (
        subjectExams.length === 0 ? (
          <EmptyState
            icon={<GraduationCap size={20} />}
            title="Rien de prévu pour le moment 🎉"
            action={
              <button type="button" className="btn-primary" onClick={() => openQuickAdd('exam')}>
                Ajouter un examen
              </button>
            }
          />
        ) : (
          <ul className="space-y-2">
            {subjectExams.map((exam) => (
              <li key={exam.id} className="rounded-2xl border border-line bg-surface p-4">
                <div className="flex items-baseline justify-between gap-3">
                  <p className="truncate text-[14px] font-semibold text-ink">{exam.title}</p>
                  <span className="shrink-0 text-[12px] text-muted">
                    {fmtDayShort(exam.date)}
                    {exam.time ? ` · ${exam.time}` : ''}
                  </span>
                </div>
                <p className="mt-1 text-[12px] text-muted">
                  {exam.chapterIds.length} chapitre{exam.chapterIds.length > 1 ? 's' : ''}
                  {exam.room ? ` · ${exam.room}` : ''}
                </p>
                <Link href="/examens" className="btn-ghost mt-2 -ml-2 text-[13px]">
                  Ouvrir dans Examens
                </Link>
              </li>
            ))}
          </ul>
        )
      ) : null}

      {tab === 'revisions' ? (
        subjectSessions.length === 0 ? (
          <EmptyState
            title="Aucune session planifiée"
            description="Planifie une session pour préparer tes examens sereinement."
            action={
              <button type="button" className="btn-primary" onClick={() => openQuickAdd('revision')}>
                Planifier une révision
              </button>
            }
          />
        ) : (
          <ul className="space-y-2">
            {subjectSessions.map((session) => (
              <li
                key={session.id}
                className="flex items-center gap-3 rounded-2xl border border-line bg-surface px-3.5 py-3"
              >
                <span className="w-20 shrink-0 text-[12px] text-muted">
                  {fmtDayShort(session.date)}
                </span>
                <span className="min-w-0 flex-1 truncate text-[14px] text-ink">{session.title}</span>
                <span className="shrink-0 text-[12px] text-muted">
                  {fmtDuration(session.durationMinutes)}
                </span>
              </li>
            ))}
          </ul>
        )
      ) : null}

      <SubjectEditor subject={subject} open={editing} onClose={() => setEditing(false)} />
    </>
  );
}

function InfoCard({
  icon,
  label,
  value,
  hint,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="rounded-2xl border border-line bg-surface p-4">
      <p className="flex items-center gap-1.5 text-[12px] text-muted">
        {icon}
        {label}
      </p>
      <p className="mt-1 truncate text-[15px] font-semibold text-ink">{value}</p>
      {hint ? <p className="mt-0.5 truncate text-[12px] text-muted">{hint}</p> : null}
    </div>
  );
}
