'use client';

import { use, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Star, Trash2 } from 'lucide-react';
import { db } from '@/db/db';
import { deleteCourseCascade } from '@/db/repo';
import { useChapters, useCourse, useSubject } from '@/hooks/data';
import { BlockEditor } from '@/features/courses/BlockEditor';
import { blockToText } from '@/features/courses/blocks';
import { EmptyState, MasteryPill, SubjectBadge } from '@/components/ui';
import { ConfirmDialog } from '@/components/ui/Modal';
import { useToast } from '@/components/ui/Toast';
import { SaveIndicatorLabel, useAutosave } from '@/hooks/useAutosave';
import { nextMastery } from '@/lib/progress';
import { nowISO } from '@/lib/dates';
import type { CourseBlock, CourseKind } from '@/types';

export default function CoursePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { toast } = useToast();
  const course = useCourse(id);
  const subject = useSubject(course?.subjectId);
  const chapters = useChapters(course?.subjectId);

  const [title, setTitle] = useState('');
  const [blocks, setBlocks] = useState<CourseBlock[]>([]);
  const [keywords, setKeywords] = useState('');
  const [confirm, setConfirm] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!course || ready) return;
    setTitle(course.title);
    setBlocks(course.blocks);
    setKeywords(course.keywords.join(', '));
    setReady(true);
  }, [course, ready]);

  const payload = useMemo(() => ({ title, blocks, keywords }), [title, blocks, keywords]);

  const saveState = useAutosave(
    payload,
    async (value) => {
      await db.courses.update(id, {
        title: value.title.trim() || 'Sans titre',
        blocks: value.blocks,
        keywords: value.keywords
          .split(',')
          .map((word) => word.trim())
          .filter(Boolean),
        status: value.blocks.length === 0 ? 'to_write' : 'in_progress',
        updatedAt: nowISO(),
      });
    },
    { enabled: ready },
  );

  if (course === undefined) return null;
  if (!course) {
    return (
      <EmptyState
        title="Cours introuvable"
        description="Ce cours a peut-être été supprimé."
        action={
          <Link href="/cours" className="btn-primary">
            Retour aux cours
          </Link>
        }
      />
    );
  }

  const saveLabel = SaveIndicatorLabel(saveState);

  return (
    <>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <Link href={subject ? `/matieres/${subject.id}` : '/cours'} className="btn-ghost -ml-2 text-[13px]">
          <ArrowLeft size={15} />
          {subject ? subject.name : 'Mes cours'}
        </Link>
        <div className="flex items-center gap-2">
          {saveLabel ? <span className="text-[12px] text-muted">{saveLabel}</span> : null}
          <button
            type="button"
            onClick={async () => {
              await db.courses.update(id, { favorite: !course.favorite, updatedAt: nowISO() });
            }}
            className="btn-ghost h-9 w-9 rounded-xl p-0"
            aria-label={course.favorite ? 'Retirer des favoris' : 'Ajouter aux favoris'}
            aria-pressed={course.favorite}
          >
            <Star size={17} className={course.favorite ? 'fill-primary text-primary' : ''} />
          </button>
          <button
            type="button"
            onClick={() => setConfirm(true)}
            className="btn-ghost h-9 w-9 rounded-xl p-0"
            aria-label="Supprimer ce cours"
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
          <span className="chip text-muted">Cours {String(course.number).padStart(2, '0')}</span>
          <select
            className="chip cursor-pointer bg-surface text-muted"
            value={course.kind}
            aria-label="Type de séance"
            onChange={async (event) => {
              await db.courses.update(id, {
                kind: event.target.value as CourseKind,
                updatedAt: nowISO(),
              });
            }}
          >
            {(['CM', 'TD', 'TP', 'AUTRE'] as CourseKind[]).map((kind) => (
              <option key={kind} value={kind}>
                {kind}
              </option>
            ))}
          </select>
          <input
            type="date"
            className="chip cursor-pointer bg-surface text-muted"
            value={course.date ?? ''}
            aria-label="Date du cours"
            onChange={async (event) => {
              await db.courses.update(id, {
                date: event.target.value || undefined,
                updatedAt: nowISO(),
              });
            }}
          />
          <MasteryPill
            level={course.mastery}
            onClick={async () => {
              await db.courses.update(id, {
                mastery: nextMastery(course.mastery),
                updatedAt: nowISO(),
              });
            }}
          />
        </div>

        <input
          className="w-full bg-transparent text-[26px] font-semibold tracking-tight text-ink outline-none placeholder:text-muted/50 sm:text-[30px]"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          placeholder="Titre du cours"
          aria-label="Titre du cours"
        />

        {(chapters ?? []).length > 0 ? (
          <div className="mt-3">
            <label className="label" htmlFor="course-chapter">
              Chapitre
            </label>
            <select
              id="course-chapter"
              className="field max-w-sm"
              value={course.chapterId ?? ''}
              onChange={async (event) => {
                await db.courses.update(id, {
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
          </div>
        ) : null}
      </header>

      <div className="lg:pl-8">
        <BlockEditor blocks={blocks} onChange={setBlocks} />
      </div>

      <div className="mt-8 border-t border-line pt-5">
        <label className="label" htmlFor="course-keywords">
          Mots-clés
        </label>
        <input
          id="course-keywords"
          className="field max-w-lg"
          value={keywords}
          onChange={(event) => setKeywords(event.target.value)}
          placeholder="constitution, hiérarchie des normes"
        />
        <p className="mt-1.5 text-[12px] text-muted">
          Séparés par des virgules — ils sont pris en compte dans la recherche globale.
        </p>
        {blocks.length > 0 ? (
          <p className="mt-3 text-[12px] text-muted">
            {blocks.length} bloc{blocks.length > 1 ? 's' : ''} ·{' '}
            {blocks.reduce((total, block) => total + blockToText(block).length, 0)} caractères
          </p>
        ) : null}
      </div>

      <ConfirmDialog
        open={confirm}
        onClose={() => setConfirm(false)}
        title="Supprimer ce cours ?"
        message="Les notes rattachées seront supprimées. Les documents, tâches et flashcards seront conservés mais détachés."
        onConfirm={async () => {
          await deleteCourseCascade(id);
          toast('Cours supprimé');
          router.push(subject ? `/matieres/${subject.id}` : '/cours');
        }}
      />
    </>
  );
}
