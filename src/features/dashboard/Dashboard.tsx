'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { addDays, isWithinInterval } from 'date-fns';
import {
  ArrowRight,
  BookOpen,
  CalendarDays,
  CircleCheckBig,
  Clock,
  GraduationCap,
  ListTodo,
  MapPin,
  Sparkles,
  Timer,
} from 'lucide-react';
import {
  useChapters,
  useEvents,
  useExams,
  useFocusSessions,
  useProgressBySubject,
  useRevisionSessions,
  useSettings,
  useSubjectCounters,
  useSubjectMap,
  useSubjects,
  useTasks,
} from '@/hooks/data';
import { toggleTask } from '@/db/repo';
import { EmptyState, ProgressBar, SectionHeader, SubjectBadge } from '@/components/ui';
import { EventChip } from '@/features/calendar/EventChip';
import { SubjectCard } from '@/features/subjects/SubjectCard';
import { TaskCard } from '@/features/tasks/TaskCard';
import { nextUpcoming, occurrencesForDay } from '@/features/calendar/helpers';
import { examProgress } from '@/lib/progress';
import {
  daysUntil,
  fmtDayLong,
  fmtDuration,
  greeting,
  relativeCountdown,
  todayISO,
  weekEnd,
  weekStart,
} from '@/lib/dates';
import { useUi } from '@/components/layout/AppProviders';

