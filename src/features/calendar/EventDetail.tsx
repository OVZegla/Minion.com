'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Modal } from '@/components/ui/Modal';
import { DateField, SubjectSelect, TimeField } from '@/components/ui/inputs';
import { useToast } from '@/components/ui/Toast';
import { deleteOccurrence, deleteSeries, detachOccurrence, updateSeries } from './mutations';
import { EVENT_TYPE_LABEL } from './helpers';
import { fmtDayFull } from '@/lib/dates';
import type { EventOccurrence, EventType } from '@/types';

type Scope = 'occurrence' | 'series';

export function EventDetail({
  occurrence,
  open,
  onClose,
}: {
  occurrence: EventOccurrence | null;
  open: boolean;
  onClose: () => void;
}) {
  const { toast, toastUndo } = useToast();
  const [scope, setScope] = useState<Scope>('occurrence');
  const [date, setDate] = useState<string | null>(null);
  const [startTime, setStartTime] = useState<string | null>(null);
  const [endTime, setEndTime] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [room, setRoom] = useState('');
  const [teacher, setTeacher] = useState('');
  const [notes, setNotes] = useState('');
  const [type, setType] = useState<EventType>('cours');
  const [subjectId, setSubjectId] = useState<string | null>(null);

  useEffect(() => {
    if (!occurrence || !open) return;
    const { event } = occurrence;
    setScope(event.recurrence ? 'occurrence' : 'series');
    setDate(occurrence.date);
    setStartTime(event.startTime);
    setEndTime(event.endTime);
    setTitle(event.title);
    setRoom(event.room ?? '');
    setTeacher(event.teacher ?? '');
    setNotes(event.notes ?? '');
    setType(event.type);
    setSubjectId(event.subjectId ?? null);
  }, [occurrence, open]);

  if (!occurrence) return null;
  const { event } = occurrence;
  const recurring = Boolean(event.recurrence);

  const save = async () => {
    const patch = {
      title: title.trim() || event.title,
      room: room.trim() || undefined,
      teacher: teacher.trim() || undefined,
      notes: notes.trim() || undefined,
      type,
      subjectId,
      startTime: startTime ?? event.startTime,
      endTime: endTime ?? event.endTime,
    };
    if (recurring && scope === 'occurrence') {
      await detachOccurrence(event, occurrence.date, { ...patch, date: date ?? occurrence.date });
      toast('Cette séance a été modifiée');
    } else {
      await updateSeries(event, { ...patch, date: date ?? event.date });
      toast(recurring ? 'Série mise à jour' : 'Événement mis à jour');
    }
    onClose();
  };

  const remove = async () => {
    const snapshot = { ...event };
    if (recurring && scope === 'occurrence') {
      await deleteOccurrence(event, occurrence.date);
      toastUndo('Séance supprimée', async () => {
        await updateSeries(snapshot, {});
      });
    } else {
      await deleteSeries(event.id);
      toastUndo('Événement supprimé', async () => {
        await updateSeries(snapshot, {});
      });
    }
    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={event.title || 'Événement'}
      description={fmtDayFull(occurrence.date)}
      footer={
        <>
          <button type="button" className="btn-danger mr-auto" onClick={remove}>
            Supprimer
          </button>
          <button type="button" className="btn-outline" onClick={onClose}>
            Annuler
          </button>
          <button type="button" className="btn-primary" onClick={save}>
            Enregistrer
          </button>
        </>
      }
    >
      <div className="space-y-4">
        {recurring ? (
          <div className="rounded-xl border border-line bg-surface2/60 p-3">
            <p className="mb-2 text-[13px] font-medium text-ink">
              Cet événement se répète chaque semaine.
            </p>
            <div className="flex flex-wrap gap-1.5">
              {(
                [
                  { value: 'occurrence' as const, label: 'Cette séance' },
                  { value: 'series' as const, label: 'Toute la série' },
                ]
              ).map((option) => (
                <button
                  key={option.value}
                  type="button"
                  aria-pressed={scope === option.value}
                  onClick={() => setScope(option.value)}
                  className={
                    scope === option.value
                      ? 'chip border-primary-line bg-primary-soft text-accent'
                      : 'chip text-muted hover:bg-surface'
                  }
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
        ) : null}

        <div>
          <label className="label" htmlFor="ed-title">
            Titre
          </label>
          <input
            id="ed-title"
            className="field"
            value={title}
            onChange={(evt) => setTitle(evt.target.value)}
          />
        </div>

        <SubjectSelect value={subjectId} onChange={setSubjectId} />

        <div className="grid grid-cols-3 gap-3">
          <DateField value={date} onChange={setDate} label="Date" withQuickChips={false} />
          <TimeField value={startTime} onChange={setStartTime} label="Début" />
          <TimeField value={endTime} onChange={setEndTime} label="Fin" />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label" htmlFor="ed-type">
              Type
            </label>
            <select
              id="ed-type"
              className="field"
              value={type}
              onChange={(evt) => setType(evt.target.value as EventType)}
            >
              {(Object.keys(EVENT_TYPE_LABEL) as EventType[]).map((key) => (
                <option key={key} value={key}>
                  {EVENT_TYPE_LABEL[key]}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label" htmlFor="ed-room">
              Salle
            </label>
            <input
              id="ed-room"
              className="field"
              value={room}
              onChange={(evt) => setRoom(evt.target.value)}
            />
          </div>
        </div>

        <div>
          <label className="label" htmlFor="ed-teacher">
            Enseignant
          </label>
          <input
            id="ed-teacher"
            className="field"
            value={teacher}
            onChange={(evt) => setTeacher(evt.target.value)}
          />
        </div>

        <div>
          <label className="label" htmlFor="ed-notes">
            Notes
          </label>
          <textarea
            id="ed-notes"
            className="field min-h-[70px]"
            value={notes}
            onChange={(evt) => setNotes(evt.target.value)}
          />
        </div>

        {event.courseId || event.examId ? (
          <div className="flex flex-wrap gap-2">
            {event.courseId ? (
              <Link href={`/cours/${event.courseId}`} className="btn-soft text-[13px]">
                Ouvrir le cours
              </Link>
            ) : null}
            {event.examId ? (
              <Link href="/examens" className="btn-soft text-[13px]">
                Ouvrir l’examen
              </Link>
            ) : null}
          </div>
        ) : null}
      </div>
    </Modal>
  );
}
