import { describe, expect, it } from 'vitest';
import { expandEvents, nextOccurrence, withException } from '@/lib/recurrence';
import type { CalendarEvent } from '@/types';

const base: CalendarEvent = {
  id: 'evt1',
  title: 'Droit constitutionnel',
  type: 'cm',
  subjectId: 'sub1',
  date: '2026-09-07', // un lundi
  startTime: '10:00',
  endTime: '11:30',
  allDay: false,
  recurrence: {
    freq: 'weekly',
    interval: 1,
    byWeekday: [1],
    until: '2026-10-05',
    exceptions: [],
  },
  createdAt: '2026-09-01T08:00',
  updatedAt: '2026-09-01T08:00',
};

describe('récurrence hebdomadaire', () => {
  it('développe une série sur une plage', () => {
    const occurrences = expandEvents([base], new Date(2026, 8, 1), new Date(2026, 8, 30));
    expect(occurrences.map((occ) => occ.date)).toEqual([
      '2026-09-07',
      '2026-09-14',
      '2026-09-21',
      '2026-09-28',
    ]);
  });

  it('respecte la date de fin', () => {
    const occurrences = expandEvents([base], new Date(2026, 9, 1), new Date(2026, 9, 31));
    expect(occurrences.map((occ) => occ.date)).toEqual(['2026-10-05']);
  });

  it('ne génère rien avant le début de la série', () => {
    const occurrences = expandEvents([base], new Date(2026, 7, 1), new Date(2026, 7, 31));
    expect(occurrences).toHaveLength(0);
  });

  it('exclut les occurrences mises en exception', () => {
    const withEx = withException(base, '2026-09-14');
    const occurrences = expandEvents([withEx], new Date(2026, 8, 1), new Date(2026, 8, 30));
    expect(occurrences.map((occ) => occ.date)).toEqual(['2026-09-07', '2026-09-21', '2026-09-28']);
  });

  it('gère plusieurs jours et un intervalle de 2 semaines', () => {
    const event: CalendarEvent = {
      ...base,
      recurrence: { freq: 'weekly', interval: 2, byWeekday: [1, 3], until: null, exceptions: [] },
    };
    const occurrences = expandEvents([event], new Date(2026, 8, 7), new Date(2026, 8, 27));
    expect(occurrences.map((occ) => occ.date)).toEqual([
      '2026-09-07',
      '2026-09-09',
      '2026-09-21',
      '2026-09-23',
    ]);
  });

  it('gère un événement unique', () => {
    const single: CalendarEvent = { ...base, id: 'evt2', recurrence: null, date: '2026-09-10' };
    expect(expandEvents([single], new Date(2026, 8, 1), new Date(2026, 8, 30))).toHaveLength(1);
    expect(expandEvents([single], new Date(2026, 9, 1), new Date(2026, 9, 30))).toHaveLength(0);
  });

  it('trouve la prochaine occurrence à venir', () => {
    const next = nextOccurrence([base], new Date(2026, 8, 15, 9, 0));
    expect(next?.date).toBe('2026-09-21');
  });

  it('calcule des heures de début et de fin cohérentes', () => {
    const [first] = expandEvents([base], new Date(2026, 8, 7), new Date(2026, 8, 7));
    expect(first.start.getHours()).toBe(10);
    expect(first.end.getHours()).toBe(11);
    expect(first.end.getMinutes()).toBe(30);
  });
});
