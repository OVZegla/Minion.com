import { addDays } from 'date-fns';
import type { CalendarEvent, EventOccurrence, EventType, Subject } from '@/types';
import { expandEvents } from '@/lib/recurrence';
import { fromISO } from '@/lib/dates';

export const EVENT_TYPE_LABEL: Record<EventType, string> = {
  cours: 'Cours',
  cm: 'CM',
  td: 'TD',
  tp: 'TP',
  examen: 'Examen',
  devoir: 'Devoir',
  revision: 'Révision',
  sae: 'SAÉ',
  rdv: 'Rendez-vous',
  perso: 'Personnel',
};

/** Chaque type a une representation legerement differente. */
export const EVENT_TYPE_STYLE: Record<EventType, { border: string; pattern: boolean }> = {
  cours: { border: 'solid', pattern: false },
  cm: { border: 'solid', pattern: false },
  td: { border: 'dashed', pattern: false },
  tp: { border: 'dotted', pattern: false },
  examen: { border: 'solid', pattern: true },
  devoir: { border: 'dashed', pattern: false },
  revision: { border: 'dotted', pattern: false },
  sae: { border: 'double', pattern: false },
  rdv: { border: 'solid', pattern: false },
  perso: { border: 'dashed', pattern: false },
};

export function occurrencesForDay(events: CalendarEvent[], day: Date): EventOccurrence[] {
  const start = new Date(day);
  start.setHours(0, 0, 0, 0);
  const end = new Date(day);
  end.setHours(23, 59, 59, 999);
  return expandEvents(events, start, end);
}

export function occurrencesForRange(
  events: CalendarEvent[],
  start: Date,
  end: Date,
): EventOccurrence[] {
  return expandEvents(events, start, end);
}

/** Prochain cours (ou evenement) a venir, en tenant compte des recurrences. */
export function nextUpcoming(
  events: CalendarEvent[],
  from = new Date(),
  types?: EventType[],
): EventOccurrence | null {
  const horizon = addDays(from, 60);
  const all = expandEvents(events, from, horizon);
  const filtered = types ? all.filter((occ) => types.includes(occ.event.type)) : all;
  return filtered.find((occ) => occ.end.getTime() > from.getTime()) ?? null;
}

export function eventTitle(occurrence: EventOccurrence, subjects: Map<string, Subject>): string {
  const subject = occurrence.event.subjectId ? subjects.get(occurrence.event.subjectId) : undefined;
  return occurrence.event.title || subject?.name || 'Événement';
}

export function minutesBetween(from: Date, to: Date): number {
  return Math.round((to.getTime() - from.getTime()) / 60000);
}

export function isSameDayISO(iso: string, day: Date): boolean {
  return fromISO(iso).toDateString() === day.toDateString();
}
