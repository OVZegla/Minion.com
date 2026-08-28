import { addDays, isAfter, isBefore } from 'date-fns';
import type { CalendarEvent, DateISO, EventOccurrence } from '@/types';
import { atTime, fromISO, toDateISO } from './dates';

/**
 * Developpe les evenements (uniques + recurrents hebdomadaires) sur une plage.
 * Les occurrences ne sont jamais stockees : elles sont calculees a l'affichage.
 *
 * Une exception ("YYYY-MM-DD") retire une occurrence precise ; deplacer une
 * occurrence revient a ajouter une exception + creer un evenement unique.
 */
export function expandEvents(
  events: CalendarEvent[],
  rangeStart: Date,
  rangeEnd: Date,
): EventOccurrence[] {
  const out: EventOccurrence[] = [];
  const startISO = toDateISO(rangeStart);
  const endISO = toDateISO(rangeEnd);

  for (const event of events) {
    if (!event.recurrence) {
      if (event.date >= startISO && event.date <= endISO) {
        out.push(makeOccurrence(event, event.date, false));
      }
      continue;
    }

    const rec = event.recurrence;
    const interval = Math.max(1, rec.interval || 1);
    const weekdays = rec.byWeekday?.length ? rec.byWeekday : [fromISO(event.date).getDay()];
    const seriesStart = fromISO(event.date);
    const until = rec.until ? fromISO(rec.until) : null;
    const exceptions = new Set(rec.exceptions ?? []);

    let cursor = new Date(rangeStart);
    cursor.setHours(0, 0, 0, 0);
    if (isBefore(cursor, seriesStart)) cursor = new Date(seriesStart);

    const guardEnd = until && isBefore(until, rangeEnd) ? until : rangeEnd;

    while (!isAfter(cursor, guardEnd)) {
      const iso = toDateISO(cursor);
      if (
        weekdays.includes(cursor.getDay()) &&
        !exceptions.has(iso) &&
        !isBefore(cursor, seriesStart) &&
        weekIndexMatches(seriesStart, cursor, interval)
      ) {
        out.push(makeOccurrence(event, iso, true));
      }
      cursor = addDays(cursor, 1);
    }
  }

  return out.sort((a, b) => a.start.getTime() - b.start.getTime());
}

function weekIndexMatches(seriesStart: Date, current: Date, interval: number): boolean {
  if (interval === 1) return true;
  const startWeek = startOfIsoWeek(seriesStart).getTime();
  const currentWeek = startOfIsoWeek(current).getTime();
  const weeks = Math.round((currentWeek - startWeek) / (7 * 24 * 3600 * 1000));
  return weeks % interval === 0;
}

function startOfIsoWeek(d: Date): Date {
  const copy = new Date(d);
  copy.setHours(0, 0, 0, 0);
  const day = (copy.getDay() + 6) % 7;
  copy.setDate(copy.getDate() - day);
  return copy;
}

function makeOccurrence(event: CalendarEvent, date: DateISO, isRecurring: boolean): EventOccurrence {
  const start = event.allDay ? atTime(date, '00:00') : atTime(date, event.startTime);
  const end = event.allDay ? atTime(date, '23:59') : atTime(date, event.endTime);
  return { key: `${event.id}:${date}`, event, date, start, end, isRecurring };
}

/** Ajoute une exception a une serie (utilise pour deplacer/supprimer une occurrence). */
export function withException(event: CalendarEvent, date: DateISO): CalendarEvent {
  if (!event.recurrence) return event;
  const exceptions = Array.from(new Set([...(event.recurrence.exceptions ?? []), date]));
  return { ...event, recurrence: { ...event.recurrence, exceptions } };
}

/** Prochaine occurrence a partir de maintenant (recherche sur 120 jours). */
export function nextOccurrence(
  events: CalendarEvent[],
  from = new Date(),
): EventOccurrence | null {
  const horizon = addDays(from, 120);
  const all = expandEvents(events, from, horizon);
  return all.find((occ) => occ.end.getTime() >= from.getTime()) ?? null;
}
