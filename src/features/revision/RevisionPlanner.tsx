'use client';

import { useMemo, useState } from 'react';
import { addDays } from 'date-fns';
import { CalendarPlus } from 'lucide-react';
import { createRevisionSession } from '@/db/repo';
import { useChapters, useExams, useRevisionSessions, useSubjectMap } from '@/hooks/data';
import { useToast } from '@/components/ui/Toast';
import { MasteryPill } from '@/components/ui';
import { daysUntil, fmtDayShort, toDateISO, todayISO } from '@/lib/dates';

/**
 * Plan de revision : on choisit un examen, puis on place manuellement
 * chaque chapitre a une date. Chaque session cree aussi un evenement
 * dans le calendrier.
 */
export function RevisionPlanner() {
  const exams = useExams();
  const subjects = useSubjectMap();
  const sessions = useRevisionSessions();
  const { toast } = useToast();
  const upcoming = useMemo(
    () => (exams ?? []).filter((exam) => daysUntil(exam.date) >= 0),
    [exams],
  );
  const [examId, setExamId] = useState<string>('');
  const exam = upcoming.find((item) => item.id === examId) ?? upcoming[0];
  const chapters = useChapters(exam?.subjectId);
  const [dates, setDates] = useState<Record<string, string>>({});
  const [duration, setDuration] = useState('45');

  if (upcoming.length === 0) {
    return (
      <p className="rounded-2xl border border-dashed border-line px-4 py-8 text-center text-sm text-muted">
        Ajoute un examen pour construire un plan de révision.
      </p>
    );
  }

  const scoped = (chapters ?? []).filter((chapter) => exam?.chapterIds.includes(chapter.id));
  const plannedByChapter = new Map(
    (sessions ?? [])
      .filter((session) => session.examId === exam?.id && session.chapterId)
      .map((session) => [session.chapterId as string, session]),
  );

  const suggestDate = (index: number): string => {
    if (!exam) return todayISO();
    const remaining = Math.max(1, daysUntil(exam.date));
    const stepDays = Math.max(1, Math.floor(remaining / Math.max(1, scoped.length)));
    return toDateISO(addDays(new Date(), Math.min(remaining - 1, index * stepDays)));
  };

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
        <div>
          <label className="label" htmlFor="rp-exam">
            Examen à préparer
          </label>
          <select
            id="rp-exam"
            className="field"
            value={exam?.id ?? ''}
            onChange={(event) => setExamId(event.target.value)}
          >
            {upcoming.map((item) => (
              <option key={item.id} value={item.id}>
                {item.title} — {fmtDayShort(item.date)}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label" htmlFor="rp-duration">
            Durée (min)
          </label>
          <input
            id="rp-duration"
            type="number"
            min={5}
            step={5}
            className="field w-28"
            value={duration}
            onChange={(event) => setDuration(event.target.value)}
          />
        </div>
      </div>

      {exam ? (
        <p className="text-[13px] text-muted">
          {subjects.get(exam.subjectId)?.name} · {scoped.length} chapitre
          {scoped.length > 1 ? 's' : ''} · examen dans {Math.max(0, daysUntil(exam.date))} jour
          {daysUntil(exam.date) > 1 ? 's' : ''}
        </p>
      ) : null}

      {scoped.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-line px-4 py-6 text-center text-sm text-muted">
          Cet examen n’a pas encore de chapitres associés. Ajoute-les depuis la page Examens.
        </p>
      ) : (
        <ul className="space-y-2">
          {scoped.map((chapter, index) => {
            const planned = plannedByChapter.get(chapter.id);
            const value = dates[chapter.id] ?? planned?.date ?? suggestDate(index);
            return (
              <li
                key={chapter.id}
                className="flex flex-wrap items-center gap-2 rounded-2xl border border-line bg-surface px-3.5 py-3"
              >
                <span className="min-w-0 flex-1 truncate text-[14px] text-ink">{chapter.title}</span>
                <MasteryPill level={chapter.mastery} />
                <input
                  type="date"
                  className="field w-auto py-1.5"
                  aria-label={`Date de révision pour ${chapter.title}`}
                  value={value}
                  onChange={(event) =>
                    setDates((current) => ({ ...current, [chapter.id]: event.target.value }))
                  }
                />
                {planned ? (
                  <span className="chip text-muted">
                    {planned.status === 'done' ? 'Terminée' : `Planifiée ${fmtDayShort(planned.date)}`}
                  </span>
                ) : (
                  <button
                    type="button"
                    className="btn-soft shrink-0 text-[13px]"
                    onClick={async () => {
                      if (!exam) return;
                      await createRevisionSession({
                        subjectId: exam.subjectId,
                        examId: exam.id,
                        chapterId: chapter.id,
                        title: chapter.title,
                        date: value,
                        time: '18:00',
                        durationMinutes: Number(duration) || 45,
                      });
                      toast('Session ajoutée au calendrier');
                    }}
                  >
                    <CalendarPlus size={15} />
                    Planifier
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
