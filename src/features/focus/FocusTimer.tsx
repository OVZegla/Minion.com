'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Pause, Play, Square, Timer } from 'lucide-react';
import { db } from '@/db/db';
import { useCourses, useSubjectMap, useSubjects } from '@/hooks/data';
import { useToast } from '@/components/ui/Toast';
import { PageHeader, SectionHeader } from '@/components/ui';
import { newId } from '@/lib/id';
import { fmtClock, fmtDuration, nowISO } from '@/lib/dates';

const PRESETS = [
  { label: '25 min', minutes: 25 },
  { label: '45 min', minutes: 45 },
  { label: '60 min', minutes: 60 },
  { label: 'Libre', minutes: 0 },
];

type Phase = 'setup' | 'running' | 'paused' | 'finished';

export function FocusTimer() {
  const params = useSearchParams();
  const subjects = useSubjects();
  const subjectMap = useSubjectMap();
  const { toast } = useToast();

  const [subjectId, setSubjectId] = useState<string | null>(params.get('subject'));
  const [courseId, setCourseId] = useState<string | null>(null);
  const [label, setLabel] = useState(params.get('label') ?? '');
  const [planned, setPlanned] = useState(Number(params.get('minutes')) || 45);
  const [phase, setPhase] = useState<Phase>('setup');
  const [seconds, setSeconds] = useState(0);
  const startedAt = useRef<string | null>(null);
  const courses = useCourses(subjectId);

  useEffect(() => {
    if (phase !== 'running') return;
    const timer = window.setInterval(() => setSeconds((value) => value + 1), 1000);
    return () => window.clearInterval(timer);
  }, [phase]);

  const remaining = planned > 0 ? planned * 60 - seconds : null;

  useEffect(() => {
    if (remaining !== null && remaining <= 0 && phase === 'running') {
      setPhase('finished');
      void save(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [remaining, phase]);

  const subject = subjectId ? subjectMap.get(subjectId) : undefined;
  const course = useMemo(
    () => (courses ?? []).find((item) => item.id === courseId),
    [courses, courseId],
  );

  const save = async (completed: boolean) => {
    if (seconds < 5) return;
    await db.focusSessions.put({
      id: newId('foc'),
      subjectId,
      courseId,
      chapterId: null,
      label: label.trim() || undefined,
      plannedMinutes: planned || null,
      seconds,
      startedAt: startedAt.current ?? nowISO(),
      endedAt: nowISO(),
      completed,
    });
  };

  const start = () => {
    startedAt.current = nowISO();
    setSeconds(0);
    setPhase('running');
  };

  const stop = async () => {
    setPhase('finished');
    await save(false);
  };

  const reset = () => {
    setPhase('setup');
    setSeconds(0);
  };

  if (phase === 'finished') {
    return (
      <div className="mx-auto max-w-md rounded-2xl border border-line bg-surface p-8 text-center">
        <p className="text-[22px] font-semibold tracking-tight text-ink">Session terminée 🎉</p>
        <p className="mt-2 text-[15px] text-muted">
          {fmtDuration(Math.round(seconds / 60))}
          {subject ? ` ajoutées à ${subject.name}` : ' de travail enregistrées'}.
        </p>
        <div className="mt-5 flex justify-center gap-2">
          <button type="button" className="btn-primary" onClick={reset}>
            Nouvelle session
          </button>
        </div>
      </div>
    );
  }

  if (phase === 'setup') {
    return (
      <div className="mx-auto max-w-lg space-y-5 rounded-2xl border border-line bg-surface p-6">
        <div>
          <label className="label" htmlFor="focus-subject">
            Matière
          </label>
          <select
            id="focus-subject"
            className="field"
            value={subjectId ?? ''}
            onChange={(event) => {
              setSubjectId(event.target.value || null);
              setCourseId(null);
            }}
          >
            <option value="">Sans matière</option>
            {(subjects ?? []).map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </select>
        </div>

        {(courses ?? []).length > 0 ? (
          <div>
            <label className="label" htmlFor="focus-course">
              Cours / chapitre
            </label>
            <select
              id="focus-course"
              className="field"
              value={courseId ?? ''}
              onChange={(event) => setCourseId(event.target.value || null)}
            >
              <option value="">Aucun</option>
              {(courses ?? []).map((item) => (
                <option key={item.id} value={item.id}>
                  {item.title}
                </option>
              ))}
            </select>
          </div>
        ) : null}

        <div>
          <label className="label" htmlFor="focus-label">
            Sur quoi travailles-tu ?
          </label>
          <input
            id="focus-label"
            className="field"
            value={label}
            placeholder="Facultatif"
            onChange={(event) => setLabel(event.target.value)}
          />
        </div>

        <div>
          <span className="label">Durée</span>
          <div className="flex flex-wrap gap-2">
            {PRESETS.map((preset) => (
              <button
                key={preset.label}
                type="button"
                aria-pressed={planned === preset.minutes}
                onClick={() => setPlanned(preset.minutes)}
                className={
                  planned === preset.minutes
                    ? 'chip border-primary-line bg-primary-soft text-accent'
                    : 'chip text-muted hover:bg-surface2'
                }
              >
                {preset.label}
              </button>
            ))}
          </div>
        </div>

        <button type="button" className="btn-primary w-full justify-center" onClick={start}>
          <Play size={17} />
          Commencer une session
        </button>
      </div>
    );
  }

  const display = remaining !== null ? Math.max(0, remaining) : seconds;

  return (
    <div className="mx-auto max-w-lg rounded-2xl border border-line bg-surface p-8 text-center">
      {subject ? (
        <p className="text-[15px] font-semibold" style={{ color: 'var(--accent-text)' }}>
          {subject.name}
        </p>
      ) : null}
      {(label || course) && (
        <p className="mt-1 text-[14px] text-muted">{label || course?.title}</p>
      )}
      <p className="mt-6 font-mono text-[56px] font-semibold leading-none tabular-nums text-ink">
        {fmtClock(display)}
      </p>
      {remaining !== null ? (
        <p className="mt-2 text-[13px] text-muted">sur {fmtDuration(planned)}</p>
      ) : (
        <p className="mt-2 text-[13px] text-muted">temps libre</p>
      )}

      <div className="mt-7 flex justify-center gap-2">
        <button
          type="button"
          className="btn-outline"
          onClick={() => setPhase(phase === 'running' ? 'paused' : 'running')}
        >
          {phase === 'running' ? <Pause size={16} /> : <Play size={16} />}
          {phase === 'running' ? 'Pause' : 'Reprendre'}
        </button>
        <button type="button" className="btn-primary" onClick={() => void stop()}>
          <Square size={15} />
          Terminer
        </button>
      </div>
      <button
        type="button"
        className="btn-ghost mt-3 text-[13px]"
        onClick={() => {
          toast('Session abandonnée');
          reset();
        }}
      >
        Abandonner sans enregistrer
      </button>
    </div>
  );
}

export function FocusHeader() {
  return (
    <PageHeader
      title="Focus"
      subtitle="Une session, une matière. Le temps est ajouté à tes statistiques."
    />
  );
}

export function FocusRecent({ items }: { items: { id: string; label: string; minutes: number }[] }) {
  if (items.length === 0) return null;
  return (
    <section className="mx-auto mt-8 max-w-lg">
      <SectionHeader title="Dernières sessions" icon={<Timer size={16} className="text-muted" />} />
      <ul className="space-y-1.5">
        {items.map((item) => (
          <li
            key={item.id}
            className="flex items-center justify-between rounded-xl border border-line bg-surface px-3.5 py-2.5 text-[13px]"
          >
            <span className="min-w-0 truncate text-ink">{item.label}</span>
            <span className="shrink-0 text-muted">{fmtDuration(item.minutes)}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
