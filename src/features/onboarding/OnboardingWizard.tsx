'use client';

import { useState } from 'react';
import clsx from 'clsx';
import { Check } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { db } from '@/db/db';
import { clearAllData, createChapter, createSubject, updateSettings } from '@/db/repo';
import { seedDemoData } from '@/db/seed';
import { SEED_SUBJECTS } from '@/db/seed/data';
import { defaultSettings } from '@/db/defaults';
import { newId } from '@/lib/id';
import { toDateISO, weekStart } from '@/lib/dates';
import { addWeeks, subWeeks } from 'date-fns';
import { useToast } from '@/components/ui/Toast';

const YEARS = ['BUT 1', 'BUT 2', 'BUT 3', 'Autre'];
const SEMESTERS = ['S1', 'S2', 'S3', 'S4', 'S5', 'S6'];
const TRACKS = ['Administration et justice', 'Entreprise et association', 'Patrimoine et finance'];

type Choice = 'suggested' | 'own' | 'demo';

/** Assistant de configuration en 5 etapes. Rien n'est impose. */
export function OnboardingWizard({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { toast } = useToast();
  const [step, setStep] = useState(0);
  const [displayName, setDisplayName] = useState('Einat');
  const [program, setProgram] = useState('BUT Carrières Juridiques');
  const [yearLabel, setYearLabel] = useState('BUT 1');
  const [track, setTrack] = useState<string>('');
  const [semester, setSemester] = useState('S1');
  const [choice, setChoice] = useState<Choice>('suggested');
  const [selected, setSelected] = useState<string[]>(SEED_SUBJECTS.map((s) => s.key));
  const [busy, setBusy] = useState(false);

  const totalSteps = 5;

  const apply = async () => {
    setBusy(true);
    try {
      if (choice === 'demo') {
        await seedDemoData(new Date(), { onboarded: true });
        await updateSettings({ displayName, program, yearLabel, track: track || undefined });
        toast('Données d’exemple rechargées');
        onClose();
        return;
      }

      await clearAllData();
      const start = weekStart(subWeeks(new Date(), 1));
      const yearStartYear = start.getMonth() >= 6 ? start.getFullYear() : start.getFullYear() - 1;
      const yearId = newId('yr');
      const semesterId = newId('sem');

      await db.academicYears.put({
        id: yearId,
        label: `${yearStartYear} / ${yearStartYear + 1}`,
        startDate: toDateISO(start),
        endDate: toDateISO(addWeeks(start, 40)),
        yearLabel,
        isArchived: false,
      });
      await db.semesters.put({
        id: semesterId,
        academicYearId: yearId,
        label: `Semestre ${semester.replace('S', '')}`,
        number: Number(semester.replace('S', '')) || 1,
        startDate: toDateISO(start),
        endDate: toDateISO(addWeeks(start, 18)),
        isArchived: false,
      });
      await db.settings.put(
        defaultSettings({
          displayName,
          program,
          yearLabel,
          track: track || undefined,
          currentAcademicYearId: yearId,
          currentSemesterId: semesterId,
          onboardingDone: true,
          demoDataLoaded: false,
        }),
      );

      if (choice === 'suggested') {
        for (const seed of SEED_SUBJECTS.filter((s) => selected.includes(s.key))) {
          const subjectId = await createSubject({
            name: seed.name,
            shortName: seed.shortName,
            color: seed.color,
            icon: seed.icon,
            description: seed.description,
            semesterId,
            academicYearId: yearId,
          });
          for (const [index, chapter] of seed.chapters.entries()) {
            await createChapter(subjectId, chapter.title, index);
          }
        }
      }

      toast('Tout est prêt ✨');
      onClose();
    } finally {
      setBusy(false);
    }
  };

  const next = () => setStep((value) => Math.min(value + 1, totalSteps - 1));
  const back = () => setStep((value) => Math.max(value - 1, 0));

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Configurer mon année"
      description={`Étape ${step + 1} sur ${totalSteps}`}
      footer={
        <>
          {step > 0 ? (
            <button type="button" className="btn-outline" onClick={back} disabled={busy}>
              Retour
            </button>
          ) : null}
          {step < totalSteps - 1 ? (
            <button type="button" className="btn-primary" onClick={next}>
              Continuer
            </button>
          ) : (
            <button type="button" className="btn-primary" onClick={apply} disabled={busy}>
              {busy ? 'Un instant…' : 'Terminer'}
            </button>
          )}
        </>
      }
    >
      <div className="space-y-4">
        <div className="flex gap-1.5" aria-hidden>
          {Array.from({ length: totalSteps }).map((_, index) => (
            <span
              key={index}
              className={clsx(
                'h-1 flex-1 rounded-full transition',
                index <= step ? 'bg-primary' : 'bg-surface2',
              )}
            />
          ))}
        </div>

        {step === 0 ? (
          <div className="space-y-4">
            <div>
              <label className="label" htmlFor="ob-name">
                Ton prénom
              </label>
              <input
                id="ob-name"
                className="field"
                value={displayName}
                placeholder="Affiché sur l’accueil"
                onChange={(event) => setDisplayName(event.target.value)}
              />
            </div>
            <div>
            <label className="label" htmlFor="ob-program">
              Ta formation
            </label>
            <input
              id="ob-program"
              className="field"
              value={program}
              onChange={(event) => setProgram(event.target.value)}
            />
            <p className="mt-1.5 text-xs text-muted">Tu peux mettre n’importe quelle formation.</p>
            </div>
          </div>
        ) : null}

        {step === 1 ? (
          <div className="space-y-3">
            <span className="label">Ton année</span>
            <div className="flex flex-wrap gap-2">
              {YEARS.map((year) => (
                <button
                  key={year}
                  type="button"
                  aria-pressed={yearLabel === year}
                  onClick={() => setYearLabel(year)}
                  className={
                    yearLabel === year
                      ? 'chip border-[color:var(--primary-line)] bg-primary-soft text-accent'
                      : 'chip text-muted hover:bg-surface2'
                  }
                >
                  {year}
                </button>
              ))}
            </div>
            {(yearLabel === 'BUT 2' || yearLabel === 'BUT 3') && (
              <div className="rounded-xl border border-line p-3">
                <span className="label">Parcours (facultatif)</span>
                <div className="flex flex-wrap gap-2">
                  {TRACKS.map((option) => (
                    <button
                      key={option}
                      type="button"
                      aria-pressed={track === option}
                      onClick={() => setTrack(track === option ? '' : option)}
                      className={
                        track === option
                          ? 'chip border-[color:var(--primary-line)] bg-primary-soft text-accent'
                          : 'chip text-muted hover:bg-surface2'
                      }
                    >
                      {option}
                    </button>
                  ))}
                </div>
                <p className="mt-2 text-xs text-muted">Tu peux laisser vide.</p>
              </div>
            )}
          </div>
        ) : null}

        {step === 2 ? (
          <div>
            <span className="label">Ton semestre</span>
            <div className="flex flex-wrap gap-2">
              {SEMESTERS.map((option) => (
                <button
                  key={option}
                  type="button"
                  aria-pressed={semester === option}
                  onClick={() => setSemester(option)}
                  className={
                    semester === option
                      ? 'chip border-[color:var(--primary-line)] bg-primary-soft text-accent'
                      : 'chip text-muted hover:bg-surface2'
                  }
                >
                  {option}
                </button>
              ))}
            </div>
          </div>
        ) : null}

        {step === 3 ? (
          <div className="space-y-3">
            <span className="label">Tes matières</span>
            <div className="space-y-2">
              {(
                [
                  { value: 'suggested', label: 'Utiliser les matières proposées', hint: 'Tu peux les décocher une par une.' },
                  { value: 'own', label: 'Créer les miennes', hint: 'On part d’un espace vide.' },
                  { value: 'demo', label: 'Garder les données d’exemple', hint: 'Emploi du temps, examens, fiches…' },
                ] as { value: Choice; label: string; hint: string }[]
              ).map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setChoice(option.value)}
                  className={clsx(
                    'flex w-full items-start gap-3 rounded-xl border p-3 text-left transition',
                    choice === option.value
                      ? 'border-[color:var(--primary-line)] bg-primary-soft'
                      : 'border-line hover:bg-surface2',
                  )}
                >
                  <span
                    className={clsx(
                      'mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border',
                      choice === option.value ? 'border-transparent bg-primary' : 'border-line',
                    )}
                  >
                    {choice === option.value ? <Check size={11} strokeWidth={3} /> : null}
                  </span>
                  <span>
                    <span className="block text-sm font-semibold text-ink">{option.label}</span>
                    <span className="block text-xs text-muted">{option.hint}</span>
                  </span>
                </button>
              ))}
            </div>

            {choice === 'suggested' ? (
              <div className="max-h-52 space-y-1 overflow-y-auto rounded-xl border border-line p-3">
                {SEED_SUBJECTS.map((seed) => (
                  <label key={seed.key} className="flex items-center gap-2 text-sm text-ink">
                    <input
                      type="checkbox"
                      className="h-4 w-4 accent-[color:var(--primary)]"
                      checked={selected.includes(seed.key)}
                      onChange={(event) =>
                        setSelected((current) =>
                          event.target.checked
                            ? [...current, seed.key]
                            : current.filter((key) => key !== seed.key),
                        )
                      }
                    />
                    {seed.name}
                  </label>
                ))}
              </div>
            ) : null}
          </div>
        ) : null}

        {step === 4 ? (
          <div className="space-y-3">
            <p className="text-sm text-muted">
              Dernière étape : l’emploi du temps. Tu peux le créer maintenant depuis le calendrier
              (les cours hebdomadaires se répètent automatiquement), ou le faire plus tard.
            </p>
            <div className="rounded-2xl border border-[color:var(--primary-line)] bg-primary-soft p-4 text-[13px] text-accent">
              Tout est prêt ✨ — tu pourras ajuster ta formation, ton année et ton semestre à tout
              moment dans « Mon année ».
            </div>
            {choice === 'own' ? (
              <p className="text-xs text-muted">
                Aucune matière ne sera créée : tu ajouteras les tiennes avec le bouton « Ajouter ».
              </p>
            ) : null}
            {choice !== 'demo' ? (
              <p className="text-xs text-[color:var(--danger)]">
                Attention : les données actuelles (dont l’exemple) seront remplacées.
              </p>
            ) : null}
          </div>
        ) : null}
      </div>
    </Modal>
  );
}
