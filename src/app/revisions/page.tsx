'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { CircleCheckBig, Layers, Play, Plus, Timer } from 'lucide-react';
import { db } from '@/db/db';
import { syncRevisionEvent } from '@/db/repo';
import {
  EmptyState,
  PageHeader,
  ProgressBar,
  SectionHeader,
  Segmented,
  SubjectBadge,
} from '@/components/ui';
import { RevisionPlanner } from '@/features/revision/RevisionPlanner';
import { FlashcardPlayer } from '@/features/revision/FlashcardPlayer';
import {
  useFlashcards,
  useProgressBySubject,
  useRevisionSessions,
  useSubjects,
  useSubjectMap,
} from '@/hooks/data';
import { useUi } from '@/components/layout/AppProviders';
import { useToast } from '@/components/ui/Toast';
import { fmtDuration, nowISO, relativeDayLabel, todayISO } from '@/lib/dates';
import type { RevisionStatus } from '@/types';

type Tab = 'aujourdhui' | 'plan' | 'progression';

export default function RevisionsPage() {
  const sessions = useRevisionSessions();
  const subjects = useSubjects();
  const subjectMap = useSubjectMap();
  const progress = useProgressBySubject();
  const flashcards = useFlashcards();
  const { openQuickAdd } = useUi();
  const { toast } = useToast();
  const [tab, setTab] = useState<Tab>('aujourdhui');
  const [deckSubject, setDeckSubject] = useState<string>('');
  const [playing, setPlaying] = useState(false);

  const today = todayISO();

  const todaySessions = useMemo(
    () => (sessions ?? []).filter((session) => session.date === today && session.status === 'planned'),
    [sessions, today],
  );

  const laterSessions = useMemo(
    () =>
      (sessions ?? [])
        .filter((session) => session.date > today && session.status === 'planned')
        .slice(0, 6),
    [sessions, today],
  );

  const totalToday = todaySessions.reduce((sum, session) => sum + session.durationMinutes, 0);

  const deck = useMemo(
    () => (flashcards ?? []).filter((card) => (deckSubject ? card.subjectId === deckSubject : true)),
    [flashcards, deckSubject],
  );

  const setStatus = async (id: string, status: RevisionStatus) => {
    const session = await db.revisionSessions.get(id);
    if (!session) return;
    const updated = { ...session, status, updatedAt: nowISO() };
    await db.revisionSessions.put(updated);
    await syncRevisionEvent(updated);
    toast(
      status === 'done'
        ? 'Session terminée 🎉'
        : status === 'postponed'
          ? 'Session reportée'
          : 'Session annulée',
    );
  };

  return (
    <>
      <PageHeader
        title="Révisions"
        subtitle={
          todaySessions.length > 0
            ? `${todaySessions.length} session${todaySessions.length > 1 ? 's' : ''} prévue${todaySessions.length > 1 ? 's' : ''} aujourd’hui · ${fmtDuration(totalToday)}`
            : 'Rien de planifié aujourd’hui.'
        }
        actions={
          <button type="button" className="btn-primary" onClick={() => openQuickAdd('revision')}>
            <Plus size={16} />
            Session
          </button>
        }
      >
        <Segmented
          ariaLabel="Sections des révisions"
          value={tab}
          onChange={setTab}
          options={[
            { value: 'aujourdhui', label: 'À réviser' },
            { value: 'plan', label: 'Plan de révision' },
            { value: 'progression', label: 'Mes progressions' },
          ]}
        />
      </PageHeader>

      {tab === 'aujourdhui' ? (
        <div className="space-y-8">
          <section>
            <SectionHeader
              title="À réviser aujourd’hui"
              icon={<CircleCheckBig size={16} className="text-muted" />}
            />
            {todaySessions.length === 0 ? (
              <EmptyState
                title="Rien de prévu aujourd’hui 🎉"
                description="Tu peux planifier une session ou piocher dans tes flashcards."
                action={
                  <button
                    type="button"
                    className="btn-primary"
                    onClick={() => openQuickAdd('revision')}
                  >
                    Planifier une session
                  </button>
                }
              />
            ) : (
              <ul className="space-y-2">
                {todaySessions.map((session) => {
                  const subject = subjectMap.get(session.subjectId);
                  return (
                    <li
                      key={session.id}
                      className="flex flex-wrap items-center gap-3 rounded-2xl border border-line bg-surface px-4 py-3"
                    >
                      <div className="min-w-0 flex-1">
                        {subject ? (
                          <SubjectBadge name={subject.shortName} color={subject.color} size="sm" />
                        ) : null}
                        <p className="mt-1 truncate text-[14px] font-medium text-ink">
                          {session.title}
                        </p>
                      </div>
                      <span className="shrink-0 text-[13px] text-muted">
                        {session.time ? `${session.time} · ` : ''}
                        {fmtDuration(session.durationMinutes)}
                      </span>
                      <div className="flex shrink-0 gap-1.5">
                        <Link
                          href={`/focus?subject=${session.subjectId}&minutes=${session.durationMinutes}&label=${encodeURIComponent(session.title)}`}
                          className="btn-soft text-[13px]"
                        >
                          <Play size={14} />
                          Démarrer
                        </Link>
                        <button
                          type="button"
                          className="btn-outline text-[13px]"
                          onClick={() => void setStatus(session.id, 'done')}
                        >
                          Terminée
                        </button>
                        <button
                          type="button"
                          className="btn-ghost text-[13px]"
                          onClick={() => void setStatus(session.id, 'postponed')}
                        >
                          Reporter
                        </button>
                        <button
                          type="button"
                          className="btn-ghost text-[13px]"
                          onClick={() => void setStatus(session.id, 'cancelled')}
                        >
                          Annuler
                        </button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>

          {laterSessions.length > 0 ? (
            <section>
              <SectionHeader title="Prochaines sessions" />
              <ul className="space-y-2">
                {laterSessions.map((session) => {
                  const subject = subjectMap.get(session.subjectId);
                  return (
                    <li
                      key={session.id}
                      className="flex items-center gap-3 rounded-2xl border border-line bg-surface px-4 py-3"
                    >
                      <span className="w-24 shrink-0 text-[12px] text-muted">
                        {relativeDayLabel(session.date)}
                      </span>
                      <span className="min-w-0 flex-1 truncate text-[14px] text-ink">
                        {session.title}
                      </span>
                      {subject ? (
                        <SubjectBadge name={subject.shortName} color={subject.color} size="sm" />
                      ) : null}
                      <span className="shrink-0 text-[12px] text-muted">
                        {fmtDuration(session.durationMinutes)}
                      </span>
                    </li>
                  );
                })}
              </ul>
            </section>
          ) : null}

          <section>
            <SectionHeader
              title="Flashcards"
              subtitle={`${(flashcards ?? []).length} carte${(flashcards ?? []).length > 1 ? 's' : ''} au total`}
              icon={<Layers size={16} className="text-muted" />}
            />
            <div className="flex flex-wrap items-end gap-3 rounded-2xl border border-line bg-surface p-4">
              <div className="min-w-[200px] flex-1">
                <label className="label" htmlFor="deck-subject">
                  Matière
                </label>
                <select
                  id="deck-subject"
                  className="field"
                  value={deckSubject}
                  onChange={(event) => setDeckSubject(event.target.value)}
                >
                  <option value="">Toutes les matières</option>
                  {(subjects ?? []).map((subject) => (
                    <option key={subject.id} value={subject.id}>
                      {subject.name}
                    </option>
                  ))}
                </select>
              </div>
              <button
                type="button"
                className="btn-primary"
                disabled={deck.length === 0}
                onClick={() => setPlaying(true)}
              >
                <Play size={16} />
                Réviser {deck.length} carte{deck.length > 1 ? 's' : ''}
              </button>
              <Link href="/flashcards" className="btn-soft">
                <Layers size={16} />
                Écrire et gérer mes cartes
              </Link>
            </div>
          </section>
        </div>
      ) : null}

      {tab === 'plan' ? <RevisionPlanner /> : null}

      {tab === 'progression' ? (
        <div className="space-y-3">
          <p className="text-[13px] text-muted">
            Progression calculée à partir de tes états de maîtrise : pas commencé 0 %, à apprendre
            25 %, à revoir 60 %, maîtrisé 100 %. Ce sont des repères personnels.
          </p>
          {(subjects ?? []).map((subject) => {
            const result = progress.get(subject.id);
            return (
              <div
                key={subject.id}
                className="flex flex-wrap items-center gap-3 rounded-2xl border border-line bg-surface px-4 py-3"
              >
                <Link href={`/matieres/${subject.id}`} className="min-w-0 flex-1">
                  <span className="truncate text-[14px] font-medium text-ink">{subject.name}</span>
                </Link>
                <span className="shrink-0 text-[12px] text-muted">
                  {result?.mastered ?? 0}/{result?.total ?? 0} chapitres
                </span>
                <div className="w-full sm:w-56">
                  <ProgressBar
                    value={result?.percent ?? 0}
                    color={subject.color}
                    label={`Progression ${subject.name}`}
                  />
                </div>
              </div>
            );
          })}
          <Link href="/focus" className="btn-soft mt-2">
            <Timer size={16} />
            Démarrer une session de focus
          </Link>
        </div>
      ) : null}

      <FlashcardPlayer
        cards={deck}
        open={playing}
        onClose={() => setPlaying(false)}
        title={deckSubject ? subjectMap.get(deckSubject)?.name ?? 'Flashcards' : 'Toutes les flashcards'}
      />
    </>
  );
}
