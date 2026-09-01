'use client';

import { use, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Copy, Plus, Printer, Star, Trash2, X } from 'lucide-react';
import { db } from '@/db/db';
import { deleteStudySheetCascade, duplicateStudySheet } from '@/db/repo';
import { useChapters, useStudySheet, useSubject, useSubjects } from '@/hooks/data';
import { RichText, RichToolbar } from '@/features/courses/RichText';
import { EmptyState, MasteryPill, SubjectBadge } from '@/components/ui';
import { ConfirmDialog } from '@/components/ui/Modal';
import { useToast } from '@/components/ui/Toast';
import { useAutosave } from '@/hooks/useAutosave';
import { SaveButton } from '@/components/ui/SaveButton';
import { nextMastery } from '@/lib/progress';
import { newId } from '@/lib/id';
import { nowISO } from '@/lib/dates';
import type { StudySheetSection } from '@/types';

export default function SheetPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { toast } = useToast();
  const sheet = useStudySheet(id);
  const subject = useSubject(sheet?.subjectId);
  const chapters = useChapters(sheet?.subjectId);
  const subjects = useSubjects();

  const [title, setTitle] = useState('');
  const [sections, setSections] = useState<StudySheetSection[]>([]);
  const [ready, setReady] = useState(false);
  const [confirm, setConfirm] = useState(false);

  useEffect(() => {
    if (!sheet || ready) return;
    setTitle(sheet.title);
    setSections(sheet.sections);
    setReady(true);
  }, [sheet, ready]);

  const payload = useMemo(() => ({ title, sections }), [title, sections]);
  const autosave = useAutosave(
    payload,
    async (value) => {
      await db.studySheets.update(id, {
        title: value.title.trim() || 'Sans titre',
        sections: value.sections,
        updatedAt: nowISO(),
      });
    },
    { enabled: ready },
  );

  if (sheet === undefined) return null;
  if (!sheet) {
    return (
      <EmptyState
        title="Fiche introuvable"
        action={
          <Link href="/fiches" className="btn-primary">
            Retour aux fiches
          </Link>
        }
      />
    );
  }


  return (
    <>
      <div className="no-print mb-4 flex flex-wrap items-center justify-between gap-2">
        <Link href="/fiches" className="btn-ghost -ml-2 text-[13px]">
          <ArrowLeft size={15} />
          Mes fiches
        </Link>
        <div className="flex items-center gap-1">
          <SaveButton autosave={autosave} />
          <button
            type="button"
            className="btn-ghost h-9 w-9 rounded-xl p-0"
            aria-label={sheet.favorite ? 'Retirer des favoris' : 'Ajouter aux favoris'}
            onClick={async () => {
              await db.studySheets.update(id, { favorite: !sheet.favorite, updatedAt: nowISO() });
            }}
          >
            <Star size={17} className={sheet.favorite ? 'fill-primary text-primary' : ''} />
          </button>
          <button
            type="button"
            className="btn-ghost h-9 w-9 rounded-xl p-0"
            aria-label="Dupliquer la fiche"
            onClick={async () => {
              const copyId = await duplicateStudySheet(id);
              toast('Fiche dupliquée');
              if (copyId) router.push(`/fiches/${copyId}`);
            }}
          >
            <Copy size={17} />
          </button>
          <button
            type="button"
            className="btn-ghost h-9 w-9 rounded-xl p-0"
            aria-label="Imprimer la fiche"
            onClick={() => window.print()}
          >
            <Printer size={17} />
          </button>
          <button
            type="button"
            className="btn-ghost h-9 w-9 rounded-xl p-0"
            aria-label="Supprimer la fiche"
            onClick={() => setConfirm(true)}
          >
            <Trash2 size={17} />
          </button>
        </div>
      </div>

      <header className="mb-6">
        <div className="mb-2 flex flex-wrap items-center gap-2">
          {subject ? (
            <SubjectBadge name={subject.name} color={subject.color} href={`/matieres/${subject.id}`} />
          ) : null}
          <MasteryPill
            level={sheet.mastery}
            onClick={async () => {
              await db.studySheets.update(id, {
                mastery: nextMastery(sheet.mastery),
                updatedAt: nowISO(),
              });
            }}
          />
        </div>
        <input
          className="w-full bg-transparent text-[26px] font-semibold tracking-tight text-ink outline-none sm:text-[30px]"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          aria-label="Titre de la fiche"
        />
        <div className="no-print mt-3 flex flex-wrap gap-2">
          <select
            className="field max-w-[220px]"
            value={sheet.subjectId}
            aria-label="Matière de la fiche"
            onChange={async (event) => {
              // La fiche change de matière : son chapitre appartenait à
              // l'ancienne, on le détache.
              if (!event.target.value) return;
              await db.studySheets.update(id, {
                subjectId: event.target.value,
                chapterId: null,
                updatedAt: nowISO(),
              });
            }}
          >
            {(subjects ?? []).map((entry) => (
              <option key={entry.id} value={entry.id}>
                {entry.name}
              </option>
            ))}
          </select>
          {(chapters ?? []).length > 0 ? (
            <select
              className="field max-w-[220px]"
              value={sheet.chapterId ?? ''}
              aria-label="Chapitre lié"
              onChange={async (event) => {
                await db.studySheets.update(id, {
                  chapterId: event.target.value || null,
                  updatedAt: nowISO(),
                });
              }}
            >
              <option value="">Aucun chapitre</option>
              {(chapters ?? []).map((chapter) => (
                <option key={chapter.id} value={chapter.id}>
                  {chapter.title}
                </option>
              ))}
            </select>
          ) : null}
        </div>
      </header>

      <RichToolbar className="no-print mb-3" />

      <div className="space-y-4">
        {sections.map((section, index) => (
          <section key={section.id} className="rounded-2xl border border-line bg-surface p-4">
            <div className="flex items-center gap-2">
              <input
                className="min-w-0 flex-1 bg-transparent text-[14px] font-semibold uppercase tracking-wide text-accent outline-none"
                value={section.title}
                aria-label={`Titre de la section ${index + 1}`}
                onChange={(event) => {
                  const copy = [...sections];
                  copy[index] = { ...section, title: event.target.value };
                  setSections(copy);
                }}
              />
              <button
                type="button"
                className="no-print btn-ghost h-7 w-7 rounded-lg p-0"
                aria-label={`Supprimer la section ${section.title}`}
                onClick={() => setSections(sections.filter((item) => item.id !== section.id))}
              >
                <X size={14} />
              </button>
            </div>
            <RichText
              className="mt-2 text-[15px] leading-relaxed"
              value={section.content}
              placeholder="Écris ici…"
              ariaLabel={`Contenu de la section ${section.title}`}
              onChange={(content) => {
                const copy = [...sections];
                copy[index] = { ...section, content };
                setSections(copy);
              }}
            />
          </section>
        ))}
      </div>

      <button
        type="button"
        className="no-print btn-soft mt-4 w-full justify-center"
        onClick={() =>
          setSections([...sections, { id: newId('sec'), title: 'Nouvelle section', content: '' }])
        }
      >
        <Plus size={16} />
        Ajouter une section
      </button>

      <ConfirmDialog
        open={confirm}
        onClose={() => setConfirm(false)}
        title="Supprimer cette fiche ?"
        message="Les flashcards et documents liés seront conservés mais détachés."
        onConfirm={async () => {
          await deleteStudySheetCascade(id);
          toast('Fiche supprimée');
          router.push('/fiches');
        }}
      />
    </>
  );
}
