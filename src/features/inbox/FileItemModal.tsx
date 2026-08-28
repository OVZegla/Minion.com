'use client';

import { useEffect, useMemo, useState } from 'react';
import { db } from '@/db/db';
import { createCourse, createExam, createStudySheet, createTask } from '@/db/repo';
import { Modal } from '@/components/ui/Modal';
import { DateField, SubjectSelect, TimeField } from '@/components/ui/inputs';
import { useToast } from '@/components/ui/Toast';
import { useSubjects } from '@/hooks/data';
import { parseQuickInput } from '@/lib/quick-parse';
import { newId } from '@/lib/id';
import { nowISO, todayISO } from '@/lib/dates';
import type { InboxItem } from '@/types';

type Target = 'task' | 'exam' | 'course' | 'event' | 'sheet' | 'note';

const TARGETS: { value: Target; label: string }[] = [
  { value: 'task', label: 'Tâche' },
  { value: 'exam', label: 'Examen' },
  { value: 'event', label: 'Événement' },
  { value: 'course', label: 'Cours' },
  { value: 'sheet', label: 'Fiche' },
  { value: 'note', label: 'Note de cours' },
];

/** Transforme une note rapide en element structure, en pre-remplissant ce qui est detecte. */
export function FileItemModal({
  item,
  open,
  onClose,
}: {
  item: InboxItem | null;
  open: boolean;
  onClose: () => void;
}) {
  const subjects = useSubjects();
  const { toast } = useToast();
  const [target, setTarget] = useState<Target>('task');
  const [title, setTitle] = useState('');
  const [subjectId, setSubjectId] = useState<string | null>(null);
  const [date, setDate] = useState<string | null>(null);
  const [time, setTime] = useState<string | null>(null);

  const parsed = useMemo(
    () => (item ? parseQuickInput(item.text, subjects ?? []) : null),
    [item, subjects],
  );

  useEffect(() => {
    if (!item || !open || !parsed) return;
    setTitle(parsed.title);
    setSubjectId(parsed.subjectId);
    setDate(parsed.date);
    setTime(parsed.time);
    setTarget('task');
  }, [item, open, parsed]);

  if (!item) return null;

  const submit = async () => {
    const clean = title.trim() || item.text;
    switch (target) {
      case 'task':
        await createTask({ title: clean, subjectId, dueDate: date, dueTime: time });
        break;
      case 'exam':
        if (!subjectId || !date) {
          toast('Choisis une matière et une date');
          return;
        }
        await createExam({ subjectId, title: clean, date, time });
        break;
      case 'course':
        if (!subjectId) {
          toast('Choisis une matière');
          return;
        }
        await createCourse({ subjectId, title: clean, date: date ?? undefined });
        break;
      case 'sheet':
        if (!subjectId) {
          toast('Choisis une matière');
          return;
        }
        await createStudySheet({ subjectId, title: clean });
        break;
      case 'event':
        await db.events.put({
          id: newId('evt'),
          title: clean,
          type: 'perso',
          subjectId,
          courseId: null,
          examId: null,
          taskId: null,
          saeId: null,
          revisionSessionId: null,
          date: date ?? todayISO(),
          startTime: time ?? '09:00',
          endTime: time ?? '10:00',
          allDay: !time,
          recurrence: null,
          createdAt: nowISO(),
          updatedAt: nowISO(),
        });
        break;
      case 'note':
        await db.notes.put({
          id: newId('nte'),
          courseId: null,
          subjectId,
          title: clean.slice(0, 60),
          text: item.text,
          createdAt: nowISO(),
          updatedAt: nowISO(),
        });
        break;
    }

    await db.inbox.update(item.id, {
      status: 'filed',
      filedAs: TARGETS.find((entry) => entry.value === target)?.label,
    });
    toast('Élément classé');
    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Classer cette note"
      description={item.text}
      footer={
        <>
          <button type="button" className="btn-outline" onClick={onClose}>
            Annuler
          </button>
          <button type="button" className="btn-primary" onClick={submit}>
            Classer
          </button>
        </>
      }
    >
      <div className="space-y-4">
        <div>
          <span className="label">Transformer en</span>
          <div className="flex flex-wrap gap-1.5">
            {TARGETS.map((entry) => (
              <button
                key={entry.value}
                type="button"
                aria-pressed={target === entry.value}
                onClick={() => setTarget(entry.value)}
                className={
                  target === entry.value
                    ? 'chip border-primary-line bg-primary-soft text-accent'
                    : 'chip text-muted hover:bg-surface2'
                }
              >
                {entry.label}
              </button>
            ))}
          </div>
        </div>

        {parsed && (parsed.matchedDateLabel || parsed.matchedSubjectName) ? (
          <p className="rounded-xl bg-primary-soft px-3 py-2 text-[12px] text-accent">
            Détecté automatiquement :{' '}
            {[parsed.matchedDateLabel, parsed.matchedSubjectName].filter(Boolean).join(' · ')}
          </p>
        ) : null}

        <div>
          <label className="label" htmlFor="fi-title">
            Titre
          </label>
          <input
            id="fi-title"
            className="field"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
          />
        </div>

        <SubjectSelect
          value={subjectId}
          onChange={setSubjectId}
          allowEmpty={target === 'task' || target === 'event' || target === 'note'}
        />

        {target !== 'sheet' && target !== 'note' ? (
          <div className="grid grid-cols-2 gap-3">
            <DateField value={date} onChange={setDate} label="Date" withQuickChips={false} />
            <TimeField value={time} onChange={setTime} />
          </div>
        ) : null}
      </div>
    </Modal>
  );
}
