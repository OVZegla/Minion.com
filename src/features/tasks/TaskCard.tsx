'use client';

import clsx from 'clsx';
import Link from 'next/link';
import { Clock, Flag } from 'lucide-react';
import { SubjectBadge, StatusBadge } from '@/components/ui';
import { daysUntil, relativeDayLabel } from '@/lib/dates';
import { PRIORITY_LABEL } from '@/components/ui/inputs';
import type { Subject, Task } from '@/types';

export const TASK_TYPE_LABEL: Record<Task['type'], string> = {
  devoir: 'Devoir',
  td: 'TD',
  lecture: 'Lecture',
  fiche: 'Fiche',
  revision: 'Révision',
  projet: 'Projet',
  admin: 'Administratif',
  perso: 'Personnel',
};

export function dueTone(task: Task): 'danger' | 'primary' | 'neutral' {
  if (!task.dueDate || task.status === 'done') return 'neutral';
  const days = daysUntil(task.dueDate);
  if (days < 0) return 'danger';
  if (days <= 1) return 'primary';
  return 'neutral';
}

export function TaskCard({
  task,
  subject,
  onToggle,
  onOpen,
  compact = false,
}: {
  task: Task;
  subject?: Subject;
  onToggle: () => void;
  onOpen?: () => void;
  compact?: boolean;
}) {
  const done = task.status === 'done';
  const late = task.dueDate && !done && daysUntil(task.dueDate) < 0;
  const subCount = task.subtasks.length;
  const subDone = task.subtasks.filter((item) => item.done).length;

  return (
    <div
      className={clsx(
        'group flex items-start gap-3 rounded-2xl border border-line bg-surface transition',
        compact ? 'px-3 py-2.5' : 'p-3.5',
        done && 'opacity-60',
      )}
    >
      <button
        type="button"
        onClick={onToggle}
        aria-pressed={done}
        aria-label={done ? `Rouvrir « ${task.title} »` : `Terminer « ${task.title} »`}
        className={clsx(
          'mt-0.5 flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-full border-2 transition',
          done
            ? 'border-transparent bg-[color:var(--success)] text-white'
            : 'border-line hover:border-[color:var(--primary)]',
        )}
      >
        {done ? (
          <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="3.5">
            <path d="M20 6 9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        ) : null}
      </button>

      <div className="min-w-0 flex-1">
        <button
          type="button"
          onClick={onOpen}
          disabled={!onOpen}
          className="block w-full text-left disabled:cursor-default"
        >
          <p
            className={clsx(
              'text-[14px] font-medium leading-snug text-ink',
              done && 'line-through decoration-muted',
            )}
          >
            {task.title}
          </p>
        </button>
        <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1">
          {subject ? (
            <SubjectBadge name={subject.shortName} color={subject.color} size="sm" href={`/matieres/${subject.id}`} />
          ) : null}
          {task.dueDate ? (
            <span
              className={clsx(
                'inline-flex items-center gap-1 text-[12px]',
                late ? 'font-semibold text-[color:var(--danger)]' : 'text-muted',
              )}
            >
              <Clock size={12} />
              {late ? 'En retard — ' : ''}
              {relativeDayLabel(task.dueDate)}
              {task.dueTime ? ` · ${task.dueTime}` : ''}
            </span>
          ) : null}
          {task.priority === 'urgent' || task.priority === 'high' ? (
            <StatusBadge tone={task.priority === 'urgent' ? 'danger' : 'primary'} icon={<Flag size={10} />}>
              {PRIORITY_LABEL[task.priority]}
            </StatusBadge>
          ) : null}
          {subCount > 0 ? (
            <span className="text-[12px] text-muted">
              {subDone}/{subCount} sous-tâches
            </span>
          ) : null}
          {!compact ? (
            <span className="text-[12px] text-muted">{TASK_TYPE_LABEL[task.type]}</span>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export function TaskLink({ children }: { children: React.ReactNode }) {
  return (
    <Link href="/a-faire" className="btn-soft w-full justify-center">
      {children}
    </Link>
  );
}
