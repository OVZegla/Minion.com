'use client';

import Link from 'next/link';
import { BookOpen, FileText, ListTodo } from 'lucide-react';
import { ProgressBar } from '@/components/ui';
import { colorVars } from '@/lib/colors';
import type { Subject } from '@/types';

export function SubjectCard({
  subject,
  courses,
  sheets,
  openTasks,
  percent,
  nextLine,
}: {
  subject: Subject;
  courses: number;
  sheets: number;
  openTasks: number;
  percent: number;
  nextLine?: string;
}) {
  return (
    <Link
      href={`/matieres/${subject.id}`}
      className="sc group flex flex-col rounded-2xl border border-line bg-surface p-4 transition hover:border-[color:var(--c-solid)] hover:shadow-card"
      style={colorVars(subject.color)}
    >
      <div className="flex items-start gap-3">
        <span
          aria-hidden
          className="mt-0.5 h-9 w-1.5 shrink-0 rounded-full"
          style={{ background: 'var(--c-solid)' }}
        />
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-[15px] font-semibold leading-tight text-ink">{subject.name}</h3>
          {subject.teacher ? (
            <p className="mt-0.5 truncate text-[12px] text-muted">{subject.teacher}</p>
          ) : null}
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px] text-muted">
        <span className="inline-flex items-center gap-1">
          <BookOpen size={13} />
          {courses} cours
        </span>
        <span className="inline-flex items-center gap-1">
          <FileText size={13} />
          {sheets} fiche{sheets > 1 ? 's' : ''}
        </span>
        {openTasks > 0 ? (
          <span className="inline-flex items-center gap-1">
            <ListTodo size={13} />
            {openTasks} à faire
          </span>
        ) : null}
      </div>

      {nextLine ? <p className="mt-2 truncate text-[12px] text-muted">{nextLine}</p> : null}

      <div className="mt-3">
        <ProgressBar value={percent} color={subject.color} size="sm" label={`Révision ${subject.name}`} />
      </div>
    </Link>
  );
}
