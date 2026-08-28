'use client';

import { useMemo, useState } from 'react';
import {
  addDays,
  addMonths,
  endOfMonth,
  isSameDay,
  isSameMonth,
  startOfMonth,
} from 'date-fns';
import { CalendarDays, ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import { EmptyState, PageHeader, Segmented } from '@/components/ui';
import { EventChip } from '@/features/calendar/EventChip';
import { EventDetail } from '@/features/calendar/EventDetail';
import { occurrencesForDay, occurrencesForRange } from '@/features/calendar/helpers';
import { useEvents, useSettings, useSubjectMap } from '@/hooks/data';
import { useUi } from '@/components/layout/AppProviders';
import {
  fmtDayFull,
  fmtDayShort,
  fmtMonthYear,
  minutesOfDay,
  todayISO,
  toDateISO,
  weekEnd,
  weekStart,
} from '@/lib/dates';
import type { EventOccurrence } from '@/types';

type View = 'jour' | 'semaine' | 'mois' | 'agenda';

const HOUR_HEIGHT = 56;

export default function CalendarPage() {
  const events = useEvents();
  const subjects = useSubjectMap();
  const settings = useSettings();
  const { openQuickAdd } = useUi();
  const [view, setView] = useState<View>('semaine');
  const [cursor, setCursor] = useState(() => new Date());
  const [selected, setSelected] = useState<EventOccurrence | null>(null);

  const dayStart = settings?.dayStartHour ?? 8;
  const dayEnd = settings?.dayEndHour ?? 19;
  const hours = useMemo(
    () => Array.from({ length: dayEnd - dayStart + 1 }, (_, index) => dayStart + index),
    [dayStart, dayEnd],
  );

  const weekDays = useMemo(() => {
    const start = weekStart(cursor);
    return Array.from({ length: 7 }, (_, index) => addDays(start, index));
  }, [cursor]);

  const monthGrid = useMemo(() => {
    const start = weekStart(startOfMonth(cursor));
    const end = weekEnd(endOfMonth(cursor));
    const days: Date[] = [];
    let current = start;
    while (current <= end) {
      days.push(current);
      current = addDays(current, 1);
    }
    return days;
  }, [cursor]);

  const step = (delta: number) => {
    if (view === 'jour') setCursor((value) => addDays(value, delta));
    else if (view === 'semaine' || view === 'agenda') setCursor((value) => addDays(value, delta * 7));
    else setCursor((value) => addMonths(value, delta));
  };

  const label =
    view === 'mois'
      ? fmtMonthYear(cursor)
      : view === 'jour'
        ? fmtDayFull(cursor)
        : `${weekStart(cursor).getDate()} – ${fmtDayShort(weekEnd(cursor))}`;

  const today = todayISO();

  return (
    <>
      <PageHeader
        title="Calendrier"
        actions={
          <button type="button" className="btn-primary" onClick={() => openQuickAdd('event')}>
            <Plus size={16} />
            Événement
          </button>
        }
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => step(-1)}
              className="btn-outline h-9 w-9 p-0"
              aria-label="Période précédente"
            >
              <ChevronLeft size={17} />
            </button>
            <button
              type="button"
              onClick={() => step(1)}
              className="btn-outline h-9 w-9 p-0"
              aria-label="Période suivante"
            >
              <ChevronRight size={17} />
            </button>
            <button type="button" onClick={() => setCursor(new Date())} className="btn-outline ml-1">
              Aujourd’hui
            </button>
            <p className="ml-2 text-[15px] font-semibold capitalize text-ink">{label}</p>
          </div>
          <div className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
            <Segmented
              ariaLabel="Mode d’affichage"
              value={view}
              onChange={setView}
              options={[
                { value: 'jour', label: 'Jour' },
                { value: 'semaine', label: 'Semaine' },
                { value: 'mois', label: 'Mois' },
                { value: 'agenda', label: 'Agenda' },
              ]}
            />
          </div>
        </div>
      </PageHeader>

      {/* ------------------------- Semaine / Jour ------------------------ */}
      {view === 'semaine' || view === 'jour' ? (
        <div className="overflow-x-auto rounded-2xl border border-line bg-surface">
          <div
            className="min-w-[640px]"
            style={{ ['--hour' as string]: `${HOUR_HEIGHT}px` }}
          >
            <div
              className="grid border-b border-line"
              style={{
                gridTemplateColumns: `52px repeat(${view === 'jour' ? 1 : weekDays.length}, minmax(0,1fr))`,
              }}
            >
              <div />
              {(view === 'jour' ? [cursor] : weekDays).map((day) => {
                const isToday = toDateISO(day) === today;
                return (
                  <div key={day.toISOString()} className="px-2 py-2.5 text-center">
                    <p className="text-[11px] uppercase tracking-wide text-muted">
                      {day.toLocaleDateString('fr-FR', { weekday: 'short' })}
                    </p>
                    <p
                      className={
                        isToday
                          ? 'mx-auto mt-0.5 flex h-7 w-7 items-center justify-center rounded-full bg-primary text-[13px] font-bold text-[color:var(--primary-ink)]'
                          : 'mt-0.5 text-[13px] font-semibold text-ink'
                      }
                    >
                      {day.getDate()}
                    </p>
                  </div>
                );
              })}
            </div>

            <div
              className="relative grid"
              style={{
                gridTemplateColumns: `52px repeat(${view === 'jour' ? 1 : weekDays.length}, minmax(0,1fr))`,
              }}
            >
              <div className="border-r border-line">
                {hours.map((hour) => (
                  <div
                    key={hour}
                    className="relative text-right"
                    style={{ height: HOUR_HEIGHT }}
                  >
                    <span className="absolute -top-2 right-2 text-[11px] tabular-nums text-muted">
                      {String(hour).padStart(2, '0')}:00
                    </span>
                  </div>
                ))}
              </div>

              {(view === 'jour' ? [cursor] : weekDays).map((day) => {
                const dayOccurrences = occurrencesForDay(events ?? [], day);
                return (
                  <div key={day.toISOString()} className="relative border-r border-line last:border-r-0">
                    {hours.map((hour) => (
                      <div
                        key={hour}
                        className="border-b border-line/60"
                        style={{ height: HOUR_HEIGHT }}
                      />
                    ))}
                    {dayOccurrences.map((occurrence) => {
                      const { event } = occurrence;
                      const start = event.allDay ? dayStart * 60 : minutesOfDay(event.startTime);
                      const end = event.allDay ? dayEnd * 60 : minutesOfDay(event.endTime);
                      const top = ((start - dayStart * 60) / 60) * HOUR_HEIGHT;
                      const height = Math.max(22, ((end - start) / 60) * HOUR_HEIGHT - 3);
                      if (end < dayStart * 60 || start > dayEnd * 60 + 60) return null;
                      return (
                        <div
                          key={occurrence.key}
                          className="absolute inset-x-1"
                          style={{ top: Math.max(0, top), height }}
                        >
                          <EventChip
                            occurrence={occurrence}
                            subject={
                              event.subjectId ? subjects.get(event.subjectId) : undefined
                            }
                            onClick={() => setSelected(occurrence)}
                            compact={height < 46}
                          />
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      ) : null}

      {/* ------------------------------ Mois ----------------------------- */}
      {view === 'mois' ? (
        <div className="overflow-hidden rounded-2xl border border-line bg-surface">
          <div className="grid grid-cols-7 border-b border-line">
            {['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'].map((day) => (
              <div key={day} className="px-2 py-2 text-center text-[11px] uppercase tracking-wide text-muted">
                {day}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7">
            {monthGrid.map((day) => {
              const dayOccurrences = occurrencesForDay(events ?? [], day);
              const isToday = toDateISO(day) === today;
              return (
                <div
                  key={day.toISOString()}
                  className={`min-h-[92px] border-b border-r border-line p-1.5 ${
                    isSameMonth(day, cursor) ? '' : 'bg-surface2/40'
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => {
                      setCursor(day);
                      setView('jour');
                    }}
                    className={
                      isToday
                        ? 'flex h-6 w-6 items-center justify-center rounded-full bg-primary text-[12px] font-bold text-[color:var(--primary-ink)]'
                        : 'flex h-6 w-6 items-center justify-center rounded-full text-[12px] font-medium text-muted hover:bg-surface2'
                    }
                  >
                    {day.getDate()}
                  </button>
                  <div className="mt-1 space-y-1">
                    {dayOccurrences.slice(0, 3).map((occurrence) => (
                      <EventChip
                        key={occurrence.key}
                        occurrence={occurrence}
                        subject={
                          occurrence.event.subjectId
                            ? subjects.get(occurrence.event.subjectId)
                            : undefined
                        }
                        onClick={() => setSelected(occurrence)}
                        compact
                      />
                    ))}
                    {dayOccurrences.length > 3 ? (
                      <p className="px-1 text-[10px] text-muted">
                        +{dayOccurrences.length - 3} autre{dayOccurrences.length - 3 > 1 ? 's' : ''}
                      </p>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : null}

      {/* ----------------------------- Agenda ---------------------------- */}
      {view === 'agenda' ? (
        <AgendaView
          from={cursor}
          onSelect={setSelected}
          events={events ?? []}
          subjects={subjects}
        />
      ) : null}

      <EventDetail
        occurrence={selected}
        open={Boolean(selected)}
        onClose={() => setSelected(null)}
      />
    </>
  );
}

function AgendaView({
  from,
  events,
  subjects,
  onSelect,
}: {
  from: Date;
  events: Parameters<typeof occurrencesForRange>[0];
  subjects: Map<string, import('@/types').Subject>;
  onSelect: (occurrence: EventOccurrence) => void;
}) {
  const start = new Date(from);
  start.setHours(0, 0, 0, 0);
  const end = addDays(start, 20);
  const occurrences = occurrencesForRange(events, start, end);

  const grouped = useMemo(() => {
    const map = new Map<string, EventOccurrence[]>();
    for (const occurrence of occurrences) {
      const list = map.get(occurrence.date) ?? [];
      list.push(occurrence);
      map.set(occurrence.date, list);
    }
    return map;
  }, [occurrences]);

  if (occurrences.length === 0) {
    return (
      <EmptyState
        icon={<CalendarDays size={20} />}
        title="Rien de prévu sur cette période"
        description="Ajoute un cours, un examen ou une session de révision."
      />
    );
  }

  return (
    <div className="space-y-5">
      {Array.from(grouped.entries()).map(([date, list]) => (
        <section key={date}>
          <h2
            className={`mb-2 text-[13px] font-semibold uppercase tracking-wide ${
              isSameDay(new Date(`${date}T12:00`), new Date()) ? 'text-accent' : 'text-muted'
            }`}
          >
            {fmtDayFull(date)}
          </h2>
          <ul className="space-y-2">
            {list.map((occurrence) => (
              <li key={occurrence.key}>
                <EventChip
                  occurrence={occurrence}
                  subject={
                    occurrence.event.subjectId ? subjects.get(occurrence.event.subjectId) : undefined
                  }
                  onClick={() => onSelect(occurrence)}
                />
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
