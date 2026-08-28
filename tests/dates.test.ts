import { describe, expect, it } from 'vitest';
import {
  addMinutesToTime,
  atTime,
  daysUntil,
  fmtDuration,
  fromISO,
  minutesOfDay,
  relativeCountdown,
  relativeDayLabel,
  timeFromMinutes,
  toDateISO,
} from '@/lib/dates';

describe('dates', () => {
  it('convertit une date locale sans décalage de fuseau', () => {
    const date = new Date(2026, 8, 17, 23, 30);
    expect(toDateISO(date)).toBe('2026-09-17');
  });

  it('relit une date ISO courte en heure locale', () => {
    const parsed = fromISO('2026-09-17');
    expect(parsed.getFullYear()).toBe(2026);
    expect(parsed.getMonth()).toBe(8);
    expect(parsed.getDate()).toBe(17);
  });

  it('combine un jour et une heure', () => {
    const date = atTime('2026-09-17', '14:05');
    expect(date.getHours()).toBe(14);
    expect(date.getMinutes()).toBe(5);
  });

  it('convertit les minutes en heures', () => {
    expect(minutesOfDay('09:30')).toBe(570);
    expect(timeFromMinutes(570)).toBe('09:30');
    expect(addMinutesToTime('09:30', 90)).toBe('11:00');
  });

  it('formate les durées à la française', () => {
    expect(fmtDuration(45)).toBe('45 min');
    expect(fmtDuration(60)).toBe('1 h');
    expect(fmtDuration(265)).toBe('4 h 25');
  });

  it('calcule les écarts en jours calendaires', () => {
    const from = new Date(2026, 8, 17, 23, 0);
    expect(daysUntil('2026-09-18', from)).toBe(1);
    expect(daysUntil('2026-09-17', from)).toBe(0);
    expect(daysUntil('2026-09-15', from)).toBe(-2);
  });

  it('produit des libellés relatifs lisibles', () => {
    const from = new Date(2026, 8, 17, 12, 0);
    expect(relativeDayLabel('2026-09-17', from)).toBe("Aujourd'hui");
    expect(relativeDayLabel('2026-09-18', from)).toBe('Demain');
    expect(relativeCountdown('2026-09-29', from)).toBe('dans 12 jours');
  });
});
