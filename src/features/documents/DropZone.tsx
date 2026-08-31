'use client';

import { useRef, useState } from 'react';
import { Upload } from 'lucide-react';
import { db } from '@/db/db';
import { ALLOWED_MIME } from '@/db/backup';
import { detectKind } from '@/features/quick-add/forms';
import { useToast } from '@/components/ui/Toast';
import { fileDocument } from './filing';
import { isDesktop } from '@/lib/desktop';
import { newId } from '@/lib/id';
import { nowISO } from '@/lib/dates';

const MAX_BYTES = 15 * 1024 * 1024;

/**
 * Depot de fichiers.
 * Les fichiers sont stockes localement (IndexedDB) : aucune cle API, aucun
 * service externe. `storageRef` est prevu pour un stockage cloud ulterieur.
 */
export function DropZone({
  subjectId,
  courseId,
}: {
  subjectId?: string | null;
  courseId?: string | null;
}) {
  const { toast } = useToast();
  const [over, setOver] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setError(null);
    let added = 0;
    let folder: string | null = null;
    for (const file of Array.from(files)) {
      if (!ALLOWED_MIME.includes(file.type)) {
        setError(`« ${file.name} » : format non autorisé.`);
        continue;
      }
      if (file.size > MAX_BYTES) {
        setError(`« ${file.name} » dépasse 15 Mo.`);
        continue;
      }
      const id = newId('doc');
      await db.documents.put({
        id,
        name: file.name,
        kind: detectKind(file),
        size: file.size,
        mimeType: file.type,
        blob: file,
        storageRef: null,
        localPath: null,
        subjectId: subjectId ?? null,
        courseId: courseId ?? null,
        favorite: false,
        createdAt: nowISO(),
      });
      // Classement automatique dans les dossiers de l'ordinateur.
      const result = await fileDocument(id);
      if (result?.path) folder = result.folder;
      added += 1;
    }
    if (added > 0) {
      const label = `${added} document${added > 1 ? 's' : ''} ajouté${added > 1 ? 's' : ''}`;
      toast(folder ? `${label} — rangé dans ${folder}` : label);
    }
  };

  return (
    <div>
      <div
        onDragOver={(event) => {
          event.preventDefault();
          setOver(true);
        }}
        onDragLeave={() => setOver(false)}
        onDrop={(event) => {
          event.preventDefault();
          setOver(false);
          void handleFiles(event.dataTransfer.files);
        }}
        className={`flex flex-col items-center justify-center rounded-2xl border-2 border-dashed px-6 py-8 text-center transition ${
          over ? 'border-primary bg-primary-soft' : 'border-line bg-surface/60'
        }`}
      >
        <Upload size={22} className="mb-2 text-muted" />
        <p className="text-[15px] font-medium text-ink">Dépose tes fichiers ici</p>
        <p className="mt-0.5 text-[13px] text-muted">PDF, image, Word, PowerPoint, Excel — 15 Mo max.</p>
        {isDesktop() ? (
          <p className="mt-1 text-[12px] text-accent">
            Ils seront rangés automatiquement dans tes dossiers.
          </p>
        ) : null}
        <button type="button" className="btn-soft mt-3" onClick={() => inputRef.current?.click()}>
          Choisir un fichier
        </button>
        <input
          ref={inputRef}
          type="file"
          multiple
          className="sr-only"
          accept={ALLOWED_MIME.join(',')}
          onChange={(event) => void handleFiles(event.target.files)}
          aria-label="Choisir un fichier"
        />
      </div>
      {error ? <p className="mt-2 text-sm text-[color:var(--danger)]">{error}</p> : null}
    </div>
  );
}
