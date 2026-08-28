'use client';

import clsx from 'clsx';
import { MapPin, User } from 'lucide-react';
import { colorVars } from '@/lib/colors';
import { EVENT_TYPE_LABEL, EVENT_TYPE_STYLE } from './helpers';
import type { EventOccurrence, Subject } from '@/types';

/** Carte d'evenement — utilisee dans la timeline et le calendrier. */
export function EventChip({
  occurrence,
  subject,
  onClick,
  compact = false,
  showTime = true,
}: {
  occurrence: EventOccurrence;
  subject?: Subject;
  onClick?: () => void;
  compact?: boolean;
  showTime?: boolean;
}) {
  const { event } = occurrence;
  const style = EVENT_TYPE_STYLE[event.type];
  const title = event.title || subject?.name || 'Événement';

  const content = (
    <div
      className={clsx(
        'sc h-full w-full overflow-hidden rounded-xl border-l-[3px] text-left transition',
        compact ? 'px-2 py-1' : 'px-3 py-2',
        onClick && 'hover:brightness-[.97]',
      )}
      style={{
        ...colorVars(subject?.color ?? typeFallbackColor(event.type)),
        background: 'var(--c-soft)',
        borderLeftColor: 'var(--c-solid)',
        borderLeftStyle: style.border as 'solid',
      }}
    >
      <div className="flex items-baseline gap-1.5">
        {showTime && !event.allDay ? (
          <span
            className="shrink-0 text-[11px] font-semibold tabular-nums"
            style={{ color: 'var(--c-text)' }}
          >
            {event.startTime}
          </span>
        ) : null}
        <span
          className="truncate text-[12px] font-semibold leading-tight"
          style={{ color: 'var(--c-text)' }}
        >
          {title}
        </span>
      </div>
      {!compact ? (
        <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-muted">
          <span className="font-medium">{EVENT_TYPE_LABEL[event.type]}</span>
          {!event.allDay ? (
            <span className="tabular-nums">
              {event.startTime} – {event.endTime}
            </span>
          ) : (
            <span>Toute la journée</span>
          )}
          {event.room ? (
            <span className="inline-flex items-center gap-0.5">
              <MapPin size={11} />
              {event.room}
            </span>
          ) : null}
          {event.teacher ? (
            <span className="inline-flex items-center gap-0.5">
              <User size={11} />
              {event.teacher}
            </span>
          ) : null}
        </div>
      ) : null}
    </div>
  );

  if (!onClick) return content;
  return (
    <button type="button" onClick={onClick} className="h-full w-full text-left">
      {content}
    </button>
  );
}

function typeFallbackColor(type: string): string {
  if (type === 'examen') return 'coral';
  if (type === 'revision') return 'amber';
  if (type === 'sae') return 'teal';
  if (type === 'perso') return 'slate';
  return 'slate';
}
