'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { Layers, Play, Plus, Shuffle, Trash2 } from 'lucide-react';
import { db } from '@/db/db';
import { createFlashcard } from '@/db/repo';
import { useChapters, useFlashcards, useSubjectMap, useSubjects } from '@/hooks/data';
import { FlashcardPlayer } from '@/features/revision/FlashcardPlayer';
import { EmptyState, MasteryPill, PageHeader, SubjectBadge } from '@/components/ui';
import { useToast } from '@/components/ui/Toast';
import { buildSession, filterCards, sortCards, type DeckOrder } from '@/features/revision/deck';
import { MASTERY_LABEL, nextMastery } from '@/lib/progress';
import { fmtDayShort, nowISO } from '@/lib/dates';
import type { Flashcard, MasteryLevel } from '@/types';

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
  const [levels, setLevels] = useState<MasteryLevel[]>([]);
  const [added, setAdded] = useState<number | null>(null);
  const [query, setQuery] = useState('');
  const [order, setOrder] = useState<DeckOrder>('recent');
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [sessionSize, setSessionSize] = useState(20);
  const [playing, setPlaying] = useState(false);
  const [deckToPlay, setDeckToPlay] = useState<Flashcard[]>([]);
  const [formOpen, setFormOpen] = useState(false);
  const [draftSubject, setDraftSubject] = useState('');
  const [draftChapter, setDraftChapter] = useState('');
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState('');

  const chapters = useChapters(draftSubject || null);

  const deck = useMemo(
    () =>
      sortCards(
        filterCards(cards ?? [], {
          subjectId: filter || null,
          mastery: levels,
          addedWithinDays: added,
          query,
        }),
        order,
      ),
    [cards, filter, levels, added, query, order],
  );

  // Les cartes cochées, restreintes à ce qui est visible après filtrage.
  const selected = useMemo(() => deck.filter((card) => picked.has(card.id)), [deck, picked]);
  /** Ce qu'on révise : la sélection si elle existe, sinon tout le résultat filtré. */
  const source = selected.length > 0 ? selected : deck;

  const start = (shuffled: boolean) => {
    setDeckToPlay(shuffled ? buildSession(source, sessionSize) : source);
    setPlaying(true);
  };

  const toggleLevel = (level: MasteryLevel) =>
    setLevels((current) =>
      current.includes(level) ? current.filter((entry) => entry !== level) : [...current, level],
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
              className="btn-soft"
              disabled={source.length === 0}
              onClick={() => start(false)}
            >
              <Play size={16} />
              Réviser {source.length} carte{source.length > 1 ? 's' : ''}
            </button>
            <button
              type="button"
              className="btn-primary"
              disabled={source.length === 0}
              onClick={() => start(true)}
            >
              <Shuffle size={16} />
              Séance mélangée
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

          <div className="mb-4 space-y-3 rounded-2xl border border-line bg-surface p-4">
            <div className="grid gap-3 sm:grid-cols-3">
              <div>
                <label className="label" htmlFor="filter-subject">
                  Matière
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
              <div>
                <label className="label" htmlFor="filter-added">
                  Ajoutées
                </label>
                <select
                  id="filter-added"
                  className="field"
                  value={added === null ? '' : String(added)}
                  onChange={(event) => setAdded(event.target.value ? Number(event.target.value) : null)}
                >
                  <option value="">Depuis toujours</option>
                  <option value="7">Ces 7 derniers jours</option>
                  <option value="30">Ces 30 derniers jours</option>
                  <option value="90">Ces 3 derniers mois</option>
                </select>
              </div>
              <div>
                <label className="label" htmlFor="filter-order">
                  Ordre
                </label>
                <select
                  id="filter-order"
                  className="field"
                  value={order}
                  onChange={(event) => setOrder(event.target.value as DeckOrder)}
                >
                  <option value="recent">Les plus récentes d’abord</option>
                  <option value="ancien">Les plus anciennes d’abord</option>
                  <option value="aleatoire">Ordre aléatoire</option>
                </select>
              </div>
            </div>

            <div>
              <span className="label">Niveau d’apprentissage</span>
              <div className="flex flex-wrap gap-2">
                {(['not_started', 'to_learn', 'to_review', 'mastered'] as MasteryLevel[]).map(
                  (level) => (
                    <button
                      key={level}
                      type="button"
                      aria-pressed={levels.includes(level)}
                      onClick={() => toggleLevel(level)}
                      className={
                        levels.includes(level)
                          ? 'chip border-[color:var(--primary-line)] bg-primary-soft text-accent'
                          : 'chip text-muted hover:bg-surface2'
                      }
                    >
                      {MASTERY_LABEL[level]}
                    </button>
                  ),
                )}
                {levels.length > 0 ? (
                  <button type="button" className="btn-ghost text-[12px]" onClick={() => setLevels([])}>
                    Tous les niveaux
                  </button>
                ) : null}
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="label" htmlFor="filter-query">
                  Rechercher
                </label>
                <input
                  id="filter-query"
                  className="field"
                  value={query}
                  placeholder="Un mot de la question ou de la réponse"
                  onChange={(event) => setQuery(event.target.value)}
                />
              </div>
              <div>
                <label className="label" htmlFor="session-size">
                  Cartes par séance mélangée
                </label>
                <select
                  id="session-size"
                  className="field"
                  value={String(sessionSize)}
                  onChange={(event) => setSessionSize(Number(event.target.value))}
                >
                  <option value="10">10 cartes</option>
                  <option value="20">20 cartes</option>
                  <option value="30">30 cartes</option>
                  <option value="50">50 cartes</option>
                  <option value="0">Toutes</option>
                </select>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 border-t border-line pt-3 text-[13px] text-muted">
              <span>
                {deck.length} carte{deck.length > 1 ? 's' : ''} après filtrage
                {selected.length > 0 ? ` · ${selected.length} sélectionnée${selected.length > 1 ? 's' : ''}` : ''}
              </span>
              <button
                type="button"
                className="btn-ghost ml-auto text-[12px]"
                onClick={() => setPicked(new Set(deck.map((card) => card.id)))}
                disabled={deck.length === 0}
              >
                Tout sélectionner
              </button>
              <button
                type="button"
                className="btn-ghost text-[12px]"
                onClick={() => setPicked(new Set())}
                disabled={picked.size === 0}
              >
                Vider la sélection
              </button>
            </div>
          </div>

          {deck.length === 0 ? (
            <EmptyState
              title={
                (cards ?? []).length === 0
                  ? 'Aucune carte pour l’instant'
                  : 'Aucune carte ne correspond aux filtres'
              }
              description={
                (cards ?? []).length === 0
                  ? 'Écris une première question et sa réponse : c’est la façon la plus rapide de retenir une définition.'
                  : 'Élargis les filtres, ou crée une carte sur ce que tu viens de voir.'
              }
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
                      <input
                        type="checkbox"
                        className="h-4 w-4 accent-[color:var(--primary)]"
                        checked={picked.has(card.id)}
                        aria-label={`Sélectionner : ${card.question.slice(0, 40)}`}
                        onChange={(event) => {
                          setPicked((current) => {
                            const next = new Set(current);
                            if (event.target.checked) next.add(card.id);
                            else next.delete(card.id);
                            return next;
                          });
                        }}
                      />
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
                      <span className="text-[11px] text-muted">
                        ajoutée le {fmtDayShort(card.createdAt.slice(0, 10))}
                      </span>
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
        cards={deckToPlay}
        open={playing}
        onClose={() => setPlaying(false)}
        title={
          selected.length > 0
            ? `Ma sélection · ${deckToPlay.length} carte${deckToPlay.length > 1 ? 's' : ''}`
            : filter
              ? `${subjectMap.get(filter)?.name ?? 'Flashcards'} · ${deckToPlay.length} carte${deckToPlay.length > 1 ? 's' : ''}`
              : `Toutes les flashcards · ${deckToPlay.length} carte${deckToPlay.length > 1 ? 's' : ''}`
        }
      />
    </>
  );
}
