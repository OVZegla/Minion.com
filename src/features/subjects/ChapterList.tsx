'use client';

import { useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { db } from '@/db/db';
import { createChapter, deleteChapterCascade } from '@/db/repo';
import { nowISO } from '@/lib/dates';
import { nextMastery } from '@/lib/progress';
import { MasteryPill } from '@/components/ui';
import { ConfirmDialog } from '@/components/ui/Modal';
import { useToast } from '@/components/ui/Toast';
import type { Chapter } from '@/types';

/** Liste des chapitres : l'etat de maitrise se change en un clic. */
export function ChapterList({ subjectId, chapters }: { subjectId: string; chapters: Chapter[] }) {
  const { toast, toastUndo } = useToast();
  const [adding, setAdding] = useState(false);
  const [title, setTitle] = useState('');
  const [toDelete, setToDelete] = useState<Chapter | null>(null);

  const cycle = async (chapter: Chapter) => {
    const level = nextMastery(chapter.mastery);
    await db.chapters.update(chapter.id, { mastery: level, updatedAt: nowISO() });
  };

  return (
    <div className="space-y-2">
      {chapters.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-line px-4 py-6 text-center text-sm text-muted">
          Aucun chapitre pour l’instant. Ajoute-les pour suivre ta progression.
        </p>
      ) : (
        <ol className="space-y-2">
          {chapters.map((chapter, index) => (
            <li
              key={chapter.id}
              className="group flex items-center gap-3 rounded-2xl border border-line bg-surface px-3.5 py-3"
            >
              <span
                aria-hidden
                className="w-5 shrink-0 text-center text-[13px] font-semibold tabular-nums text-muted"
              >
                {index + 1}
              </span>
              <p className="min-w-0 flex-1 truncate text-[14px] font-medium text-ink">
                {chapter.title}
              </p>
              <MasteryPill level={chapter.mastery} onClick={() => void cycle(chapter)} />
              <button
                type="button"
                onClick={() => setToDelete(chapter)}
                className="btn-ghost h-8 w-8 shrink-0 rounded-lg p-0 opacity-0 transition group-hover:opacity-100 focus-visible:opacity-100"
                aria-label={`Supprimer le chapitre ${chapter.title}`}
              >
                <Trash2 size={15} />
              </button>
            </li>
          ))}
        </ol>
      )}

      {adding ? (
        <form
          className="flex gap-2"
          onSubmit={async (event) => {
            event.preventDefault();
            if (!title.trim()) return;
            await createChapter(subjectId, title.trim());
            setTitle('');
            toast('Chapitre ajouté');
          }}
        >
          <input
            className="field"
            autoFocus
            value={title}
            placeholder="Titre du chapitre"
            onChange={(event) => setTitle(event.target.value)}
          />
          <button type="submit" className="btn-primary shrink-0">
            Ajouter
          </button>
          <button
            type="button"
            className="btn-ghost shrink-0"
            onClick={() => {
              setAdding(false);
              setTitle('');
            }}
          >
            Fermer
          </button>
        </form>
      ) : (
        <button type="button" className="btn-soft w-full justify-center" onClick={() => setAdding(true)}>
          <Plus size={16} />
          Ajouter un chapitre
        </button>
      )}

      <ConfirmDialog
        open={Boolean(toDelete)}
        onClose={() => setToDelete(null)}
        title="Supprimer ce chapitre ?"
        message="Les cours et fiches rattachés ne seront pas supprimés : ils seront simplement détachés de ce chapitre."
        onConfirm={async () => {
          if (!toDelete) return;
          const snapshot = toDelete;
          await deleteChapterCascade(snapshot.id);
          toastUndo('Chapitre supprimé', async () => {
            await db.chapters.put(snapshot);
          });
        }}
      />
    </div>
  );
}
