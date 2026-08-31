'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { db } from '@/db/db';
import {
  createCourse,
  createExam,
  createRevisionSession,
  createStudySheet,
  createSubject,
  createTask,
} from '@/db/repo';
import { newId } from '@/lib/id';
import { nowISO, todayISO } from '@/lib/dates';
import { parseQuickInput } from '@/lib/quick-parse';
import { useChapters, useCourses, useSubjects } from '@/hooks/data';
import { useToast } from '@/components/ui/Toast';
import { DateField, PrioritySelect, SubjectSelect, TimeField, ColorPicker } from '@/components/ui/inputs';
import { ALLOWED_MIME } from '@/db/backup';
import { fileDocument } from '@/features/documents/filing';
import { isDesktop } from '@/lib/desktop';
import type { CourseKind, DocKind, EventType, Priority, SubjectColorKey, TaskType } from '@/types';

export interface FormProps {
  onDone: () => void;
}

function MoreOptions({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="btn-ghost -ml-2 text-[13px]"
        aria-expanded={open}
      >
        {open ? 'Moins d’options' : 'Plus d’options'}
      </button>
      {open ? <div className="mt-3 space-y-4">{children}</div> : null}
    </div>
  );
}

function Actions({ label = 'Ajouter', onDone }: { label?: string; onDone: () => void }) {
  return (
    <div className="flex justify-end gap-2 pt-1">
      <button type="button" className="btn-outline" onClick={onDone}>
        Annuler
      </button>
      <button type="submit" className="btn-primary">
        {label}
      </button>
    </div>
  );
}

/* ------------------------------- Tache ------------------------------- */

const TASK_TYPES: { value: TaskType; label: string }[] = [
  { value: 'devoir', label: 'Devoir' },
  { value: 'td', label: 'TD' },
  { value: 'lecture', label: 'Lecture' },
  { value: 'fiche', label: 'Fiche' },
  { value: 'revision', label: 'Révision' },
  { value: 'projet', label: 'Projet' },
  { value: 'admin', label: 'Administratif' },
  { value: 'perso', label: 'Personnel' },
];

