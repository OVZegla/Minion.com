'use client';

import { useEffect, useState } from 'react';
import { db } from '@/db/db';
import { syncRevisionEvent } from '@/db/repo';
import { Modal } from '@/components/ui/Modal';
import { useToast } from '@/components/ui/Toast';
import { DateField, SubjectSelect, TimeField } from '@/components/ui/inputs';
import { nowISO } from '@/lib/dates';
import type { RevisionSession, RevisionStatus } from '@/types';

const DURATIONS = [15, 25, 30, 45, 60, 90, 120];

const STATUS_LABEL: Record<RevisionStatus, string> = {
  planned: 'Prévue',
  done: 'Faite',
  postponed: 'Reportée',
  cancelled: 'Annulée',
};

/**
 * Modification d'une session de révision : intitulé, matière, date, heure,
 * durée, état et notes. Les prochaines sessions n'étaient jusqu'ici qu'une
 * liste à regarder.
 */
export function SessionEditor({
  session,
  open,
  onClose,
}: {
  session: RevisionSession | null;
  open: boolean;
  onClose: () => void;
}) {
  const { toast } = useToast();
  const [title, setTitle] = useState('');
  const [subjectId, setSubjectId] = useState<string | null>(null);
  const [date, setDate] = useState('');
  const [time, setTime] = useState<string | null>(null);
  const [duration, setDuration] = useState(45);
  const [status, setStatus] = useState<RevisionStatus>('planned');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (!session) return;
    setTitle(session.title);
    setSubjectId(session.subjectId);
    setDate(session.date);
    setTime(session.time ?? null);
    setDuration(session.durationMinutes);
    setStatus(session.status);
    setNotes(session.notes ?? '');
  }, [session]);

  if (!session) return null;

  const save = async () => {
    const updated: RevisionSession = {
      ...session,
      title: title.trim() || 'Session de révision',
      subjectId: subjectId ?? session.subjectId,
      date,
      time,
      durationMinutes: duration,
      status,
      notes: notes.trim() || undefined,
      updatedAt: nowISO(),
    };
    await db.revisionSessions.put(updated);
    // Le calendrier suit la session : il faut le remettre d'accord.
    await syncRevisionEvent(updated);
    toast('Session mise à jour');
    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Modifier la session"
      footer={
        <>
          <button
            type="button"
            className="btn-ghost"
            onClick={async () => {
              await db.revisionSessions.delete(session.id);
              const event = await db.events.where('revisionSessionId').equals(session.id).first();
              if (event) await db.events.delete(event.id);
              toast('Session supprimée');
              onClose();
            }}
          >
            Supprimer
          </button>
          <button type="button" className="btn-primary" onClick={save}>
            Enregistrer
          </button>
        </>
      }
    >
      <div className="space-y-4">
        <div>
          <label className="label" htmlFor="rs-title">
            Intitulé
          </label>
          <input
            id="rs-title"
            className="field"
            value={title}
            placeholder="Relire le chapitre 2"
            onChange={(event) => setTitle(event.target.value)}
          />
        </div>

        <SubjectSelect value={subjectId} onChange={setSubjectId} allowEmpty={false} />

        <div className="grid gap-3 sm:grid-cols-2">
          <DateField value={date} onChange={(next) => setDate(next ?? '')} label="Date" />
          <TimeField value={time} onChange={setTime} label="Heure (facultative)" />
        </div>

        <div>
          <span className="label">Durée</span>
          <div className="flex flex-wrap gap-2">
            {DURATIONS.map((minutes) => (
              <button
                key={minutes}
                type="button"
                aria-pressed={duration === minutes}
                onClick={() => setDuration(minutes)}
                className={
                  duration === minutes
                    ? 'chip border-[color:var(--primary-line)] bg-primary-soft text-accent'
                    : 'chip text-muted hover:bg-surface2'
                }
              >
                {minutes} min
              </button>
            ))}
          </div>
        </div>

        <div>
          <span className="label">État</span>
          <div className="flex flex-wrap gap-2">
            {(Object.keys(STATUS_LABEL) as RevisionStatus[]).map((key) => (
              <button
                key={key}
                type="button"
                aria-pressed={status === key}
                onClick={() => setStatus(key)}
                className={
                  status === key
                    ? 'chip border-[color:var(--primary-line)] bg-primary-soft text-accent'
                    : 'chip text-muted hover:bg-surface2'
                }
              >
                {STATUS_LABEL[key]}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="label" htmlFor="rs-notes">
            Notes
          </label>
          <textarea
            id="rs-notes"
            className="field min-h-[72px]"
            value={notes}
            placeholder="Ce que tu veux revoir en priorité"
            onChange={(event) => setNotes(event.target.value)}
          />
        </div>
      </div>
    </Modal>
  );
}
