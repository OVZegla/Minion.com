'use client';

import { useRef, useState } from 'react';
import Link from 'next/link';
import {
  Download,
  Moon,
  RefreshCw,
  Sun,
  Trash2,
  Upload,
  Monitor,
} from 'lucide-react';
import { PageHeader, SectionHeader } from '@/components/ui';
import { ConfirmDialog, Modal } from '@/components/ui/Modal';
import { useToast } from '@/components/ui/Toast';
import { useThemeMode } from '@/components/layout/AppProviders';
import { useSettings } from '@/hooks/data';
import { updateSettings, clearAllData } from '@/db/repo';
import { seedDemoData } from '@/db/seed';
import { downloadBackup, parseBackup, restoreBackup, type ParsedBackup } from '@/db/backup';
import { OnboardingWizard } from '@/features/onboarding/OnboardingWizard';
import { LibrarySettings } from '@/features/documents/LibrarySettings';
import type { NotifCategory, ThemeMode } from '@/types';

const NOTIF_LABELS: Record<keyof NonNullable<ReturnType<typeof useSettings>>['notifications'], string> = {
  courses: 'Cours',
  tasks: 'Devoirs',
  exams: 'Examens',
  revisions: 'Révisions',
  sae: 'SAÉ',
};

export default function SettingsPage() {
  const settings = useSettings();
  const { mode, setMode } = useThemeMode();
  const { toast } = useToast();
  const fileRef = useRef<HTMLInputElement>(null);

  const [confirmReset, setConfirmReset] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);
  const [pendingImport, setPendingImport] = useState<ParsedBackup | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const [wizard, setWizard] = useState(false);

  if (!settings) return null;

  return (
    <>
      <PageHeader title="Paramètres" />

      <div className="space-y-8">
        {/* ------------------------- Apparence ------------------------- */}
        <section>
          <SectionHeader title="Apparence" />
          <div className="rounded-2xl border border-line bg-surface p-4">
            <span className="label">Thème</span>
            <div className="flex flex-wrap gap-2">
              {(
                [
                  { value: 'light' as ThemeMode, label: 'Clair', icon: Sun },
                  { value: 'dark' as ThemeMode, label: 'Sombre', icon: Moon },
                  { value: 'system' as ThemeMode, label: 'Système', icon: Monitor },
                ]
              ).map((option) => (
                <button
                  key={option.value}
                  type="button"
                  aria-pressed={mode === option.value}
                  onClick={() => setMode(option.value)}
                  className={
                    mode === option.value
                      ? 'chip border-primary-line bg-primary-soft text-accent'
                      : 'chip text-muted hover:bg-surface2'
                  }
                >
                  <option.icon size={14} />
                  {option.label}
                </button>
              ))}
            </div>

            <label className="mt-4 flex items-start gap-3 rounded-xl border border-line p-3 text-[14px] text-ink">
              <input
                type="checkbox"
                className="mt-0.5 h-4 w-4 accent-[color:var(--primary)]"
                checked={settings.showAppName}
                onChange={(event) => void updateSettings({ showAppName: event.target.checked })}
              />
              <span>
                Afficher le nom « minion.com » en haut de l’application
                <span className="mt-0.5 block text-[12px] text-muted">
                  Décoché, seule la pastille reste visible — plus discret en cours.
                </span>
              </span>
            </label>

            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <div>
                <label className="label" htmlFor="st-name">
                  Ton prénom (facultatif)
                </label>
                <input
                  id="st-name"
                  className="field"
                  value={settings.displayName}
                  placeholder="Affiché sur l’accueil"
                  onChange={(event) => void updateSettings({ displayName: event.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label" htmlFor="st-start">
                    Journée de
                  </label>
                  <input
                    id="st-start"
                    type="number"
                    min={0}
                    max={23}
                    className="field"
                    value={settings.dayStartHour}
                    onChange={(event) =>
                      void updateSettings({ dayStartHour: Number(event.target.value) })
                    }
                  />
                </div>
                <div>
                  <label className="label" htmlFor="st-end">
                    à
                  </label>
                  <input
                    id="st-end"
                    type="number"
                    min={1}
                    max={24}
                    className="field"
                    value={settings.dayEndHour}
                    onChange={(event) =>
                      void updateSettings({ dayEndHour: Number(event.target.value) })
                    }
                  />
                </div>
              </div>
            </div>
            <p className="mt-2 text-[12px] text-muted">
              Ces heures définissent la plage affichée dans le calendrier.
            </p>
          </div>
        </section>

        {/* ----------------------- Notifications ----------------------- */}
        <section>
          <SectionHeader
            title="Notifications"
            subtitle="Elles sont calculées à partir de tes données, jamais inventées."
          />
          <div className="space-y-1 rounded-2xl border border-line bg-surface p-4">
            {(Object.keys(NOTIF_LABELS) as NotifCategory[]).map((key) => {
              const typedKey = key as keyof typeof settings.notifications;
              return (
                <label key={key} className="flex items-center gap-3 py-1.5 text-[14px] text-ink">
                  <input
                    type="checkbox"
                    className="h-4 w-4 accent-[color:var(--primary)]"
                    checked={settings.notifications[typedKey]}
                    onChange={(event) =>
                      void updateSettings({
                        notifications: {
                          ...settings.notifications,
                          [typedKey]: event.target.checked,
                        },
                      })
                    }
                  />
                  {NOTIF_LABELS[typedKey]}
                </label>
              );
            })}
          </div>
        </section>

        {/* ------------------------ Mon année -------------------------- */}
        <section>
          <SectionHeader title="Ma formation" />
          <div className="rounded-2xl border border-line bg-surface p-4">
            <p className="text-[14px] text-ink">
              {settings.program} · {settings.yearLabel}
              {settings.track ? ` · ${settings.track}` : ''}
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Link href="/mon-annee" className="btn-soft">
                Modifier mon année
              </Link>
              <button type="button" className="btn-outline" onClick={() => setWizard(true)}>
                Relancer la configuration
              </button>
            </div>
          </div>
        </section>

        <LibrarySettings />

        {/* ------------------------ Sauvegarde ------------------------- */}
        <section>
          <SectionHeader
            title="Sauvegarde"
            subtitle="Tes données restent sur cet appareil. Pense à exporter de temps en temps."
          />
          <div className="flex flex-wrap gap-2 rounded-2xl border border-line bg-surface p-4">
            <button
              type="button"
              className="btn-primary"
              onClick={async () => {
                await downloadBackup();
                toast('Sauvegarde téléchargée');
              }}
            >
              <Download size={16} />
              Exporter mes données
            </button>
            <button type="button" className="btn-outline" onClick={() => fileRef.current?.click()}>
              <Upload size={16} />
              Importer une sauvegarde
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="application/json,.json"
              className="sr-only"
              aria-label="Importer une sauvegarde"
              onChange={async (event) => {
                const file = event.target.files?.[0];
                event.target.value = '';
                if (!file) return;
                setImportError(null);
                try {
                  const text = await file.text();
                  setPendingImport(parseBackup(text));
                } catch (error) {
                  setImportError(error instanceof Error ? error.message : 'Import impossible.');
                }
              }}
            />
          </div>
          {importError ? (
            <p className="mt-2 text-sm text-[color:var(--danger)]">{importError}</p>
          ) : null}
        </section>

        {/* ------------------------ Mode démo -------------------------- */}
        <section>
          <SectionHeader
            title="Données de démonstration"
            subtitle="Les données d’exemple sont entièrement fictives."
          />
          <div className="flex flex-wrap gap-2 rounded-2xl border border-line bg-surface p-4">
            <button type="button" className="btn-outline" onClick={() => setConfirmReset(true)}>
              <RefreshCw size={16} />
              Réinitialiser la démo
            </button>
            <button type="button" className="btn-danger" onClick={() => setConfirmClear(true)}>
              <Trash2 size={16} />
              Supprimer toutes les données
            </button>
          </div>
        </section>

        {/* -------------------------- À propos ------------------------- */}
        <section>
          <SectionHeader title="À propos" />
          <div className="rounded-2xl border border-line bg-surface p-4 text-[13px] leading-relaxed text-muted">
            <p>
              minion.com fonctionne entièrement sur ton appareil : aucune connexion, aucun compte,
              aucune donnée envoyée ailleurs. Tout est stocké dans le navigateur (IndexedDB).
            </p>
            <p className="mt-2">
              Les outils juridiques servent uniquement à organiser ton travail universitaire : ils ne
              donnent aucun conseil juridique et ne remplacent ni tes cours ni tes sources
              officielles.
            </p>
          </div>
        </section>
      </div>

      <ConfirmDialog
        open={confirmReset}
        onClose={() => setConfirmReset(false)}
        title="Réinitialiser les données de démonstration ?"
        message="Toutes tes données actuelles seront remplacées par le jeu d’exemple. Pense à exporter avant si tu veux les garder."
        confirmLabel="Réinitialiser"
        onConfirm={async () => {
          await seedDemoData(new Date(), { onboarded: true });
          toast('Démo rechargée');
        }}
      />

      <ConfirmDialog
        open={confirmClear}
        onClose={() => setConfirmClear(false)}
        title="Supprimer toutes les données ?"
        message="Matières, cours, tâches, documents… tout sera effacé de cet appareil. Cette action est définitive."
        confirmLabel="Tout supprimer"
        onConfirm={async () => {
          await clearAllData();
          await updateSettings({ onboardingDone: true, demoDataLoaded: false });
          toast('Données supprimées');
        }}
      />

      <Modal
        open={Boolean(pendingImport)}
        onClose={() => setPendingImport(null)}
        title="Importer cette sauvegarde ?"
        footer={
          <>
            <button type="button" className="btn-outline" onClick={() => setPendingImport(null)}>
              Annuler
            </button>
            <button
              type="button"
              className="btn-primary"
              onClick={async () => {
                if (!pendingImport) return;
                await restoreBackup(pendingImport);
                setPendingImport(null);
                toast('Sauvegarde importée');
              }}
            >
              Remplacer mes données
            </button>
          </>
        }
      >
        {pendingImport ? (
          <div className="space-y-3">
            <p className="rounded-xl bg-[color:var(--danger-soft)] px-3 py-2 text-[13px] text-[color:var(--danger)]">
              Attention : toutes tes données actuelles seront remplacées.
            </p>
            <p className="text-[13px] text-muted">
              Sauvegarde du {pendingImport.summary.exportedAt.replace('T', ' à ')} · version{' '}
              {pendingImport.summary.version} · {pendingImport.summary.files} fichier
              {pendingImport.summary.files > 1 ? 's' : ''}.
            </p>
            <ul className="grid grid-cols-2 gap-x-4 gap-y-1 text-[13px] text-ink">
              {Object.entries(pendingImport.summary.counts)
                .filter(([, count]) => count > 0)
                .map(([table, count]) => (
                  <li key={table} className="flex justify-between">
                    <span className="text-muted">{table}</span>
                    <span className="tabular-nums">{count}</span>
                  </li>
                ))}
            </ul>
          </div>
        ) : null}
      </Modal>

      {wizard ? <OnboardingWizard open onClose={() => setWizard(false)} /> : null}
    </>
  );
}