export function TaskForm({ onDone }: FormProps) {
  const subjects = useSubjects();
  const { toast } = useToast();
  const [title, setTitle] = useState('');
  const [subjectId, setSubjectId] = useState<string | null>(null);
  const [dueDate, setDueDate] = useState<string | null>(null);
  const [dueTime, setDueTime] = useState<string | null>(null);
  const [priority, setPriority] = useState<Priority>('normal');
  const [type, setType] = useState<TaskType>('devoir');
  const [description, setDescription] = useState('');
  const [estimated, setEstimated] = useState('');
  const [touchedSubject, setTouchedSubject] = useState(false);
  const [touchedDate, setTouchedDate] = useState(false);

  // Analyse locale de la saisie : « Faire fiche droit constitutionnel vendredi »
  const parsed = useMemo(
    () => parseQuickInput(title, subjects ?? []),
    [title, subjects],
  );
  const suggestion =
    (!touchedDate && parsed.matchedDateLabel) || (!touchedSubject && parsed.matchedSubjectName)
      ? parsed
      : null;

  const applySuggestion = () => {
    if (parsed.title) setTitle(parsed.title);
    if (parsed.date) {
      setDueDate(parsed.date);
      setTouchedDate(true);
    }
    if (parsed.time) setDueTime(parsed.time);
    if (parsed.subjectId) {
      setSubjectId(parsed.subjectId);
      setTouchedSubject(true);
    }
  };

  return (
    <form
      className="space-y-4"
      onSubmit={async (event) => {
        event.preventDefault();
        if (!title.trim()) return;
        await createTask({
          title: title.trim(),
          description: description.trim() || undefined,
          subjectId,
          dueDate,
          dueTime,
          priority,
          type,
          estimatedMinutes: estimated ? Number(estimated) : null,
        });
        toast('Tâche ajoutée');
        onDone();
      }}
    >
      <div>
        <label className="label" htmlFor="qa-task-title">
          Que dois-tu faire ?
        </label>
        <input
          id="qa-task-title"
          className="field"
          autoComplete="off"
          placeholder="Ex. Fiche d’arrêt pour vendredi"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          required
        />
      </div>

      {suggestion ? (
        <button
          type="button"
          onClick={applySuggestion}
          className="w-full rounded-xl border border-[color:var(--primary-line)] bg-primary-soft px-3 py-2 text-left text-[13px] text-accent transition hover:brightness-[.98]"
        >
          <span className="font-semibold">Appliquer :</span>{' '}
          {suggestion.matchedDateLabel ? <>date « {suggestion.matchedDateLabel} »</> : null}
          {suggestion.matchedDateLabel && suggestion.matchedSubjectName ? ' · ' : ''}
          {suggestion.matchedSubjectName ? <>matière « {suggestion.matchedSubjectName} »</> : null}
        </button>
      ) : null}

      <SubjectSelect
        value={subjectId}
        onChange={(value) => {
          setSubjectId(value);
          setTouchedSubject(true);
        }}
      />
      <DateField
        value={dueDate}
        onChange={(value) => {
          setDueDate(value);
          setTouchedDate(true);
        }}
      />

      <MoreOptions>
        <TimeField value={dueTime} onChange={setDueTime} label="Heure limite" />
        <PrioritySelect value={priority} onChange={setPriority} />
        <div>
          <label className="label" htmlFor="qa-task-type">
            Type
          </label>
          <select
            id="qa-task-type"
            className="field"
            value={type}
            onChange={(event) => setType(event.target.value as TaskType)}
          >
            {TASK_TYPES.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label" htmlFor="qa-task-est">
            Temps estimé (minutes)
          </label>
          <input
            id="qa-task-est"
            type="number"
            min={0}
            step={5}
            className="field"
            value={estimated}
            onChange={(event) => setEstimated(event.target.value)}
          />
        </div>
        <div>
          <label className="label" htmlFor="qa-task-desc">
            Description
          </label>
          <textarea
            id="qa-task-desc"
            className="field min-h-[80px]"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
          />
        </div>
      </MoreOptions>

      <Actions onDone={onDone} />
    </form>
  );
}

/* -------------------------------- Cours ------------------------------ */

export function CourseForm({ onDone }: FormProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [title, setTitle] = useState('');
  const [subjectId, setSubjectId] = useState<string | null>(null);
  const [chapterId, setChapterId] = useState<string | null>(null);
  const [date, setDate] = useState<string | null>(todayISO());
  const [kind, setKind] = useState<CourseKind>('CM');
  const chapters = useChapters(subjectId);

  return (
    <form
      className="space-y-4"
      onSubmit={async (event) => {
        event.preventDefault();
        if (!title.trim() || !subjectId) return;
        const id = await createCourse({
          subjectId,
          title: title.trim(),
          chapterId,
          date: date ?? undefined,
          kind,
        });
        toast('Cours créé');
        onDone();
        router.push(`/cours/${id}`);
      }}
    >
      <div>
        <label className="label" htmlFor="qa-course-title">
          Titre du cours
        </label>
        <input
          id="qa-course-title"
          className="field"
          placeholder="Ex. La hiérarchie des normes"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          required
        />
      </div>
      <SubjectSelect value={subjectId} onChange={setSubjectId} allowEmpty={false} required />
      <DateField value={date} onChange={setDate} label="Date du cours" withQuickChips={false} />
      <MoreOptions>
        <div>
          <span className="label">Type</span>
          <div className="flex gap-1.5">
            {(['CM', 'TD', 'TP', 'AUTRE'] as CourseKind[]).map((option) => (
              <button
                key={option}
                type="button"
                aria-pressed={kind === option}
                onClick={() => setKind(option)}
                className={
                  kind === option
                    ? 'chip border-[color:var(--primary-line)] bg-primary-soft text-accent'
                    : 'chip text-muted hover:bg-surface2'
                }
              >
                {option}
              </button>
            ))}
          </div>
        </div>
        {(chapters ?? []).length > 0 ? (
          <div>
            <label className="label" htmlFor="qa-course-chapter">
              Chapitre
            </label>
            <select
              id="qa-course-chapter"
              className="field"
              value={chapterId ?? ''}
              onChange={(event) => setChapterId(event.target.value || null)}
            >
              <option value="">Aucun chapitre</option>
              {(chapters ?? []).map((chapter) => (
                <option key={chapter.id} value={chapter.id}>
                  {chapter.title}
                </option>
              ))}
            </select>
          </div>
        ) : null}
      </MoreOptions>
      <Actions label="Créer le cours" onDone={onDone} />
    </form>
  );
}

/* ------------------------------ Evenement ---------------------------- */

const EVENT_TYPES: { value: EventType; label: string }[] = [
  { value: 'cm', label: 'CM' },
  { value: 'td', label: 'TD' },
  { value: 'tp', label: 'TP' },
  { value: 'cours', label: 'Cours' },
  { value: 'examen', label: 'Examen' },
  { value: 'devoir', label: 'Devoir' },
  { value: 'revision', label: 'Révision' },
  { value: 'sae', label: 'SAÉ' },
  { value: 'rdv', label: 'Rendez-vous' },
  { value: 'perso', label: 'Personnel' },
];

const WEEKDAYS = [
  { value: 1, label: 'L' },
  { value: 2, label: 'M' },
  { value: 3, label: 'Me' },
  { value: 4, label: 'J' },
  { value: 5, label: 'V' },
  { value: 6, label: 'S' },
  { value: 0, label: 'D' },
];

export function EventForm({ onDone, defaultDate }: FormProps & { defaultDate?: string }) {
  const { toast } = useToast();
  const [title, setTitle] = useState('');
  const [subjectId, setSubjectId] = useState<string | null>(null);
  const [type, setType] = useState<EventType>('cours');
  const [date, setDate] = useState<string | null>(defaultDate ?? todayISO());
  const [startTime, setStartTime] = useState<string | null>('09:00');
  const [endTime, setEndTime] = useState<string | null>('10:30');
  const [allDay, setAllDay] = useState(false);
  const [room, setRoom] = useState('');
  const [notes, setNotes] = useState('');
  const [repeat, setRepeat] = useState(false);
  const [weekdays, setWeekdays] = useState<number[]>([]);
  const [until, setUntil] = useState<string | null>(null);
  const subjects = useSubjects();

  return (
    <form
      className="space-y-4"
      onSubmit={async (event) => {
        event.preventDefault();
        if (!date) return;
        const subject = (subjects ?? []).find((item) => item.id === subjectId);
        const finalTitle = title.trim() || subject?.name || 'Événement';
        const day = new Date(date).getDay();
        await db.events.put({
          id: newId('evt'),
          title: finalTitle,
          type,
          subjectId,
          courseId: null,
          examId: null,
          taskId: null,
          saeId: null,
          revisionSessionId: null,
          date,
          startTime: allDay ? '00:00' : startTime ?? '09:00',
          endTime: allDay ? '23:59' : endTime ?? '10:00',
          allDay,
          room: room.trim() || undefined,
          notes: notes.trim() || undefined,
          recurrence: repeat
            ? {
                freq: 'weekly',
                interval: 1,
                byWeekday: weekdays.length ? weekdays : [day],
                until,
                exceptions: [],
              }
            : null,
          createdAt: nowISO(),
          updatedAt: nowISO(),
        });
        toast('Événement ajouté');
        onDone();
      }}
    >
      <div>
        <label className="label" htmlFor="qa-event-title">
          Titre
        </label>
        <input
          id="qa-event-title"
          className="field"
          placeholder="Laisse vide pour utiliser le nom de la matière"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
        />
      </div>
      <SubjectSelect value={subjectId} onChange={setSubjectId} />
      <DateField value={date} onChange={setDate} label="Date" withQuickChips={false} required />
      <label className="flex items-center gap-2 text-sm text-ink">
        <input
          type="checkbox"
          className="h-4 w-4 accent-[color:var(--primary)]"
          checked={allDay}
          onChange={(event) => setAllDay(event.target.checked)}
        />
        Toute la journée
      </label>
      {!allDay ? (
        <div className="grid grid-cols-2 gap-3">
          <TimeField value={startTime} onChange={setStartTime} label="Début" />
          <TimeField value={endTime} onChange={setEndTime} label="Fin" />
        </div>
      ) : null}

      <MoreOptions>
        <div>
          <label className="label" htmlFor="qa-event-type">
            Type d’événement
          </label>
          <select
            id="qa-event-type"
            className="field"
            value={type}
            onChange={(event) => setType(event.target.value as EventType)}
          >
            {EVENT_TYPES.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label" htmlFor="qa-event-room">
            Salle
          </label>
          <input
            id="qa-event-room"
            className="field"
            value={room}
            onChange={(event) => setRoom(event.target.value)}
          />
        </div>
        <div>
          <label className="label" htmlFor="qa-event-notes">
            Notes
          </label>
          <textarea
            id="qa-event-notes"
            className="field min-h-[70px]"
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
          />
        </div>
        <div className="rounded-xl border border-line p-3">
          <label className="flex items-center gap-2 text-sm font-medium text-ink">
            <input
              type="checkbox"
              className="h-4 w-4 accent-[color:var(--primary)]"
              checked={repeat}
              onChange={(event) => setRepeat(event.target.checked)}
            />
            Répéter chaque semaine
          </label>
          {repeat ? (
            <div className="mt-3 space-y-3">
              <div>
                <span className="label">Jours</span>
                <div className="flex flex-wrap gap-1.5">
                  {WEEKDAYS.map((day) => (
                    <button
                      key={day.value}
                      type="button"
                      aria-pressed={weekdays.includes(day.value)}
                      onClick={() =>
                        setWeekdays((current) =>
                          current.includes(day.value)
                            ? current.filter((value) => value !== day.value)
                            : [...current, day.value],
                        )
                      }
                      className={
                        weekdays.includes(day.value)
                          ? 'chip border-[color:var(--primary-line)] bg-primary-soft text-accent'
                          : 'chip text-muted hover:bg-surface2'
                      }
                    >
                      {day.label}
                    </button>
                  ))}
                </div>
                <p className="mt-1 text-xs text-muted">
                  Sans sélection, le jour de la date choisie est utilisé.
                </p>
              </div>
              <DateField value={until} onChange={setUntil} label="Jusqu’au" withQuickChips={false} />
            </div>
          ) : null}
        </div>
      </MoreOptions>
      <Actions onDone={onDone} />
    </form>
  );
}

/* ------------------------------- Examen ------------------------------ */

export function ExamForm({ onDone }: FormProps) {
  const { toast } = useToast();
  const [title, setTitle] = useState('');
  const [subjectId, setSubjectId] = useState<string | null>(null);
  const [date, setDate] = useState<string | null>(null);
  const [time, setTime] = useState<string | null>('09:00');
  const [room, setRoom] = useState('');
  const [kind, setKind] = useState('partiel');
  const [coefficient, setCoefficient] = useState('');
  const [chapterIds, setChapterIds] = useState<string[]>([]);
  const chapters = useChapters(subjectId);

  return (
    <form
      className="space-y-4"
      onSubmit={async (event) => {
        event.preventDefault();
        if (!subjectId || !date) return;
        const id = await createExam({
          subjectId,
          title: title.trim() || 'Examen',
          date,
          time,
          room: room.trim() || undefined,
          kind: kind as never,
          coefficient: coefficient ? Number(coefficient) : null,
          chapterIds,
        });
        await db.events.put({
          id: newId('evt'),
          title: title.trim() || 'Examen',
          type: 'examen',
          subjectId,
          courseId: null,
          examId: id,
          taskId: null,
          saeId: null,
          revisionSessionId: null,
          date,
          startTime: time ?? '09:00',
          endTime: time ?? '11:00',
          allDay: false,
          room: room.trim() || undefined,
          recurrence: null,
          createdAt: nowISO(),
          updatedAt: nowISO(),
        });
        toast('Examen ajouté');
        onDone();
      }}
    >
      <div>
        <label className="label" htmlFor="qa-exam-title">
          Intitulé
        </label>
        <input
          id="qa-exam-title"
          className="field"
          placeholder="Ex. Partiel S1"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          required
        />
      </div>
      <SubjectSelect value={subjectId} onChange={setSubjectId} allowEmpty={false} required />
      <div className="grid grid-cols-2 gap-3">
        <DateField value={date} onChange={setDate} label="Date" withQuickChips={false} required />
        <TimeField value={time} onChange={setTime} />
      </div>

      <MoreOptions>
        <div>
          <label className="label" htmlFor="qa-exam-room">
            Salle
          </label>
          <input
            id="qa-exam-room"
            className="field"
            value={room}
            onChange={(event) => setRoom(event.target.value)}
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label" htmlFor="qa-exam-kind">
              Type
            </label>
            <select
              id="qa-exam-kind"
              className="field"
              value={kind}
              onChange={(event) => setKind(event.target.value)}
            >
              <option value="partiel">Partiel</option>
              <option value="controle">Contrôle</option>
              <option value="oral">Oral</option>
              <option value="tp">TP</option>
              <option value="rattrapage">Rattrapage</option>
              <option value="autre">Autre</option>
            </select>
          </div>
          <div>
            <label className="label" htmlFor="qa-exam-coef">
              Coefficient
            </label>
            <input
              id="qa-exam-coef"
              type="number"
              min={0}
              step={0.5}
              className="field"
              value={coefficient}
              onChange={(event) => setCoefficient(event.target.value)}
            />
          </div>
        </div>
        {(chapters ?? []).length > 0 ? (
          <fieldset>
            <legend className="label">Chapitres concernés</legend>
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
          </fieldset>
        ) : null}
      </MoreOptions>
      <Actions onDone={onDone} />
    </form>
  );
}

/* ---------------------------- Note rapide ---------------------------- */

export function InboxForm({ onDone }: FormProps) {
  const { toast } = useToast();
  const [text, setText] = useState('');
  return (
    <form
      className="space-y-4"
      onSubmit={async (event) => {
        event.preventDefault();
        if (!text.trim()) return;
        await db.inbox.put({
          id: newId('inb'),
          text: text.trim(),
          status: 'pending',
          createdAt: nowISO(),
        });
        toast('Note ajoutée à « À classer »');
        onDone();
      }}
    >
      <div>
        <label className="label" htmlFor="qa-note">
          Note rapide
        </label>
        <textarea
          id="qa-note"
          className="field min-h-[110px]"
          autoFocus
          placeholder="Ex. Contrôle droit constitutionnel le 8 octobre"
          value={text}
          onChange={(event) => setText(event.target.value)}
          required
        />
        <p className="mt-1.5 text-xs text-muted">
          Tu pourras la transformer en tâche, examen, cours… plus tard.
        </p>
      </div>
      <Actions label="Noter" onDone={onDone} />
    </form>
  );
}

/* ------------------------------- Fiche ------------------------------- */

export function SheetForm({ onDone }: FormProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [title, setTitle] = useState('');
  const [subjectId, setSubjectId] = useState<string | null>(null);
  const [chapterId, setChapterId] = useState<string | null>(null);
  const chapters = useChapters(subjectId);

  return (
    <form
      className="space-y-4"
      onSubmit={async (event) => {
        event.preventDefault();
        if (!title.trim() || !subjectId) return;
        const id = await createStudySheet({ subjectId, title: title.trim(), chapterId });
        toast('Fiche créée');
        onDone();
        router.push(`/fiches/${id}`);
      }}
    >
      <div>
        <label className="label" htmlFor="qa-sheet-title">
          Titre de la fiche
        </label>
        <input
          id="qa-sheet-title"
          className="field"
          placeholder="Ex. Les sources du droit"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          required
        />
      </div>
      <SubjectSelect value={subjectId} onChange={setSubjectId} allowEmpty={false} required />
      {(chapters ?? []).length > 0 ? (
        <div>
          <label className="label" htmlFor="qa-sheet-chapter">
            Chapitre
          </label>
          <select
            id="qa-sheet-chapter"
            className="field"
            value={chapterId ?? ''}
            onChange={(event) => setChapterId(event.target.value || null)}
          >
            <option value="">Aucun chapitre</option>
            {(chapters ?? []).map((chapter) => (
              <option key={chapter.id} value={chapter.id}>
                {chapter.title}
              </option>
            ))}
          </select>
        </div>
      ) : null}
      <Actions label="Créer la fiche" onDone={onDone} />
    </form>
  );
}

/* ----------------------------- Revision ------------------------------ */

export function RevisionForm({ onDone }: FormProps) {
  const { toast } = useToast();
  const [subjectId, setSubjectId] = useState<string | null>(null);
  const [chapterId, setChapterId] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [date, setDate] = useState<string | null>(todayISO());
  const [time, setTime] = useState<string | null>('18:00');
  const [duration, setDuration] = useState('45');
  const chapters = useChapters(subjectId);

  return (
    <form
      className="space-y-4"
      onSubmit={async (event) => {
        event.preventDefault();
        if (!subjectId || !date) return;
        const chapter = (chapters ?? []).find((item) => item.id === chapterId);
        await createRevisionSession({
          subjectId,
          chapterId,
          title: title.trim() || chapter?.title || 'Session de révision',
          date,
          time,
          durationMinutes: Number(duration) || 45,
        });
        toast('Session planifiée');
        onDone();
      }}
    >
      <SubjectSelect value={subjectId} onChange={setSubjectId} allowEmpty={false} required />
      {(chapters ?? []).length > 0 ? (
        <div>
          <label className="label" htmlFor="qa-rev-chapter">
            Chapitre
          </label>
          <select
            id="qa-rev-chapter"
            className="field"
            value={chapterId ?? ''}
            onChange={(event) => setChapterId(event.target.value || null)}
          >
            <option value="">Choisir…</option>
            {(chapters ?? []).map((chapter) => (
              <option key={chapter.id} value={chapter.id}>
                {chapter.title}
              </option>
            ))}
          </select>
        </div>
      ) : null}
      <div>
        <label className="label" htmlFor="qa-rev-title">
          Intitulé (facultatif)
        </label>
        <input
          id="qa-rev-title"
          className="field"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          placeholder="Reprend le chapitre par défaut"
        />
      </div>
      <div className="grid grid-cols-3 gap-3">
        <div className="col-span-1">
          <DateField value={date} onChange={setDate} label="Date" withQuickChips={false} required />
        </div>
        <TimeField value={time} onChange={setTime} />
        <div>
          <label className="label" htmlFor="qa-rev-duration">
            Durée (min)
          </label>
          <input
            id="qa-rev-duration"
            type="number"
            min={5}
            step={5}
            className="field"
            value={duration}
            onChange={(event) => setDuration(event.target.value)}
          />
        </div>
      </div>
      <Actions label="Planifier" onDone={onDone} />
    </form>
  );
}

/* ------------------------------ Matiere ------------------------------ */

export function SubjectForm({ onDone }: FormProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [name, setName] = useState('');
  const [shortName, setShortName] = useState('');
  const [color, setColor] = useState<SubjectColorKey>('violet');
  const [teacher, setTeacher] = useState('');
  const [room, setRoom] = useState('');
  const [description, setDescription] = useState('');

  return (
    <form
      className="space-y-4"
      onSubmit={async (event) => {
        event.preventDefault();
        if (!name.trim()) return;
        const id = await createSubject({
          name: name.trim(),
          shortName: shortName.trim(),
          color,
          teacher: teacher.trim() || undefined,
          room: room.trim() || undefined,
          description: description.trim() || undefined,
        });
        toast('Matière créée');
        onDone();
        router.push(`/matieres/${id}`);
      }}
    >
      <div>
        <label className="label" htmlFor="qa-subject-name">
          Nom de la matière
        </label>
        <input
          id="qa-subject-name"
          className="field"
          placeholder="Ex. Droit administratif"
          value={name}
          onChange={(event) => setName(event.target.value)}
          required
        />
      </div>
      <ColorPicker value={color} onChange={setColor} />
      <MoreOptions>
        <div>
          <label className="label" htmlFor="qa-subject-short">
            Nom court
          </label>
          <input
            id="qa-subject-short"
            className="field"
            value={shortName}
            onChange={(event) => setShortName(event.target.value)}
            placeholder="Calculé automatiquement si vide"
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label" htmlFor="qa-subject-teacher">
              Enseignant
            </label>
            <input
              id="qa-subject-teacher"
              className="field"
              value={teacher}
              onChange={(event) => setTeacher(event.target.value)}
            />
          </div>
          <div>
            <label className="label" htmlFor="qa-subject-room">
              Salle habituelle
            </label>
            <input
              id="qa-subject-room"
              className="field"
              value={room}
              onChange={(event) => setRoom(event.target.value)}
            />
          </div>
        </div>
        <div>
          <label className="label" htmlFor="qa-subject-desc">
            Description
          </label>
          <textarea
            id="qa-subject-desc"
            className="field min-h-[70px]"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
          />
        </div>
      </MoreOptions>
      <Actions label="Créer la matière" onDone={onDone} />
    </form>
  );
}

/* ----------------------------- Document ------------------------------ */

export function detectKind(file: File): DocKind {
  const type = file.type;
  if (type === 'application/pdf') return 'pdf';
  if (type.startsWith('image/')) return 'image';
  if (type.includes('word')) return 'word';
  if (type.includes('presentation') || type.includes('powerpoint')) return 'ppt';
  return 'autre';
}

export function DocumentForm({ onDone }: FormProps) {
  const { toast } = useToast();
  const [subjectId, setSubjectId] = useState<string | null>(null);
  const [courseId, setCourseId] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [linkUrl, setLinkUrl] = useState('');
  const [linkName, setLinkName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<'file' | 'link'>('file');

  return (
    <form
      className="space-y-4"
      onSubmit={async (event) => {
        event.preventDefault();
        setError(null);
        if (tab === 'file') {
          if (!file) return;
          if (!ALLOWED_MIME.includes(file.type)) {
            setError('Ce format de fichier n’est pas autorisé.');
            return;
          }
          if (file.size > 15 * 1024 * 1024) {
            setError('Le fichier dépasse 15 Mo.');
            return;
          }
          const id = newId('doc');
          await db.documents.put({
            id,
            name: file.name,
            kind: detectKind(file),
            size: file.size,
            mimeType: file.type,
            blob: file,
            storageRef: null,
            localPath: null,
            subjectId,
            courseId,
            favorite: false,
            createdAt: nowISO(),
          });
          // Classement automatique dans les dossiers de l'ordinateur.
          const filed = await fileDocument(id);
          toast(filed?.path ? `Document rangé dans ${filed.folder}` : 'Document ajouté');
          onDone();
          return;
        } else {
          let url: URL;
          try {
            url = new URL(linkUrl);
          } catch {
            setError('Adresse invalide.');
            return;
          }
          if (url.protocol !== 'https:' && url.protocol !== 'http:') {
            setError('Seuls les liens http(s) sont acceptés.');
            return;
          }
          await db.documents.put({
            id: newId('doc'),
            name: linkName.trim() || url.hostname,
            kind: 'link',
            size: 0,
            url: url.toString(),
            storageRef: null,
            localPath: null,
            subjectId,
            courseId: null,
            favorite: false,
            createdAt: nowISO(),
          });
        }
        toast('Document ajouté');
        onDone();
      }}
    >
      <div className="flex gap-1.5">
        <button
          type="button"
          onClick={() => setTab('file')}
          className={tab === 'file' ? 'chip border-[color:var(--primary-line)] bg-primary-soft text-accent' : 'chip text-muted'}
        >
          Fichier
        </button>
        <button
          type="button"
          onClick={() => setTab('link')}
          className={tab === 'link' ? 'chip border-[color:var(--primary-line)] bg-primary-soft text-accent' : 'chip text-muted'}
        >
          Lien
        </button>
      </div>

      {tab === 'file' ? (
        <div>
          <label className="label" htmlFor="qa-doc-file">
            Choisir un fichier
          </label>
          <input
            id="qa-doc-file"
            type="file"
            className="field"
            accept={ALLOWED_MIME.join(',')}
            onChange={(event) => setFile(event.target.files?.[0] ?? null)}
          />
          <p className="mt-1 text-xs text-muted">PDF, image, Word, PowerPoint, Excel — 15 Mo max.</p>
        </div>
      ) : (
        <>
          <div>
            <label className="label" htmlFor="qa-doc-url">
              Adresse
            </label>
            <input
              id="qa-doc-url"
              className="field"
              placeholder="https://…"
              value={linkUrl}
              onChange={(event) => setLinkUrl(event.target.value)}
            />
          </div>
          <div>
            <label className="label" htmlFor="qa-doc-name">
              Nom
            </label>
            <input
              id="qa-doc-name"
              className="field"
              value={linkName}
              onChange={(event) => setLinkName(event.target.value)}
            />
          </div>
        </>
      )}

      <SubjectSelect
        value={subjectId}
        onChange={(value) => {
          setSubjectId(value);
          setCourseId(null);
        }}
      />
      {tab === 'file' ? <DocumentCourseSelect subjectId={subjectId} value={courseId} onChange={setCourseId} /> : null}
      {tab === 'file' && isDesktop() ? (
        <p className="rounded-xl bg-surface2 px-3 py-2 text-xs text-muted">
          Le fichier sera rangé automatiquement dans tes dossiers, par matière et
          par chapitre.
        </p>
      ) : null}
      {error ? <p className="text-sm text-[color:var(--danger)]">{error}</p> : null}
      <Actions onDone={onDone} />
    </form>
  );
}

/** Choix du cours : c'est lui qui donne le chapitre pour le classement. */
function DocumentCourseSelect({
  subjectId,
  value,
  onChange,
}: {
  subjectId: string | null;
  value: string | null;
  onChange: (value: string | null) => void;
}) {
  const courses = useCourses(subjectId);
  if (!subjectId || (courses ?? []).length === 0) return null;
  return (
    <div>
      <label className="label" htmlFor="qa-doc-course">
        Cours (facultatif)
      </label>
      <select
        id="qa-doc-course"
        className="field"
        value={value ?? ''}
        onChange={(event) => onChange(event.target.value || null)}
      >
        <option value="">Aucun cours</option>
        {(courses ?? []).map((course) => (
          <option key={course.id} value={course.id}>
            {String(course.number).padStart(2, '0')} — {course.title}
          </option>
        ))}
      </select>
    </div>
  );
}

/* ---------------------------- Jurisprudence -------------------------- */

export function CaseLawForm({ onDone }: FormProps) {
  const { toast } = useToast();
  const [court, setCourt] = useState('');
  const [chamber, setChamber] = useState('');
  const [dateLabel, setDateLabel] = useState('');
  const [number, setNumber] = useState('');
  const [theme, setTheme] = useState('');
  const [subjectId, setSubjectId] = useState<string | null>(null);

  return (
    <form
      className="space-y-4"
      onSubmit={async (event) => {
        event.preventDefault();
        if (!court.trim()) return;
        await db.caseLaws.put({
          id: newId('cas'),
          court: court.trim(),
          chamber: chamber.trim() || undefined,
          date: null,
          dateLabel: dateLabel.trim() || undefined,
          number: number.trim() || undefined,
          subjectId,
          courseId: null,
          theme: theme.trim() || undefined,
          facts: '',
          principle: '',
          solution: '',
          scope: '',
          tags: [],
          favorite: false,
          createdAt: nowISO(),
          updatedAt: nowISO(),
        });
        toast('Décision ajoutée à ta bibliothèque');
        onDone();
      }}
    >
      <p className="rounded-xl bg-surface2 px-3 py-2 text-xs text-muted">
        Bibliothèque personnelle : seules les décisions que tu saisis toi-même y figurent.
      </p>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label" htmlFor="qa-case-court">
            Juridiction
          </label>
          <input
            id="qa-case-court"
            className="field"
            value={court}
            onChange={(event) => setCourt(event.target.value)}
            required
          />
        </div>
        <div>
          <label className="label" htmlFor="qa-case-chamber">
            Chambre / formation
          </label>
          <input
            id="qa-case-chamber"
            className="field"
            value={chamber}
            onChange={(event) => setChamber(event.target.value)}
          />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label" htmlFor="qa-case-date">
            Date
          </label>
          <input
            id="qa-case-date"
            className="field"
            placeholder="Ex. 17 novembre 2000"
            value={dateLabel}
            onChange={(event) => setDateLabel(event.target.value)}
          />
        </div>
        <div>
          <label className="label" htmlFor="qa-case-number">
            Numéro
          </label>
          <input
            id="qa-case-number"
            className="field"
            value={number}
            onChange={(event) => setNumber(event.target.value)}
          />
        </div>
      </div>
      <div>
        <label className="label" htmlFor="qa-case-theme">
          Thème
        </label>
        <input
          id="qa-case-theme"
          className="field"
          value={theme}
          onChange={(event) => setTheme(event.target.value)}
        />
      </div>
      <SubjectSelect value={subjectId} onChange={setSubjectId} />
      <Actions onDone={onDone} />
    </form>
  );
}
