'use client';

import clsx from 'clsx';
import { addDays } from 'date-fns';
import { useId } from 'react';
import { useSubjects } from '@/hooks/data';
import { toDateISO } from '@/lib/dates';
import { SUBJECT_COLORS, SUBJECT_COLOR_KEYS } from '@/lib/colors';
import type { Priority, SubjectColorKey } from '@/types';

export function SubjectSelect({
  value,
  onChange,
  allowEmpty = true,
  label = 'Matière',
  emptyLabel = 'Aucune matière',
  required = false,
}: {
  value: string | null | undefined;
  onChange: (value: string | null) => void;
  allowEmpty?: boolean;
  label?: string;
  emptyLabel?: string;
  required?: boolean;
}) {
  const subjects = useSubjects();
  const id = useId();
  return (
    <div>
      <label className="label" htmlFor={id}>
        {label}
        {required ? <span aria-hidden> *</span> : null}
      </label>
      <select
        id={id}
        className="field"
        required={required}
        value={value ?? ''}
        onChange={(event) => onChange(event.target.value || null)}
      >
        {allowEmpty ? <option value="">{emptyLabel}</option> : <option value="">Choisir…</option>}
        {(subjects ?? []).map((subject) => (
          <option key={subject.id} value={subject.id}>
            {subject.name}
          </option>
        ))}
      </select>
    </div>
  );
}

const QUICK_DATES = [
  { label: "Aujourd'hui", offset: 0 },
  { label: 'Demain', offset: 1 },
  { label: 'Dans 3 jours', offset: 3 },
  { label: 'Semaine pro.', offset: 7 },
];

export function DateField({
  value,
  onChange,
  label = 'Quand ?',
  withQuickChips = true,
  required = false,
}: {
  value: string | null | undefined;
  onChange: (value: string | null) => void;
  label?: string;
  withQuickChips?: boolean;
  required?: boolean;
}) {
  const id = useId();
  const today = new Date();
  return (
    <div>
      <label className="label" htmlFor={id}>
        {label}
      </label>
      <input
        id={id}
        type="date"
        required={required}
        className="field"
        value={value ?? ''}
        onChange={(event) => onChange(event.target.value || null)}
      />
      {withQuickChips ? (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {QUICK_DATES.map((quick) => {
            const iso = toDateISO(addDays(today, quick.offset));
            return (
              <button
                key={quick.label}
                type="button"
                onClick={() => onChange(iso)}
                className={clsx(
                  'chip transition',
                  value === iso
                    ? 'border-[color:var(--primary-line)] bg-primary-soft text-accent'
                    : 'text-muted hover:bg-surface2',
                )}
              >
                {quick.label}
              </button>
            );
          })}
          {value ? (
            <button
              type="button"
              onClick={() => onChange(null)}
              className="chip text-muted hover:bg-surface2"
            >
              Effacer
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

export function TimeField({
  value,
  onChange,
  label = 'Heure',
}: {
  value: string | null | undefined;
  onChange: (value: string | null) => void;
  label?: string;
}) {
  const id = useId();
  return (
    <div>
      <label className="label" htmlFor={id}>
        {label}
      </label>
      <input
        id={id}
        type="time"
        className="field"
        value={value ?? ''}
        onChange={(event) => onChange(event.target.value || null)}
      />
    </div>
  );
}

export const PRIORITY_LABEL: Record<Priority, string> = {
  low: 'Faible',
  normal: 'Normale',
  high: 'Importante',
  urgent: 'Urgente',
};

export function PrioritySelect({
  value,
  onChange,
}: {
  value: Priority;
  onChange: (value: Priority) => void;
}) {
  return (
    <div>
      <span className="label">Priorité</span>
      <div className="flex flex-wrap gap-1.5">
        {(Object.keys(PRIORITY_LABEL) as Priority[]).map((priority) => (
          <button
            key={priority}
            type="button"
            aria-pressed={value === priority}
            onClick={() => onChange(priority)}
            className={clsx(
              'chip transition',
              value === priority
                ? 'border-[color:var(--primary-line)] bg-primary-soft text-accent'
                : 'text-muted hover:bg-surface2',
            )}
          >
            {PRIORITY_LABEL[priority]}
          </button>
        ))}
      </div>
    </div>
  );
}

export function ColorPicker({
  value,
  onChange,
}: {
  value: SubjectColorKey;
  onChange: (value: SubjectColorKey) => void;
}) {
  return (
    <div>
      <span className="label">Couleur</span>
      <div className="flex flex-wrap gap-2">
        {SUBJECT_COLOR_KEYS.map((key) => (
          <button
            key={key}
            type="button"
            onClick={() => onChange(key)}
            aria-label={SUBJECT_COLORS[key].label}
            aria-pressed={value === key}
            title={SUBJECT_COLORS[key].label}
            className={clsx(
              'h-8 w-8 rounded-full border-2 transition',
              value === key ? 'border-ink scale-110' : 'border-transparent hover:scale-105',
            )}
            style={{ background: SUBJECT_COLORS[key].solid }}
          >
            {value === key ? <span className="sr-only">Sélectionnée</span> : null}
          </button>
        ))}
      </div>
    </div>
  );
}
