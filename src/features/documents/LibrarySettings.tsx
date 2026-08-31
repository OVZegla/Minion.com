'use client';

import { useEffect, useState } from 'react';
import { FolderOpen, RefreshCw } from 'lucide-react';
import { SectionHeader } from '@/components/ui';
import { useToast } from '@/components/ui/Toast';
import {
  chooseLibraryRoot,
  getLibraryConfig,
  isDesktop,
  openLibraryRoot,
  setLibraryEnabled,
  type LibraryConfig,
} from '@/lib/desktop';
import { refileAll } from './filing';

/**
 * Réglages du classement automatique des documents.
 * Cette section n'existe que dans l'application de bureau : un navigateur
 * n'a pas le droit d'écrire dans les dossiers de l'ordinateur.
 */
export function LibrarySettings() {
  const { toast } = useToast();
  const [config, setConfig] = useState<LibraryConfig | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!isDesktop()) return;
    void getLibraryConfig().then(setConfig);
  }, []);

  if (!isDesktop()) return null;

  return (
    <section>
      <SectionHeader
        title="Mes fichiers sur l’ordinateur"
        subtitle="Chaque document ajouté est rangé automatiquement dans un dossier, par matière et par chapitre."
      />
      <div className="space-y-4 rounded-2xl border border-line bg-surface p-4">
        <label className="flex items-start gap-3 text-[14px] text-ink">
          <input
            type="checkbox"
            className="mt-0.5 h-4 w-4 accent-[color:var(--primary)]"
            checked={config?.enabled ?? true}
            onChange={async (event) => {
              const next = await setLibraryEnabled(event.target.checked);
              if (next) setConfig(next);
              toast(event.target.checked ? 'Classement activé' : 'Classement désactivé');
            }}
          />
          <span>
            Ranger automatiquement mes documents dans mes dossiers
            <span className="mt-0.5 block text-[12px] text-muted">
              Décoché, les documents restent uniquement dans l’application.
            </span>
          </span>
        </label>

        <div>
          <span className="label">Dossier de destination</span>
          <p className="break-all rounded-xl border border-line bg-surface2/60 px-3 py-2 font-mono text-[12px] text-ink">
            {config?.root ?? '…'}
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            <button
              type="button"
              className="btn-outline"
              onClick={async () => {
                const next = await chooseLibraryRoot();
                if (next) {
                  setConfig(next);
                  toast('Dossier mis à jour');
                }
              }}
            >
              Changer de dossier
            </button>
            <button
              type="button"
              className="btn-outline"
              onClick={async () => {
                await openLibraryRoot();
              }}
            >
              <FolderOpen size={16} />
              Ouvrir le dossier
            </button>
            <button
              type="button"
              className="btn-soft"
              disabled={busy}
              onClick={async () => {
                setBusy(true);
                try {
                  const summary = await refileAll();
                  toast(
                    `${summary.filed} document${summary.filed > 1 ? 's' : ''} rangé${
                      summary.filed > 1 ? 's' : ''
                    }`,
                  );
                } finally {
                  setBusy(false);
                }
              }}
            >
              <RefreshCw size={16} />
              {busy ? 'Rangement…' : 'Tout reclasser'}
            </button>
          </div>
        </div>

        <div className="rounded-xl bg-surface2/60 px-3 py-2.5 text-[12px] leading-relaxed text-muted">
          <p className="font-medium text-ink">Comment c’est rangé</p>
          <p className="mt-1 font-mono">
            cours/droit-des-affaires-chapitre1/CM03.pdf
            <br />
            fiches/droit-constitutionnel/les-sources.pdf
            <br />
            examens/comptabilite-generale/annales.pdf
          </p>
          <p className="mt-1.5">
            Le chapitre vient du cours auquel le document est rattaché. Sans cours,
            le document est rangé dans le dossier de la matière.
          </p>
        </div>
      </div>
    </section>
  );
}
