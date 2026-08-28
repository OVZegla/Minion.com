'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { CalendarClock, GraduationCap, MapPin, Pencil, Plus } from 'lucide-react';
import { db } from '@/db/db';
import { EmptyState, MasteryPill, PageHeader, ProgressBar, Segmented, SubjectBadge } from '@/components/ui';
import { ExamDetail } from '@/features/exams/ExamDetail';
import {
  useChapters,
  useExams,
  useRevisionSessions,
  useSubjectMap,
  useTasks,
} from '@/hooks/data';
import { useUi } from '@/components/layout/AppProviders';
import { examProgress, nextMastery } from '@/lib/progress';
import { daysUntil, fmtDayFull, fmtDuration, nowISO, relativeCountdown } from '@/lib/dates';
import type { Exam } from '@/types';

export default function ExamsPage() {
  const exams = useExams();
  const chapters = useChapters();
  const subjects = useSubjectMap();
  const sessions = useRevisionSessions();
  const tasks = useTasks();
  const { openQuickAdd } = useUi();
  const [scope, setScope] = useState<'upcoming' | 'past'>('upcoming');
  const [editing, setEditing] = useState<Exam | null>(null);

  const visible = useMemo(() => {
    const list = exams ?? [];
    return scope === 'upcoming'
      ? list.filter((exam) => daysUntil(exam.date) >= 0)
      : list.filter((exam) => daysUntil(exam.date) < 0).reverse();
  }, [exams, scope]);

  const chaptersById = useMemo(
    () => new Map((chapters ?? []).map((chapter) => [chapter.id, chapter])),
    [chapters],
  );

  return (
    <>
      <PageHeader
        title="Examens"
        subtitle={
          scope === 'upcoming' && visible.length > 0
            ? `Ton prochain examen arrive ${relativeCountdown(visible[0].date)}.`
            : undefined
        }
        actions={
          <>
            <Segmented
              ariaLabel="Filtrer les examens"
              value={scope}
              onChange={setScope}
              options={[
                { value: 'upcoming', label: 'À venir' },
                { value: 'past', label: 'Passés' },
              ]}
            />
            <button type="button" className="btn-primary" onClick={() => openQuickAdd('exam')}>
              <Plus size={16} />
              Examen
            </button>
          </>
        }
      />

      {visible.length === 0 ? (
        <EmptyState
          icon={<GraduationCap size={20} />}
          title={scope === 'upcoming' ? 'Rien de prévu pour le moment 🎉' : 'Aucun examen passé'}
          description={
            scope === 'upcoming'
              ? 'Ajoute un examen pour suivre ta préparation chapitre par chapitre.'
              : 'Les examens passés apparaîtront ici.'
          }
          action={
            scope === 'upcoming' ? (
              <button type="button" className="btn-primary" onClick={() => openQuickAdd('exam')}>
                Ajouter un examen
              </button>
            ) : undefined
          }
        />
      ) : (
        <ol className="space-y-4">
          {visible.map((exam) => {
            const subject = subjects.get(exam.subjectId);
            const result = examProgress(chapters ?? [], exam.chapterIds);
            const days = daysUntil(exam.date);
            const examSessions = (sessions ?? []).filter((session) => session.examId === exam.id);
            const examTasks = (tasks ?? []).filter((task) => task.examId === exam.id);

            return (
              <li key={exam.id} className="relative rounded-2xl border border-line bg-surface p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    {subject ? (
                      <SubjectBadge
                        name={subject.name}
                        color={subject.color}
                        href={`/matieres/${subject.id}`}
                      />
                    ) : null}
                    <h2 className="mt-2 text-[18px] font-semibold tracking-tight text-ink">
                      {exam.title}
                    </h2>
                    <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px] text-muted">
                      <span className="inline-flex items-center gap-1">
                        <CalendarClock size={13} />
                        {fmtDayFull(exam.date)}
                        {exam.time ? ` · ${exam.time}` : ''}
                      </span>
                      {exam.room ? (
                        <span className="inline-flex items-center gap-1">
                          <MapPin size={13} />
                          {exam.room}
                        </span>
                      ) : null}
                      {exam.durationMinutes ? <span>{fmtDuration(exam.durationMinutes)}</span> : null}
                      {exam.coefficient ? <span>Coef. {exam.coefficient}</span> : null}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {days >= 0 ? (
                      <div className="rounded-xl bg-primary-soft px-3 py-2 text-center">
                        <p className="text-[18px] font-bold leading-none text-accent">
                          {days === 0 ? "Auj." : days}
                        </p>
                        {days > 0 ? (
                          <p className="mt-0.5 text-[10px] text-accent/80">
                            jour{days > 1 ? 's' : ''} restant{days > 1 ? 's' : ''}
                          </p>
                        ) : null}
                      </div>
                    ) : null}
                    <button
                      type="button"
                      onClick={() => setEditing(exam)}
                      className="btn-ghost h-9 w-9 rounded-xl p-0"
                      aria-label={`Modifier ${exam.title}`}
                    >
                      <Pencil size={16} />
                    </button>
                  </div>
                </div>

                <div className="mt-4">
                  <div className="flex items-baseline justify-between gap-2">
                    <p className="text-[13px] font-medium text-muted">Préparation</p>
                    <p className="text-[12px] text-muted">
                      {result.total > 0
                        ? `${result.mastered}/${result.total} chapitre${result.total > 1 ? 's' : ''} maîtrisé${result.mastered > 1 ? 's' : ''}`
                        : 'Aucun chapitre associé'}
                    </p>
                  </div>
                  <div className="mt-1.5">
                    <ProgressBar value={result.percent} color={subject?.color} label="Préparation" />
                  </div>
                </div>

                {exam.chapterIds.length > 0 ? (
                  <ul className="mt-4 space-y-1.5">
                    {exam.chapterIds.map((chapterId) => {
                      const chapter = chaptersById.get(chapterId);
                      if (!chapter) return null;
                      return (
                        <li
                          key={chapterId}
                          className="flex items-center justify-between gap-3 rounded-xl bg-surface2/60 px-3 py-2"
                        >
                          <span className="min-w-0 truncate text-[13px] text-ink">{chapter.title}</span>
                          <MasteryPill
                            level={chapter.mastery}
                            onClick={async () => {
                              await db.chapters.update(chapter.id, {
                                mastery: nextMastery(chapter.mastery),
                                updatedAt: nowISO(),
                              });
                            }}
                          />
                        </li>
                      );
                    })}
                  </ul>
                ) : null}

                {(examSessions.length > 0 || examTasks.length > 0 || exam.notes) && (
                  <div className="mt-4 grid gap-3 border-t border-line pt-4 sm:grid-cols-2">
                    {examSessions.length > 0 ? (
                      <div>
                        <p className="text-[12px] font-semibold uppercase tracking-wide text-muted">
                          Sessions de révision
                        </p>
                        <ul className="mt-1.5 space-y-1">
                          {examSessions.slice(0, 4).map((session) => (
                            <li key={session.id} className="text-[13px] text-ink">
                              {session.title}{' '}
                              <span className="text-muted">
                                · {relativeCountdown(session.date)}
                                {session.status === 'done' ? ' · terminée' : ''}
                              </span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    ) : null}
                    {examTasks.length > 0 ? (
                      <div>
                        <p className="text-[12px] font-semibold uppercase tracking-wide text-muted">
                          Tâches liées
                        </p>
                        <ul className="mt-1.5 space-y-1">
                          {examTasks.map((task) => (
                            <li key={task.id} className="text-[13px] text-ink">
                              {task.title}
                              {task.status === 'done' ? (
                                <span className="text-muted"> · terminée</span>
                              ) : null}
                            </li>
                          ))}
                        </ul>
                      </div>
                    ) : null}
                    {exam.notes ? (
                      <p className="text-[13px] leading-relaxed text-muted sm:col-span-2">
                        {exam.notes}
                      </p>
                    ) : null}
                  </div>
                )}

                <div className="mt-4 flex flex-wrap gap-2">
                  <Link href="/revisions" className="btn-soft text-[13px]">
                    Planifier mes révisions
                  </Link>
                  {subject ? (
                    <Link href={`/matieres/${subject.id}`} className="btn-ghost text-[13px]">
                      Voir la matière
                    </Link>
                  ) : null}
                </div>
              </li>
            );
          })}
        </ol>
      )}

      <ExamDetail exam={editing} open={Boolean(editing)} onClose={() => setEditing(null)} />
    </>
  );
}
