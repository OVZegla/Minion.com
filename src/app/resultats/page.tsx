'use client';

import { useMemo, useState } from 'react';
import { isWithinInterval } from 'date-fns';
import { ChartNoAxesColumn, Info, Plus, Trash2 } from 'lucide-react';
import { db } from '@/db/db';
import { EmptyState, PageHeader, ProgressBar, Segmented, SubjectBadge } from '@/components/ui';
import { Modal } from '@/components/ui/Modal';
import {
  useFocusSessions,
  useGrades,
  useRevisionSessions,
  useSubjectMap,
  useSubjects,
  useTasks,
} from '@/hooks/data';
import { useToast } from '@/components/ui/Toast';
import { newId } from '@/lib/id';
import { fmtDayShort, fmtDuration, nowISO, todayISO, weekEnd, weekStart } from '@/lib/dates';

type Tab = 'notes' | 'stats';

export default function ResultsPage() {
  const [tab, setTab] = useState<Tab>('notes');
  const grades = useGrades();
  const subjects = useSubjects();
  const subjectMap = useSubjectMap();
  const focusSessions = useFocusSessions();
  const revisionSessions = useRevisionSessions();
  const tasks = useTasks();
  const { toast, toastUndo } = useToast();

  const [adding, setAdding] = useState(false);
  const [subjectId, setSubjectId] = useState('');
  const [label, setLabel] = useState('');
  const [value, setValue] = useState('');
  const [outOf, setOutOf] = useState('20');
  const [coefficient, setCoefficient] = useState('');
  const [date, setDate] = useState(todayISO());

  /** Moyennes : ponderees seulement si TOUS les coefficients sont renseignes. */
  const averages = useMemo(() => {
    const bySubject = new Map<string, { sum: number; weight: number; simple: number; count: number; allWeighted: boolean }>();
    for (const grade of grades ?? []) {
      const scaled = (grade.value / grade.outOf) * 20;
      const entry =
        bySubject.get(grade.subjectId) ??
        { sum: 0, weight: 0, simple: 0, count: 0, allWeighted: true };
      const coef = grade.coefficient ?? null;
      if (coef === null) entry.allWeighted = false;
      entry.sum += scaled * (coef ?? 1);
      entry.weight += coef ?? 1;
      entry.simple += scaled;
      entry.count += 1;
      bySubject.set(grade.subjectId, entry);
    }
    return bySubject;
  }, [grades]);

  const overall = useMemo(() => {
    const list = grades ?? [];
    if (list.length === 0) return null;
    const allWeighted = list.every((grade) => grade.coefficient !== null && grade.coefficient !== undefined);
    const scaled = list.map((grade) => ({
      value: (grade.value / grade.outOf) * 20,
      coef: grade.coefficient ?? 1,
    }));
    const weighted =
      scaled.reduce((sum, item) => sum + item.value * item.coef, 0) /
      scaled.reduce((sum, item) => sum + item.coef, 0);
    const simple = scaled.reduce((sum, item) => sum + item.value, 0) / scaled.length;
    return { value: allWeighted ? weighted : simple, allWeighted };
  }, [grades]);

  const week = useMemo(() => {
    const start = weekStart(new Date());
    const end = weekEnd(new Date());
    const inWeek = (iso?: string | null) =>
      Boolean(iso) && isWithinInterval(new Date(`${iso!.slice(0, 10)}T12:00`), { start, end });

    const weekFocus = (focusSessions ?? []).filter((session) => inWeek(session.startedAt));
    const weekRevisions = (revisionSessions ?? []).filter(
      (session) => session.status === 'done' && inWeek(session.date),
    );
    const minutesBySubject = new Map<string, number>();
    for (const session of weekFocus) {
      if (!session.subjectId) continue;
      minutesBySubject.set(
        session.subjectId,
        (minutesBySubject.get(session.subjectId) ?? 0) + session.seconds / 60,
      );
    }
    for (const session of weekRevisions) {
      minutesBySubject.set(
        session.subjectId,
        (minutesBySubject.get(session.subjectId) ?? 0) + session.durationMinutes,
      );
    }
    const totalMinutes = Array.from(minutesBySubject.values()).reduce((a, b) => a + b, 0);
    return {
      totalMinutes: Math.round(totalMinutes),
      sessions: weekFocus.length + weekRevisions.length,
      doneTasks: (tasks ?? []).filter(
        (task) => task.status === 'done' && inWeek(task.completedAt ?? task.dueDate),
      ).length,
      coursesWorked: new Set(
        weekFocus.map((session) => session.courseId).filter(Boolean) as string[],
      ).size,
      bySubject: Array.from(minutesBySubject.entries())
        .map(([id, minutes]) => ({ id, minutes: Math.round(minutes) }))
        .sort((a, b) => b.minutes - a.minutes),
    };
  }, [focusSessions, revisionSessions, tasks]);

  const maxMinutes = week.bySubject[0]?.minutes ?? 0;

  return (
    <>
      <PageHeader
        title="Résultats"
        actions={
          tab === 'notes' ? (
            <button type="button" className="btn-primary" onClick={() => setAdding(true)}>
              <Plus size={16} />
              Note
            </button>
          ) : undefined
        }
      >
        <Segmented
          ariaLabel="Sections des résultats"
          value={tab}
          onChange={setTab}
          options={[
            { value: 'notes', label: 'Mes notes' },
            { value: 'stats', label: 'Temps de travail' },
          ]}
        />
      </PageHeader>

      {tab === 'notes' ? (
        (grades ?? []).length === 0 ? (
          <EmptyState
            icon={<ChartNoAxesColumn size={20} />}
            title="Aucune note pour l’instant"
            description="Ajoute tes notes au fil de l’année pour suivre où tu en es."
            action={
              <button type="button" className="btn-primary" onClick={() => setAdding(true)}>
                Ajouter une note
              </button>
            }
          />
        ) : (
          <div className="space-y-6">
            {overall ? (
              <div className="rounded-2xl border border-line bg-surface p-4">
                <p className="text-[13px] text-muted">Moyenne générale (ramenée sur 20)</p>
                <p className="mt-1 text-[28px] font-semibold tracking-tight text-ink">
                  {overall.value.toFixed(2)} <span className="text-[16px] text-muted">/ 20</span>
                </p>
                <p className="mt-1.5 inline-flex items-start gap-1.5 text-[12px] text-muted">
                  <Info size={13} className="mt-0.5 shrink-0" />
                  {overall.allWeighted
                    ? 'Moyenne pondérée par les coefficients que tu as saisis.'
                    : 'Moyenne simple : certains coefficients ne sont pas renseignés.'}
                </p>
              </div>
            ) : null}

            <ul className="space-y-2">
              {(grades ?? []).map((grade) => {
                const subject = subjectMap.get(grade.subjectId);
                return (
                  <li
                    key={grade.id}
                    className="flex items-center gap-3 rounded-2xl border border-line bg-surface px-4 py-3"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[14px] font-medium text-ink">{grade.label}</p>
                      <p className="mt-0.5 flex flex-wrap items-center gap-2 text-[12px] text-muted">
                        {subject ? (
                          <SubjectBadge name={subject.shortName} color={subject.color} size="sm" />
                        ) : null}
                        <span>{fmtDayShort(grade.date)}</span>
                        {grade.coefficient ? <span>Coef. {grade.coefficient}</span> : null}
                      </p>
                    </div>
                    <p className="shrink-0 text-[16px] font-semibold tabular-nums text-ink">
                      {grade.value} <span className="text-[13px] text-muted">/ {grade.outOf}</span>
                    </p>
                    <button
                      type="button"
                      className="btn-ghost h-9 w-9 shrink-0 rounded-xl p-0"
                      aria-label={`Supprimer ${grade.label}`}
                      onClick={async () => {
                        const snapshot = grade;
                        await db.grades.delete(grade.id);
                        toastUndo('Note supprimée', async () => {
                          await db.grades.put(snapshot);
                        });
                      }}
                    >
                      <Trash2 size={16} />
                    </button>
                  </li>
                );
              })}
            </ul>

            <section>
              <h2 className="mb-2 text-[15px] font-semibold text-ink">Moyennes par matière</h2>
              <ul className="space-y-2">
                {Array.from(averages.entries()).map(([id, entry]) => {
                  const subject = subjectMap.get(id);
                  const average = entry.allWeighted ? entry.sum / entry.weight : entry.simple / entry.count;
                  return (
                    <li
                      key={id}
                      className="flex items-center justify-between gap-3 rounded-2xl border border-line bg-surface px-4 py-3"
                    >
                      <span className="min-w-0 truncate text-[14px] text-ink">
                        {subject?.name ?? 'Matière supprimée'}
                      </span>
                      <span className="shrink-0 text-[14px] font-semibold tabular-nums text-ink">
                        {average.toFixed(2)} / 20
                        {!entry.allWeighted ? (
                          <span className="ml-1.5 text-[11px] font-normal text-muted">
                            (moyenne simple)
                          </span>
                        ) : null}
                      </span>
                    </li>
                  );
                })}
              </ul>
            </section>
          </div>
        )
      ) : null}

      {tab === 'stats' ? (
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              { label: 'de travail', value: fmtDuration(week.totalMinutes) },
              { label: 'sessions', value: week.sessions },
              { label: 'tâches terminées', value: week.doneTasks },
              { label: 'cours travaillés', value: week.coursesWorked },
            ].map((stat) => (
              <div key={stat.label} className="rounded-2xl border border-line bg-surface px-4 py-3">
                <p className="text-[20px] font-semibold tracking-tight text-ink">{stat.value}</p>
                <p className="mt-0.5 text-[12px] text-muted">{stat.label}</p>
              </div>
            ))}
          </div>

          <section>
            <h2 className="mb-2 text-[15px] font-semibold text-ink">Répartition cette semaine</h2>
            {week.bySubject.length === 0 ? (
              <EmptyState
                title="Pas encore de temps enregistré"
                description="Lance une session de focus ou marque une révision comme terminée."
              />
            ) : (
              <ul className="space-y-2">
                {week.bySubject.map((entry) => {
                  const subject = subjectMap.get(entry.id);
                  return (
                    <li
                      key={entry.id}
                      className="flex flex-wrap items-center gap-3 rounded-2xl border border-line bg-surface px-4 py-3"
                    >
                      <span className="min-w-0 flex-1 truncate text-[14px] text-ink">
                        {subject?.name ?? 'Sans matière'}
                      </span>
                      <span className="shrink-0 text-[13px] text-muted">
                        {fmtDuration(entry.minutes)}
                      </span>
                      <div className="w-full sm:w-48">
                        <ProgressBar
                          value={maxMinutes ? (entry.minutes / maxMinutes) * 100 : 0}
                          color={subject?.color}
                          size="sm"
                          label={`Temps sur ${subject?.name ?? 'cette matière'}`}
                        />
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
            <p className="mt-3 text-[12px] text-muted">
              Ces chiffres viennent de tes sessions de focus et de tes révisions marquées comme
              terminées. Ils servent de repère, pas de jugement.
            </p>
          </section>
        </div>
      ) : null}

      <Modal
        open={adding}
        onClose={() => setAdding(false)}
        title="Ajouter une note"
        footer={
          <>
            <button type="button" className="btn-outline" onClick={() => setAdding(false)}>
              Annuler
            </button>
            <button type="submit" form="grade-form" className="btn-primary">
              Ajouter
            </button>
          </>
        }
      >
        <form
          id="grade-form"
          className="space-y-4"
          onSubmit={async (event) => {
            event.preventDefault();
            if (!subjectId || !value) return;
            await db.grades.put({
              id: newId('grd'),
              subjectId,
              label: label.trim() || 'Évaluation',
              value: Number(value),
              outOf: Number(outOf) || 20,
              coefficient: coefficient ? Number(coefficient) : null,
              date,
              createdAt: nowISO(),
            });
            toast('Note ajoutée');
            setAdding(false);
            setLabel('');
            setValue('');
            setCoefficient('');
          }}
        >
          <div>
            <label className="label" htmlFor="gr-subject">
              Matière
            </label>
            <select
              id="gr-subject"
              className="field"
              value={subjectId}
              onChange={(event) => setSubjectId(event.target.value)}
              required
            >
              <option value="">Choisir…</option>
              {(subjects ?? []).map((subject) => (
                <option key={subject.id} value={subject.id}>
                  {subject.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label" htmlFor="gr-label">
              Évaluation
            </label>
            <input
              id="gr-label"
              className="field"
              placeholder="TD n°1"
              value={label}
              onChange={(event) => setLabel(event.target.value)}
            />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="label" htmlFor="gr-value">
                Note
              </label>
              <input
                id="gr-value"
                type="number"
                step={0.25}
                min={0}
                className="field"
                value={value}
                onChange={(event) => setValue(event.target.value)}
                required
              />
            </div>
            <div>
              <label className="label" htmlFor="gr-outof">
                Sur
              </label>
              <input
                id="gr-outof"
                type="number"
                min={1}
                className="field"
                value={outOf}
                onChange={(event) => setOutOf(event.target.value)}
              />
            </div>
            <div>
              <label className="label" htmlFor="gr-coef">
                Coefficient
              </label>
              <input
                id="gr-coef"
                type="number"
                min={0}
                step={0.5}
                className="field"
                value={coefficient}
                onChange={(event) => setCoefficient(event.target.value)}
              />
            </div>
          </div>
          <div>
            <label className="label" htmlFor="gr-date">
              Date
            </label>
            <input
              id="gr-date"
              type="date"
              className="field"
              value={date}
              onChange={(event) => setDate(event.target.value)}
            />
          </div>
        </form>
      </Modal>
    </>
  );
}
