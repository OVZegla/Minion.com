import {
  addDays,
  differenceInCalendarDays,
  endOfWeek,
  format,
  isValid,
  parse,
  parseISO,
  startOfWeek,
} from 'date-fns';
import { fr } from 'date-fns/locale';
import type { DateISO, DateTimeISO, TimeHM } from '@/types';

export const FR = { locale: fr } as const;

/** "YYYY-MM-DD" en heure locale (jamais de conversion UTC). */
export function toDateISO(d: Date): DateISO {
  return format(d, 'yyyy-MM-dd');
}

export function toDateTimeISO(d: Date): DateTimeISO {
  return format(d, "yyyy-MM-dd'T'HH:mm");
}

export function nowISO(): DateTimeISO {
  return toDateTimeISO(new Date());
}

export function todayISO(): DateISO {
  return toDateISO(new Date());
}

/** Parse "YYYY-MM-DD" ou "YYYY-MM-DDTHH:mm" en Date locale. */
export function fromISO(value: string): Date {
  if (!value) return new Date(NaN);
  if (value.length === 10) return parse(value, 'yyyy-MM-dd', new Date());
  const d = parseISO(value);
  return d;
}

/** Combine un jour et une heure "HH:mm" en Date locale. */
export function atTime(date: DateISO, time?: TimeHM | null): Date {
  const base = fromISO(date);
  if (!time) return base;
  const [h, m] = time.split(':').map(Number);
  base.setHours(h || 0, m || 0, 0, 0);
  return base;
}

export function minutesOfDay(time: TimeHM): number {
  const [h, m] = time.split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
}

export function timeFromMinutes(total: number): TimeHM {
  const clamped = Math.max(0, Math.min(24 * 60 - 1, Math.round(total)));
  const h = Math.floor(clamped / 60);
  const m = clamped % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

export function addMinutesToTime(time: TimeHM, minutes: number): TimeHM {
  return timeFromMinutes(minutesOfDay(time) + minutes);
}

export function weekStart(d: Date): Date {
  return startOfWeek(d, { weekStartsOn: 1 });
}

export function weekEnd(d: Date): Date {
  return endOfWeek(d, { weekStartsOn: 1 });
}

export function daysUntil(date: DateISO, from = new Date()): number {
  return differenceInCalendarDays(fromISO(date), from);
}

/* ---------------------------- Affichage ---------------------------- */

export function fmtDayLong(d: Date | DateISO): string {
  const date = typeof d === 'string' ? fromISO(d) : d;
  if (!isValid(date)) return '';
  return format(date, 'EEEE d MMMM', FR);
}

export function fmtDayShort(d: Date | DateISO): string {
  const date = typeof d === 'string' ? fromISO(d) : d;
  if (!isValid(date)) return '';
  return format(date, 'd MMM', FR);
}

export function fmtDayFull(d: Date | DateISO): string {
  const date = typeof d === 'string' ? fromISO(d) : d;
  if (!isValid(date)) return '';
  return format(date, 'EEEE d MMMM yyyy', FR);
}

export function fmtMonthYear(d: Date): string {
  return format(d, 'MMMM yyyy', FR);
}

/** "Aujourd'hui", "Demain", "Hier", "lundi 8 sept." sinon. */
export function relativeDayLabel(date: DateISO, from = new Date()): string {
  const diff = daysUntil(date, from);
  if (diff === 0) return "Aujourd'hui";
  if (diff === 1) return 'Demain';
  if (diff === -1) return 'Hier';
  if (diff > 1 && diff < 7) return format(fromISO(date), 'EEEE', FR);
  if (diff < -1 && diff > -7) return `${format(fromISO(date), 'EEEE', FR)} dernier`;
  return format(fromISO(date), 'd MMM yyyy', FR);
}

/** "dans 12 jours", "demain", "il y a 3 jours" */
export function relativeCountdown(date: DateISO, from = new Date()): string {
  const diff = daysUntil(date, from);
  if (diff === 0) return "aujourd'hui";
  if (diff === 1) return 'demain';
  if (diff === -1) return 'hier';
  if (diff > 1) return `dans ${diff} jours`;
  return `il y a ${Math.abs(diff)} jours`;
}

/** 265 -> "4 h 25" ; 45 -> "45 min" */
export function fmtDuration(minutes: number): string {
  const m = Math.max(0, Math.round(minutes));
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60);
  const rest = m % 60;
  return rest === 0 ? `${h} h` : `${h} h ${String(rest).padStart(2, '0')}`;
}

export function fmtClock(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds));
  const mm = Math.floor(s / 60);
  const ss = s % 60;
  return `${String(mm).padStart(2, '0')}:${String(ss).padStart(2, '0')}`;
}

export function greeting(d = new Date()): string {
  const h = d.getHours();
  if (h < 6) return 'Bonne nuit';
  if (h < 18) return 'Bonjour';
  return 'Bonsoir';
}

export function rangeDays(start: Date, count: number): Date[] {
  return Array.from({ length: count }, (_, i) => addDays(start, i));
}

export const WEEKDAY_LABELS = ['Dim.', 'Lun.', 'Mar.', 'Mer.', 'Jeu.', 'Ven.', 'Sam.'];
export const WEEKDAY_LONG = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];
