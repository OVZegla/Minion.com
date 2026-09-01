'use client';

import clsx from 'clsx';
import { FileDown } from 'lucide-react';
import { useState } from 'react';
import { useToast } from '@/components/ui/Toast';
import { exportPdf, isDesktop, revealLocalFile } from '@/lib/desktop';
import { safeFileName } from '@/lib/library';

/**
 * Export PDF d'une page.
 *
 * Dans l'application de bureau, le fichier est écrit directement dans les
 * dossiers de l'utilisatrice, au même endroit que ses documents. Sur le web,
 * on ouvre la boîte d'impression du navigateur, qui sait enregistrer en PDF.
 *
 * Dans les deux cas c'est la mise en page d'impression qui est utilisée :
 * la barre latérale, les boutons et les menus n'apparaissent pas.
 */
export function ExportPdfButton({
  folder,
  fileName,
  label = 'Exporter en PDF',
  className,
}: {
  folder: string;
  fileName: string;
  label?: string;
  className?: string;
}) {
  const { toast } = useToast();
  const [busy, setBusy] = useState(false);

  return (
    <button
      type="button"
      className={clsx('btn-soft', className)}
      disabled={busy}
      title={
        isDesktop()
          ? 'Enregistre un PDF dans tes dossiers'
          : 'Ouvre l’impression : choisis « Enregistrer au format PDF »'
      }
      onClick={async () => {
        setBusy(true);
        try {
          const name = safeFileName(fileName.endsWith('.pdf') ? fileName : `${fileName}.pdf`);
          const result = await exportPdf(folder, name);
          if (result) {
            toast('PDF enregistré');
            await revealLocalFile(result.path);
          } else {
            window.print();
          }
        } finally {
          setBusy(false);
        }
      }}
    >
      <FileDown size={16} />
      {busy ? 'Export…' : label}
    </button>
  );
}