export function Dashboard() {
  const settings = useSettings();
  const subjects = useSubjects();
  const subjectMap = useSubjectMap();
  const events = useEvents();
  const tasks = useTasks();
  const exams = useExams();
  const chapters = useChapters();
  const sessions = useRevisionSessions();
  const focusSessions = useFocusSessions();
  const counters = useSubjectCounters();
  const progress = useProgressBySubject();
  const { openQuickAdd } = useUi();

  const now = new Date();
  const today = todayISO();

  const todayOccurrences = useMemo(
    () => occurrencesForDay(events ?? [], now),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [events, today],
  );

  const nextCourse = useMemo(
    () => nextUpcoming(events ?? [], now, ['cours', 'cm', 'td', 'tp']),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [events, today],
  );

  const minutesToNext = nextCourse
    ? Math.round((nextCourse.start.getTime() - now.getTime()) / 60000)
    : null;

  /* --------------------------- À faire ------------------------------ */
  const priorityRank = { urgent: 0, high: 1, normal: 2, low: 3 } as const;
  const topTasks = useMemo(() => {
    const open = (tasks ?? []).filter((task) => task.status !== 'done');
    return open
      .map((task) => {
        const days = task.dueDate ? daysUntil(task.dueDate, now) : 999;
        return { task, days };
      })
      .sort((a, b) => {
        if (a.days !== b.days) return a.days - b.days;
        return priorityRank[a.task.priority] - priorityRank[b.task.priority];
      })
      .slice(0, 4);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tasks, today]);

  /* -------------------------- Examens ------------------------------- */
  const upcomingExams = useMemo(
    () =>
      (exams ?? [])
        .filter((exam) => daysUntil(exam.date, now) >= 0)
        .slice(0, 2)
        .map((exam) => {
          const result = examProgress(chapters ?? [], exam.chapterIds);
          return { exam, result };
        }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [exams, chapters, today],
  );

  /* ------------------------ Cette semaine --------------------------- */
  const week = useMemo(() => {
    const start = weekStart(now);
    const end = weekEnd(now);
    const inWeek = (iso?: string | null) =>
      Boolean(iso) && isWithinInterval(new Date(`${iso}T12:00`), { start, end });

    let courseCount = 0;
    for (let i = 0; i < 7; i += 1) {
      const day = addDays(start, i);
      courseCount += occurrencesForDay(events ?? [], day).filter((occ) =>
        ['cours', 'cm', 'td', 'tp'].includes(occ.event.type),
      ).length;
    }

    const doneTasks = (tasks ?? []).filter(
      (task) => task.status === 'done' && inWeek(task.completedAt?.slice(0, 10) ?? task.dueDate),
    ).length;
    const dueTasks = (tasks ?? []).filter(
      (task) => task.status !== 'done' && inWeek(task.dueDate),
    ).length;
    const weekExams = (exams ?? []).filter((exam) => inWeek(exam.date)).length;

    const focusMinutes = (focusSessions ?? [])
      .filter((session) => inWeek(session.startedAt.slice(0, 10)))
      .reduce((total, session) => total + session.seconds / 60, 0);
    const revisionMinutes = (sessions ?? [])
      .filter((session) => session.status === 'done' && inWeek(session.date))
      .reduce((total, session) => total + session.durationMinutes, 0);

    return {
      courseCount,
      doneTasks,
      dueTasks,
      weekExams,
      minutes: Math.round(focusMinutes + revisionMinutes),
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [events, tasks, exams, focusSessions, sessions, today]);

  /* -------------------------- Matières ------------------------------ */
  const featuredSubjects = useMemo(() => {
    const examSubjects = new Set((exams ?? []).filter((e) => daysUntil(e.date, now) >= 0).map((e) => e.subjectId));
    return [...(subjects ?? [])]
      .sort((a, b) => {
        const aExam = examSubjects.has(a.id) ? 0 : 1;
        const bExam = examSubjects.has(b.id) ? 0 : 1;
        if (aExam !== bExam) return aExam - bExam;
        return (counters.get(b.id)?.courses ?? 0) - (counters.get(a.id)?.courses ?? 0);
      })
      .slice(0, 3);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subjects, exams, counters, today]);

  const todayRevisions = (sessions ?? []).filter(
    (session) => session.date === today && session.status === 'planned',
  );

  const name = settings?.displayName?.trim();

  if (!subjects) return null;

  return (
    <div className="space-y-8">
      {/* ------------------------- En-tête ------------------------- */}
      <header>
        <p className="text-[13px] font-medium uppercase tracking-wide text-muted">
          {fmtDayLong(now)}
        </p>
        <h1 className="mt-1 text-[26px] font-semibold tracking-tight text-ink sm:text-[32px]">
          {greeting(now)}
          {name ? ` ${name}` : ''} 👋
        </h1>
        <p className="mt-1 text-[15px] text-muted">
          {todayOccurrences.length > 0
            ? 'Voilà ce qui t’attend aujourd’hui.'
            : 'Rien de prévu au planning aujourd’hui.'}
        </p>
      </header>

      {/* ---------- Prochain cours (mise en avant mobile) ---------- */}
      {nextCourse ? (
        <section className="lg:hidden">
          <SectionHeader title="Prochain cours" />
          <Link
            href="/calendrier"
            className="block rounded-2xl border border-line bg-surface p-4 transition active:scale-[.995]"
          >
            <div className="flex items-start gap-3">
              <div className="shrink-0 text-center">
                <p className="text-[22px] font-semibold leading-none tabular-nums text-ink">
                  {nextCourse.event.startTime}
                </p>
                <p className="mt-1 text-[11px] text-muted">{nextCourse.event.endTime}</p>
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[15px] font-semibold text-ink">
                  {nextCourse.event.title ||
                    subjectMap.get(nextCourse.event.subjectId ?? '')?.name ||
                    'Cours'}
                </p>
                <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[12px] text-muted">
                  {nextCourse.event.room ? (
                    <span className="inline-flex items-center gap-1">
                      <MapPin size={12} />
                      {nextCourse.event.room}
                    </span>
                  ) : null}
                  {minutesToNext !== null && minutesToNext > 0 && minutesToNext < 24 * 60 ? (
                    <span className="inline-flex items-center gap-1 font-medium text-accent">
                      <Clock size={12} />
                      Dans {fmtDuration(minutesToNext)}
                    </span>
                  ) : minutesToNext !== null && minutesToNext <= 0 ? (
                    <span className="font-medium text-accent">En cours</span>
                  ) : (
                    <span>{relativeCountdown(nextCourse.date)}</span>
                  )}
                </div>
              </div>
            </div>
          </Link>
        </section>
      ) : null}

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
        {/* ------------------------ Aujourd'hui ---------------------- */}
        <section>
          <SectionHeader
            title="Aujourd’hui"
            icon={<CalendarDays size={16} className="text-muted" />}
            action={
              <Link href="/calendrier" className="btn-ghost text-[13px]">
                Calendrier
                <ArrowRight size={14} />
              </Link>
            }
          />
          {todayOccurrences.length === 0 ? (
            <EmptyState
              icon={<Sparkles size={20} />}
              title="Journée libre 🎉"
              description="Aucun cours prévu aujourd’hui. C’est le moment idéal pour avancer tes révisions."
              action={
                <Link href="/revisions" className="btn-soft">
                  Voir mes révisions
                </Link>
              }
            />
          ) : (
            <ol className="space-y-2">
              {todayOccurrences.map((occurrence) => {
                const subject = occurrence.event.subjectId
                  ? subjectMap.get(occurrence.event.subjectId)
                  : undefined;
                const isPast = occurrence.end.getTime() < now.getTime();
                const isNow =
                  occurrence.start.getTime() <= now.getTime() &&
                  occurrence.end.getTime() >= now.getTime();
                return (
                  <li key={occurrence.key} className={isPast ? 'opacity-50' : ''}>
                    <div className="flex gap-3">
                      <div className="w-[52px] shrink-0 pt-1.5 text-right">
                        <p className="text-[13px] font-semibold tabular-nums text-ink">
                          {occurrence.event.startTime}
                        </p>
                        <p className="text-[11px] tabular-nums text-muted">
                          {occurrence.event.endTime}
                        </p>
                      </div>
                      <div className="relative flex-1">
                        {isNow ? (
                          <span className="absolute -left-[7px] top-3 h-2 w-2 rounded-full bg-[color:var(--danger)] ring-4 ring-bg" />
                        ) : null}
                        <EventChip
                          occurrence={occurrence}
                          subject={subject}
                          onClick={undefined}
                        />
                      </div>
                    </div>
                  </li>
                );
              })}
            </ol>
          )}

          {todayRevisions.length > 0 ? (
            <div className="mt-4 rounded-2xl border border-[color:var(--primary-line)] bg-primary-soft p-3.5">
              <p className="flex items-center gap-2 text-[13px] font-semibold text-accent">
                <CircleCheckBig size={15} />
                À réviser aujourd’hui
              </p>
              <ul className="mt-2 space-y-1.5">
                {todayRevisions.slice(0, 3).map((session) => (
                  <li key={session.id} className="flex items-center justify-between gap-2 text-[13px]">
                    <span className="min-w-0 truncate text-accent">{session.title}</span>
                    <span className="shrink-0 text-[12px] text-accent/80">
                      {fmtDuration(session.durationMinutes)}
                    </span>
                  </li>
                ))}
              </ul>
              <Link href="/revisions" className="btn-soft mt-3 w-full justify-center text-[13px]">
                Ouvrir mes révisions
              </Link>
            </div>
          ) : null}
        </section>

        <div className="space-y-8">
          {/* --------------------- À faire ---------------------- */}
          <section>
            <SectionHeader
              title="À faire"
              icon={<ListTodo size={16} className="text-muted" />}
              action={
                <Link href="/a-faire" className="btn-ghost text-[13px]">
                  Tout voir
                  <ArrowRight size={14} />
                </Link>
              }
            />
            {topTasks.length === 0 ? (
              <EmptyState
                title="Tout est terminé 🎉"
                description="Tu peux souffler, rien d’urgent pour le moment."
                action={
                  <button type="button" className="btn-soft" onClick={() => openQuickAdd('task')}>
                    Ajouter une tâche
                  </button>
                }
              />
            ) : (
              <ul className="space-y-2">
                {topTasks.map(({ task }) => (
                  <li key={task.id}>
                    <TaskCard
                      task={task}
                      subject={task.subjectId ? subjectMap.get(task.subjectId) : undefined}
                      onToggle={() => void toggleTask(task.id)}
                      compact
                    />
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/* ------------------ Prochains examens ---------------- */}
          <section>
            <SectionHeader
              title="Prochains examens"
              icon={<GraduationCap size={16} className="text-muted" />}
              action={
                <Link href="/examens" className="btn-ghost text-[13px]">
                  Tout voir
                  <ArrowRight size={14} />
                </Link>
              }
            />
            {upcomingExams.length === 0 ? (
              <EmptyState
                title="Rien de prévu pour le moment 🎉"
                description="Ajoute un examen pour suivre ta préparation."
                action={
                  <button type="button" className="btn-soft" onClick={() => openQuickAdd('exam')}>
                    Ajouter un examen
                  </button>
                }
              />
            ) : (
              <ul className="space-y-3">
                {upcomingExams.map(({ exam, result }) => {
                  const subject = subjectMap.get(exam.subjectId);
                  const days = daysUntil(exam.date, now);
                  return (
                    <li key={exam.id} className="rounded-2xl border border-line bg-surface p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          {subject ? (
                            <SubjectBadge name={subject.name} color={subject.color} size="sm" />
                          ) : null}
                          <p className="mt-1.5 truncate text-[15px] font-semibold text-ink">
                            {exam.title}
                          </p>
                        </div>
                        <div className="shrink-0 rounded-xl bg-primary-soft px-2.5 py-1 text-center">
                          <p className="text-[15px] font-bold leading-none text-accent">
                            {days === 0 ? "Auj." : days}
                          </p>
                          {days > 0 ? (
                            <p className="mt-0.5 text-[10px] text-accent/80">
                              jour{days > 1 ? 's' : ''}
                            </p>
                          ) : null}
                        </div>
                      </div>
                      <div className="mt-3">
                        <ProgressBar
                          value={result.percent}
                          color={subject?.color}
                          label={`Préparation ${exam.title}`}
                        />
                        <p className="mt-1.5 text-[12px] text-muted">
                          {result.total > 0
                            ? `${result.mastered} chapitre${result.mastered > 1 ? 's' : ''} sur ${result.total} maîtrisé${result.mastered > 1 ? 's' : ''}`
                            : 'Aucun chapitre associé pour l’instant'}
                        </p>
                      </div>
                      <Link href="/revisions" className="btn-soft mt-3 w-full justify-center text-[13px]">
                        Continuer les révisions
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        </div>
      </div>

      {/* ------------------------ Mes matières --------------------- */}
      <section>
        <SectionHeader
          title="Mes matières"
          icon={<BookOpen size={16} className="text-muted" />}
          action={
            <Link href="/matieres" className="btn-ghost text-[13px]">
              Toutes les matières
              <ArrowRight size={14} />
            </Link>
          }
        />
        {featuredSubjects.length === 0 ? (
          <EmptyState
            title="Aucune matière pour l’instant"
            description="Crée ta première matière pour organiser tes cours."
            action={
              <button type="button" className="btn-primary" onClick={() => openQuickAdd('subject')}>
                Ajouter une matière
              </button>
            }
          />
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {featuredSubjects.map((subject) => {
              const counter = counters.get(subject.id);
              return (
                <SubjectCard
                  key={subject.id}
                  subject={subject}
                  courses={counter?.courses ?? 0}
                  sheets={counter?.sheets ?? 0}
                  openTasks={counter?.openTasks ?? 0}
                  percent={progress.get(subject.id)?.percent ?? 0}
                />
              );
            })}
          </div>
        )}
      </section>

      {/* ------------------------ Cette semaine -------------------- */}
      <section>
        <SectionHeader title="Cette semaine" icon={<Timer size={16} className="text-muted" />} />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {[
            { label: 'cours', value: week.courseCount },
            { label: 'tâches terminées', value: week.doneTasks },
            { label: 'à rendre', value: week.dueTasks },
            { label: week.weekExams > 1 ? 'examens' : 'examen', value: week.weekExams },
            { label: 'de travail', value: fmtDuration(week.minutes) },
          ].map((stat) => (
            <div key={stat.label} className="rounded-2xl border border-line bg-surface px-4 py-3">
              <p className="text-[20px] font-semibold tracking-tight text-ink">{stat.value}</p>
              <p className="mt-0.5 text-[12px] text-muted">{stat.label}</p>
            </div>
          ))}
        </div>
        <p className="mt-2 text-[12px] text-muted">
          Le temps de travail additionne tes sessions de focus et tes révisions terminées.
        </p>
      </section>
    </div>
  );
}
