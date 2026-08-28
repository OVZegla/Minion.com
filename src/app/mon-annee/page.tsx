'use client';

import { useState } from 'react';
import { Archive, ArchiveRestore, Plus } from 'lucide-react';
import { db } from '@/db/db';
import { PageHeader, SectionHeader, StatusBadge } from '@/components/ui';
import { useToast } from '@/components/ui/Toast';
import { useAcademicYears, useSemesters, useSettings, useSubjects } from '@/hooks/data';
import { updateSettings } from '@/db/repo';
import { newId } from '@/lib/id';
import { fmtDayShort, toDateISO } from '@/lib/dates';
import { addWeeks } from 'date-fns';

const YEAR_OPTIONS = ['BUT 1', 'BUT 2', 'BUT 3', 'Autre'];
const TRACKS = ['Administration et justice', 'Entreprise et association', 'Patrimoine et finance'];

export default function MyYearPage() {
  const settings = useSettings();
  const years = useAcademicYears();
  const semesters = useSemesters();
  const subjects = useSubjects(true);
  const { toast } = useToast();
  const [newSemester, setNewSemester] = useState('');

  if (!settings) return null;

  const showTracks = settings.yearLabel === 'BUT 2' || settings.yearLabel === 'BUT 3';

  return (
    <>
      <PageHeader
        title="Mon année"
        subtitle="Tu peux tout changer : rien n’est figé sur une formation précise."
      />

      <div className="space-y-8">
        <section>
          <SectionHeader title="Ma formation" />
          <div className="space-y-4 rounded-2xl border border-line bg-surface p-4">
            <div>
              <label className="label" htmlFor="my-program">
                Formation
              </label>
              <input
                id="my-program"
                className="field"
                value={settings.program}
                onChange={(event) => void updateSettings({ program: event.target.value })}
              />
            </div>

            <div>
              <span className="label">Année</span>
              <div className="flex flex-wrap gap-2">
                {YEAR_OPTIONS.map((option) => (
                  <button
                    key={option}
                    type="button"
                    aria-pressed={settings.yearLabel === option}
                    onClick={() => void updateSettings({ yearLabel: option })}
                    className={
                      settings.yearLabel === option
                        ? 'chip border-primary-line bg-primary-soft text-accent'
                        : 'chip text-muted hover:bg-surface2'
                    }
                  >
                    {option}
                  </button>
                ))}
              </div>
            </div>

            {showTracks ? (
              <div>
                <span className="label">Parcours (facultatif)</span>
                <div className="flex flex-wrap gap-2">
                  {TRACKS.map((option) => (
                    <button
                      key={option}
                      type="button"
                      aria-pressed={settings.track === option}
                      onClick={() =>
                        void updateSettings({
                          track: settings.track === option ? undefined : option,
                        })
                      }
                      className={
                        settings.track === option
                          ? 'chip border-primary-line bg-primary-soft text-accent'
                          : 'chip text-muted hover:bg-surface2'
                      }
                    >
                      {option}
                    </button>
                  ))}
                </div>
                <p className="mt-1.5 text-[12px] text-muted">
                  Aucun parcours n’est obligatoire : laisse vide si tu ne l’as pas encore choisi.
                </p>
              </div>
            ) : null}

            <div>
              <label className="label" htmlFor="my-semester">
                Semestre actuel
              </label>
              <select
                id="my-semester"
                className="field max-w-sm"
                value={settings.currentSemesterId ?? ''}
                onChange={(event) =>
                  void updateSettings({ currentSemesterId: event.target.value || null })
                }
              >
                <option value="">Aucun</option>
                {(semesters ?? []).map((semester) => {
                  const year = (years ?? []).find((item) => item.id === semester.academicYearId);
                  return (
                    <option key={semester.id} value={semester.id}>
                      {semester.label} — {year?.label ?? ''}
                    </option>
                  );
                })}
              </select>
            </div>
          </div>
        </section>

        <section>
          <SectionHeader
            title="Années et semestres"
            subtitle="Archiver ne supprime rien : les anciennes données restent consultables."
          />
          <div className="space-y-4">
            {(years ?? []).map((year) => (
              <div key={year.id} className="rounded-2xl border border-line bg-surface p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="text-[15px] font-semibold text-ink">{year.label}</p>
                    <p className="text-[12px] text-muted">{year.yearLabel}</p>
                  </div>
                  <button
                    type="button"
                    className="btn-ghost text-[13px]"
                    onClick={async () => {
                      await db.academicYears.update(year.id, { isArchived: !year.isArchived });
                      toast(year.isArchived ? 'Année réactivée' : 'Année archivée');
                    }}
                  >
                    {year.isArchived ? <ArchiveRestore size={15} /> : <Archive size={15} />}
                    {year.isArchived ? 'Réactiver' : 'Archiver'}
                  </button>
                </div>
                <ul className="mt-3 space-y-2">
                  {(semesters ?? [])
                    .filter((semester) => semester.academicYearId === year.id)
                    .map((semester) => {
                      const isCurrent = settings.currentSemesterId === semester.id;
                      const count = (subjects ?? []).filter(
                        (subject) => subject.semesterId === semester.id,
                      ).length;
                      return (
                        <li
                          key={semester.id}
                          className="flex flex-wrap items-center gap-3 rounded-xl bg-surface2/60 px-3 py-2.5"
                        >
                          <span className="min-w-0 flex-1">
                            <span className="block text-[14px] font-medium text-ink">
                              {semester.label}
                            </span>
                            <span className="block text-[12px] text-muted">
                              {fmtDayShort(semester.startDate)} → {fmtDayShort(semester.endDate)} ·{' '}
                              {count} matière{count > 1 ? 's' : ''}
                            </span>
                          </span>
                          {isCurrent ? <StatusBadge tone="primary">Actuel</StatusBadge> : null}
                          {semester.isArchived ? <StatusBadge>Archivé</StatusBadge> : null}
                          {!isCurrent ? (
                            <button
                              type="button"
                              className="btn-ghost text-[13px]"
                              onClick={() => void updateSettings({ currentSemesterId: semester.id })}
                            >
                              Définir comme actuel
                            </button>
                          ) : null}
                          <button
                            type="button"
                            className="btn-ghost text-[13px]"
                            onClick={async () => {
                              await db.semesters.update(semester.id, {
                                isArchived: !semester.isArchived,
                              });
                              toast(semester.isArchived ? 'Semestre réactivé' : 'Semestre archivé');
                            }}
                          >
                            {semester.isArchived ? 'Réactiver' : 'Archiver'}
                          </button>
                        </li>
                      );
                    })}
                </ul>

                <form
                  className="mt-3 flex gap-2"
                  onSubmit={async (event) => {
                    event.preventDefault();
                    if (!newSemester.trim()) return;
                    const last = (semesters ?? [])
                      .filter((semester) => semester.academicYearId === year.id)
                      .slice(-1)[0];
                    const start = last ? new Date(`${last.endDate}T12:00`) : new Date();
                    await db.semesters.put({
                      id: newId('sem'),
                      academicYearId: year.id,
                      label: newSemester.trim(),
                      number: (last?.number ?? 0) + 1,
                      startDate: toDateISO(start),
                      endDate: toDateISO(addWeeks(start, 18)),
                      isArchived: false,
                    });
                    setNewSemester('');
                    toast('Semestre ajouté');
                  }}
                >
                  <input
                    className="field"
                    placeholder="Ajouter un semestre (ex. Semestre 3)"
                    value={newSemester}
                    onChange={(event) => setNewSemester(event.target.value)}
                    aria-label="Nom du nouveau semestre"
                  />
                  <button type="submit" className="btn-soft shrink-0">
                    <Plus size={16} />
                  </button>
                </form>
              </div>
            ))}

            <button
              type="button"
              className="btn-outline w-full justify-center"
              onClick={async () => {
                const start = new Date();
                const startYear = start.getMonth() >= 6 ? start.getFullYear() : start.getFullYear() - 1;
                await db.academicYears.put({
                  id: newId('yr'),
                  label: `${startYear + 1} / ${startYear + 2}`,
                  startDate: toDateISO(start),
                  endDate: toDateISO(addWeeks(start, 40)),
                  yearLabel: settings.yearLabel,
                  isArchived: false,
                });
                toast('Année universitaire ajoutée');
              }}
            >
              <Plus size={16} />
              Ajouter une année universitaire
            </button>
          </div>
        </section>
      </div>
    </>
  );
}
