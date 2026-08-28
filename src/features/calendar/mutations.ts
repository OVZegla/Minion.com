import { db } from '@/db/db';
import { newId } from '@/lib/id';
import { nowISO } from '@/lib/dates';
import { withException } from '@/lib/recurrence';
import type { CalendarEvent, DateISO } from '@/types';

/** Supprime une seule occurrence d'une serie (ajout d'une exception). */
export async function deleteOccurrence(event: CalendarEvent, date: DateISO): Promise<void> {
  if (!event.recurrence) {
    await db.events.delete(event.id);
    return;
  }
  const updated = withException(event, date);
  await db.events.put({ ...updated, updatedAt: nowISO() });
}

/**
 * Modifie une seule occurrence : on l'exclut de la serie et on cree un
 * evenement unique porteur des modifications.
 */
export async function detachOccurrence(
  event: CalendarEvent,
  date: DateISO,
  patch: Partial<CalendarEvent>,
): Promise<string> {
  const detached: CalendarEvent = {
    ...event,
    ...patch,
    id: newId('evt'),
    recurrence: null,
    date: (patch.date ?? date) as DateISO,
    createdAt: nowISO(),
    updatedAt: nowISO(),
  };
  await db.transaction('rw', db.events, async () => {
    await db.events.put({ ...withException(event, date), updatedAt: nowISO() });
    await db.events.put(detached);
  });
  return detached.id;
}

export async function updateSeries(
  event: CalendarEvent,
  patch: Partial<CalendarEvent>,
): Promise<void> {
  await db.events.put({ ...event, ...patch, updatedAt: nowISO() });
}

export async function deleteSeries(eventId: string): Promise<void> {
  await db.events.delete(eventId);
}
