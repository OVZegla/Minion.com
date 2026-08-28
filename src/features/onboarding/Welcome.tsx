'use client';

import { useEffect, useState } from 'react';
import { Sparkles } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { useSettings } from '@/hooks/data';
import { updateSettings } from '@/db/repo';
import { OnboardingWizard } from './OnboardingWizard';

/**
 * Premier lancement : la demo est deja chargee, on propose donc soit de la
 * decouvrir, soit de configurer directement sa propre annee.
 */
export function Welcome() {
  const settings = useSettings();
  const [open, setOpen] = useState(false);
  const [wizard, setWizard] = useState(false);

  useEffect(() => {
    if (settings && settings.onboardingDone === false) setOpen(true);
  }, [settings]);

  const finish = async () => {
    await updateSettings({ onboardingDone: true });
    setOpen(false);
  };

  if (wizard) {
    return (
      <OnboardingWizard
        open
        onClose={() => {
          setWizard(false);
          void finish();
        }}
      />
    );
  }

  return (
    <Modal open={open} onClose={finish} title="Bienvenue sur minion.com 👋" size="sm">
      <div className="space-y-5">
        <p className="text-[15px] leading-relaxed text-muted">
          Ton espace pour organiser tes cours, tes révisions et tes études.
        </p>
        <div className="rounded-2xl border border-[color:var(--primary-line)] bg-primary-soft p-4">
          <p className="flex items-center gap-2 text-[13px] font-semibold text-accent">
            <Sparkles size={15} />
            Des données d’exemple sont déjà là
          </p>
          <p className="mt-1 text-[13px] leading-relaxed text-accent/90">
            Une semaine type, des matières, un partiel, des fiches… Tout est fictif : tu peux
            explorer, puis tout remplacer par tes vraies données quand tu veux.
          </p>
        </div>
        <div className="flex flex-col gap-2">
          <button type="button" className="btn-primary w-full" onClick={finish}>
            Commencer
          </button>
          <button type="button" className="btn-outline w-full" onClick={() => setWizard(true)}>
            Configurer mon année tout de suite
          </button>
        </div>
      </div>
    </Modal>
  );
}
