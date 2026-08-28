'use client';

import { useEffect, useState } from 'react';
import { db } from '@/db/db';
import { deleteExamCascade } from '@/db/repo';
import { Modal, ConfirmDialog } from '@/components/ui/Modal';
import { DateField, SubjectSelect, TimeField } from '@/components/ui/inputs';
import { useToast } from '@/components/ui/Toast';
import { useChapters } from '@/hooks/data';
import { nowISO } from '@/lib/dates';
import type { Exam, ExamKind } from '@/types';

const KINDS: { value: ExamKind; label: string }[] = [
  { value: 'partiel', label: 'Partiel' },
  { value: 'controle', label: 'Contrôle' },
  { value: 'oral', label: 'Oral' },
  { value: 'tp', label: 'TP' },
  { value: 'rattrapage', label: 'Rattrapage' },
  { value: 'autre', label: 'Autre' },
];

export function ExamDetail({
  exam,
  open,
  onClose,
}: {
  exam: Exam | null;
  open: boolean;
  onClose: () => void;
}) {
  const { toast } = useToast();
  const [subjectId, setSubjectId] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [date, setDate] = useState<string | null>(null);
  const [time, setTime] = useState<string | null>(null);
  const [room, setRoom] = useState('');
  const [kind, setKind] = useState<ExamKind>('partiel');
  const [coefficient, setCoefficient] = useState('');
  const [duration, setDuration] = useState('');
  const [notes, setNotes] = useState('');
  const [chapterIds, setChapterIds] = useState<string[]>([]);
  const [confirm, setConfirm] = useState(false);
  const chapters = useChapters(subjectId);

  useEffect(() => {
    if (!exam || !open) return;
    setSubjectId(exam.subjectId);
    setTitle(exam.title);
    setDate(exam.date);
    setTime(exam.time ?? null);
    setRoom(exam.room ?? '');
    setKind(exam.kind);
    setCoefficient(exam.coefficient ? String(exam.coefficient) : '');
    setDuration(exam.durationMinutes ? String(exam.durationMinutes) : '');
    setNotes(exam.notes ?? '');
    setChapterIds(exam.chapterIds);
  }, [exam, open]);

  if (!exam) return null;

  return (
    <>
      <Modal
        open={open}
        onClose={onClose}
        title="Modifier l’examen"
        footer={
          <>
            <button type="button" className="btn-danger mr-auto" onClick={() => setConfirm(true)}>
              Supprimer
            </button>
            <button type="button" className="btn-outline" onClick={onClose}>
              Annuler
            </button>
            <button
              type="button"
              className="btn-primary"
              onClick={async () => {
                await db.exams.update(exam.id, {
                  subjectId: subjectId ?? exam.subjectId,
                  title: title.trim() || exam.title,
                  date: date ?? exam.date,
                  time,
                  room: room.trim() || undefined,
                  kind,
                  coefficient: coefficient ? Number(coefficient) : null,
                  durationMinutes: duration ? Number(duration) : null,
                  notes: notes.trim() || undefined,
                  chapterIds,
                  updatedAt: nowISO(),
                });
                // Garde l'événement du calendrier aligné sur l'examen.
                const linked = await db.events.where('examId').equals(exam.id).toArray();
                for (const event of linked) {
                  await db.events.update(event.id, {
                    date: date ?? exam.date,
                    startTime: time ?? event.startTime,
                    title: title.trim() || exam.title,
                    room: room.trim() || undefined,
                    subjectId: subjectId ?? exam.subjectId,
                    updatedAt: nowISO(),
                  });
                }
                toast('Examen mis à jour');
                onClose();
              }}
            >
              Enregistrer
            </button>
          </>
        }
      >
        <div className="space-y-4">
          <div>
            <label className="label" htmlFor="ex-title">
              Intitulé
            </label>
            <input
              id="ex-title"
              className="field"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
            />
          </div>
          <SubjectSelect value={subjectId} onChange={setSubjectId} allowEmpty={false} />
          <div className="grid grid-cols-2 gap-3">
            <DateField value={date} onChange={setDate} label="Date" withQuickChips={false} />
            <TimeField value={time} onChange={setTime} />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="label" htmlFor="ex-room">
                Salle
              </label>
              <input
                id="ex-room"
                className="field"
                value={room}
                onChange={(event) => setRoom(event.target.value)}
              />
            </div>
            <div>
              <label className="label" htmlFor="ex-kind">
                Type
              </label>
              <select
                id="ex-kind"
                className="field"
                value={kind}
                onChange={(event) => setKind(event.target.value as ExamKind)}
              >
                {KINDS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="label" htmlFor="ex-coef">
                Coefficient
              </label>
              <input
                id="ex-coef"
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
            <label className="label" htmlFor="ex-duration">
              Durée (minutes)
            </label>
            <input
              id="ex-duration"
              type="number"
              min={0}
              step={15}
              className="field max-w-[160px]"
              value={duration}
              onChange={(event) => setDuration(event.target.value)}
            />
          </div>
          <fieldset>
            <legend className="label">Chapitres concernés</legend>
            {(chapters ?? []).length === 0 ? (
              <p className="text-sm text-muted">Cette matière n’a pas encore de chapitres.</p>
            ) : (
              <div className="space-y-1.5 rounded-xl border border-line p-3">
                {(chapters ?? []).map((chapter) => (
                  <label key={chapter.id} className="flex items-center gap-2 text-sm text-ink">
                    <input
                      type="checkbox"
                      className="h-4 w-4 accent-[color:var(--primary)]"
                      checked={chapterIds.includes(chapter.id)}
                      onChange={(event) =>
                        setChapterIds((current) =>
                          event.target.checked
                            ? [...current, chapter.id]
                            : current.filter((id) => id !== chapter.id),
                        )
                      }
                    />
                    {chapter.title}
                  </label>
                ))}
              </div>
            )}
          </fieldset>
          <div>
            <label className="label" htmlFor="ex-notes">
              Notes
            </label>
            <textarea
              id="ex-notes"
              className="field min-h-[70px]"
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
            />
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        open={confirm}
        onClose={() => setConfirm(false)}
        title="Supprimer cet examen ?"
        message="Les sessions de révision et les tâches liées seront conservées mais détachées."
        onConfirm={async () => {
          await deleteExamCascade(exam.id);
          toast('Examen supprimé');
          onClose();
        }}
      />
    </>
  );
}
