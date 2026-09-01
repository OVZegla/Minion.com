'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { Layers, Play, Plus, Trash2 } from 'lucide-react';
import { db } from '@/db/db';
import { createFlashcard } from '@/db/repo';
import { useChapters, useFlashcards, useSubjectMap, useSubjects } from '@/hooks/data';
import { FlashcardPlayer } from '@/features/revision/FlashcardPlayer';
import { EmptyState, MasteryPill, PageHeader, SubjectBadge } from '@/components/ui';
import { useToast } from '@/components/ui/Toast';
import { nextMastery } from '@/lib/progress';
import { nowISO } from '@/lib/dates';

/**
 * Page dédiée aux flashcards.
 *
 * Elles existaient déjà mais n'étaient accessibles que dans un onglet de la
 * page Révisions, et il n'y avait aucun moyen d'en créer : seules celles de la
 * démonstration existaient. Cette page les rend visibles dans le menu et
 * permet enfin d'en écrire, d'en corriger et d'en supprimer.
 */
export default function FlashcardsPage() {
  const { toast } = useToast();
  const subjects = useSubjects();
  const subjectMap = useSubjectMap();
  const cards = useFlashcards();

  const [filter, setFilter] = useState('');
  const [playing, setPlaying] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [draftSubject, setDraftSubject] = useState('');
  const [draftChapter, setDraftChapter] = useState('');
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState('');

  const chapters = useChapters(draftSubject || null);

  const deck = useMemo(
    () => (cards ?? []).filter((card) => (filter ? card.subjectId === filter : true)),
    [cards, filter],
  );

  const subjectOf = (id: string) => subjectMap.get(id);
  const canCreate = (subjects ?? []).length > 0;
  const ready = draftSubject && question.trim() && answer.trim();

  return (
    <>
      <PageHeader
        title="Flashcards"
        subtitle="Une question d’un côté, la réponse de l’autre. Idéal pour les définitions et les articles."
        actions={
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className="btn-soft"
              onClick={() => setFormOpen((open) => !open)}
              disabled={!canCreate}
            >
              <Plus size={16} />
              Nouvelle carte
            </button>
            <button
              type="button"
              className="btn-primary"
              disabled={deck.length === 0}
              onClick={() => setPlaying(true)}
            >
              <Play size={16} />
              Réviser {deck.length} carte{deck.length > 1 ? 's' : ''}
            </button>
          </div>
        }
      />

      {!canCreate ? (
        <EmptyState
          title="Crée d’abord une matière"
          description="Une flashcard est toujours rattachée à une matière."
          action={
            <Link href="/matieres" className="btn-primary">
              Aller aux matières
            </Link>
          }
        />
      ) : (
        <>
          {formOpen ? (
            <form
              className="mb-5 space-y-3 rounded-2xl border border-line bg-surface p-4"
              onSubmit={async (event) => {
                event.preventDefault();
                if (!ready) return;
                await createFlashcard({
                  subjectId: draftSubject,
                  chapterId: draftChapter || null,
                  question,
                  answer,
                });
                setQuestion('');
                setAnswer('');
                toast('Carte ajoutée');
              }}
            >
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="label" htmlFor="card-subject">
                    Matière
                  </label>
                  <select
                    id="card-subject"
                    className="field"
                    value={draftSubject}
                    onChange={(event) => {
                      setDraftSubject(event.target.value);
                      setDraftChapter('');
                    }}
                  >
                    <option value="">Choisir une matière</option>
                    {(subjects ?? []).map((subject) => (
                      <option key={subject.id} value={subject.id}>
                        {subject.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="label" htmlFor="card-chapter">
                    Chapitre (facultatif)
                  </label>
                  <select
                    id="card-chapter"
                    className="field"
                    value={draftChapter}
                    disabled={!draftSubject || (chapters ?? []).length === 0}
                    onChange={(event) => setDraftChapter(event.target.value)}
                  >
                    <option value="">Aucun chapitre</option>
                    {(chapters ?? []).map((chapter) => (
                      <option key={chapter.id} value={chapter.id}>
                        {chapter.title}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="label" htmlFor="card-question">
                  Question
                </label>
                <textarea
                  id="card-question"
                  className="field min-h-[64px]"
                  value={question}
                  placeholder="Qu’est-ce que la hiérarchie des normes ?"
                  onChange={(event) => setQuestion(event.target.value)}
                />
              </div>
              <div>
                <label className="label" htmlFor="card-answer">
                  Réponse
                </label>
                <textarea
                  id="card-answer"
                  className="field min-h-[64px]"
                  value={answer}
                  placeholder="Le classement des règles de droit par ordre de valeur…"
                  onChange={(event) => setAnswer(event.target.value)}
                />
              </div>
              <button type="submit" className="btn-primary" disabled={!ready}>
                Ajouter la carte
              </button>
            </form>
          ) : null}

          <div className="mb-4 flex flex-wrap items-end gap-3">
            <div className="min-w-[200px]">
              <label className="label" htmlFor="filter-subject">
                Filtrer par matière
              </label>
              <select
                id="filter-subject"
                className="field"
                value={filter}
                onChange={(event) => setFilter(event.target.value)}
              >
                <option value="">Toutes les matières</option>
                {(subjects ?? []).map((subject) => (
                  <option key={subject.id} value={subject.id}>
                    {subject.name}
                  </option>
                ))}
              </select>
            </div>
            <p className="pb-2 text-[13px] text-muted">
              {deck.length} carte{deck.length > 1 ? 's' : ''}
            </p>
          </div>

          {deck.length === 0 ? (
            <EmptyState
              title="Aucune carte pour l’instant"
              description="Écris une première question et sa réponse : c’est la façon la plus rapide de retenir une définition."
              action={
                <button type="button" className="btn-primary" onClick={() => setFormOpen(true)}>
                  <Plus size={16} />
                  Nouvelle carte
                </button>
              }
            />
          ) : (
            <ul className="space-y-2">
              {deck.map((card) => {
                const subject = subjectOf(card.subjectId);
                return (
                  <li key={card.id} className="rounded-2xl border border-line bg-surface p-3.5">
                    <div className="mb-2 flex flex-wrap items-center gap-2">
                      <Layers size={14} className="text-muted" />
                      {subject ? (
                        <SubjectBadge name={subject.shortName} color={subject.color} size="sm" />
                      ) : null}
                      <MasteryPill
                        level={card.mastery}
                        onClick={async () => {
                          await db.flashcards.update(card.id, {
                            mastery: nextMastery(card.mastery),
                            updatedAt: nowISO(),
                          });
                        }}
                      />
                      <button
                        type="button"
                        className="btn-ghost ml-auto h-8 w-8 rounded-lg p-0"
                        aria-label={`Supprimer la carte : ${card.question.slice(0, 40)}`}
                        onClick={async () => {
                          await db.flashcards.delete(card.id);
                          toast('Carte supprimée');
                        }}
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                    <input
                      className="w-full bg-transparent text-[14px] font-medium text-ink outline-none"
                      value={card.question}
                      aria-label="Question"
                      onChange={async (event) => {
                        await db.flashcards.update(card.id, {
                          question: event.target.value,
                          updatedAt: nowISO(),
                        });
                      }}
                    />
                    <input
                      className="mt-1 w-full bg-transparent text-[13px] text-muted outline-none"
                      value={card.answer}
                      aria-label="Réponse"
                      onChange={async (event) => {
                        await db.flashcards.update(card.id, {
                          answer: event.target.value,
                          updatedAt: nowISO(),
                        });
                      }}
                    />
                  </li>
                );
              })}
            </ul>
          )}
        </>
      )}

      <FlashcardPlayer
        cards={deck}
        open={playing}
        onClose={() => setPlaying(false)}
        title={filter ? subjectMap.get(filter)?.name ?? 'Flashcards' : 'Toutes les flashcards'}
      />
    </>
  );
}
