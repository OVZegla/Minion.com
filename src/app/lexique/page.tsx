'use client';

import { useMemo, useState } from 'react';
import { Plus, SpellCheck, Star, Trash2 } from 'lucide-react';
import { db } from '@/db/db';
import { EmptyState, PageHeader, SubjectBadge } from '@/components/ui';
import { Modal } from '@/components/ui/Modal';
import { useLegalTerms, useSubjectMap, useSubjects } from '@/hooks/data';
import { useToast } from '@/components/ui/Toast';
import { newId } from '@/lib/id';
import { nowISO } from '@/lib/dates';
import { foldCase } from '@/lib/text';
import type { LegalTerm } from '@/types';

export default function LexiquePage() {
  const terms = useLegalTerms();
  const subjects = useSubjects();
  const subjectMap = useSubjectMap();
  const { toast, toastUndo } = useToast();
  const [query, setQuery] = useState('');
  const [editing, setEditing] = useState<LegalTerm | null>(null);
  const [creating, setCreating] = useState(false);

  const filtered = useMemo(() => {
    const q = foldCase(query.trim());
    if (!q) return terms ?? [];
    return (terms ?? []).filter((term) =>
      foldCase(`${term.term} ${term.definition}`).includes(q),
    );
  }, [terms, query]);

  const grouped = useMemo(() => {
    const map = new Map<string, LegalTerm[]>();
    for (const term of filtered) {
      const letter = foldCase(term.term).slice(0, 1).toUpperCase() || '#';
      const list = map.get(letter) ?? [];
      list.push(term);
      map.set(letter, list);
    }
    return new Map([...map.entries()].sort(([a], [b]) => a.localeCompare(b, 'fr')));
  }, [filtered]);

  const blank = (): LegalTerm => ({
    id: newId('lex'),
    term: '',
    definition: '',
    subjectId: null,
    chapterId: null,
    examples: '',
    favorite: false,
    createdAt: nowISO(),
    updatedAt: nowISO(),
  });

  return (
    <>
      <PageHeader
        title="Mon lexique"
        subtitle="Tes définitions, écrites avec tes mots."
        actions={
          <button
            type="button"
            className="btn-primary"
            onClick={() => {
              setEditing(blank());
              setCreating(true);
            }}
          >
            <Plus size={16} />
            Terme
          </button>
        }
      >
        <input
          className="field max-w-xs"
          placeholder="Rechercher un terme…"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          aria-label="Rechercher un terme"
        />
      </PageHeader>

      {filtered.length === 0 ? (
        <EmptyState
          icon={<SpellCheck size={20} />}
          title="Ton lexique est vide"
          description="Ajoute les mots que tu croises en cours et écris toi-même leur définition."
          action={
            <button
              type="button"
              className="btn-primary"
              onClick={() => {
                setEditing(blank());
                setCreating(true);
              }}
            >
              Ajouter un terme
            </button>
          }
        />
      ) : (
        <div className="space-y-6">
          {Array.from(grouped.entries()).map(([letter, list]) => (
            <section key={letter}>
              <h2 className="mb-2 text-[13px] font-bold uppercase tracking-wider text-accent">
                {letter}
              </h2>
              <ul className="space-y-2">
                {list.map((term) => {
                  const subject = term.subjectId ? subjectMap.get(term.subjectId) : undefined;
                  return (
                    <li
                      key={term.id}
                      className="flex items-start gap-3 rounded-2xl border border-line bg-surface px-4 py-3"
                    >
                      <button
                        type="button"
                        className="min-w-0 flex-1 text-left"
                        onClick={() => {
                          setEditing(term);
                          setCreating(false);
                        }}
                      >
                        <span className="block text-[14px] font-semibold text-ink">{term.term}</span>
                        <span className="mt-0.5 block text-[13px] leading-relaxed text-muted">
                          {term.definition || 'Définition à compléter'}
                        </span>
                        {subject ? (
                          <span className="mt-1.5 block">
                            <SubjectBadge name={subject.shortName} color={subject.color} size="sm" />
                          </span>
                        ) : null}
                      </button>
                      <button
                        type="button"
                        className="btn-ghost h-9 w-9 shrink-0 rounded-xl p-0"
                        aria-label={term.favorite ? 'Retirer des favoris' : 'Ajouter aux favoris'}
                        onClick={async () => {
                          await db.legalTerms.update(term.id, {
                            favorite: !term.favorite,
                            updatedAt: nowISO(),
                          });
                        }}
                      >
                        <Star size={16} className={term.favorite ? 'fill-primary text-primary' : ''} />
                      </button>
                      <button
                        type="button"
                        className="btn-ghost h-9 w-9 shrink-0 rounded-xl p-0"
                        aria-label={`Supprimer ${term.term}`}
                        onClick={async () => {
                          const snapshot = term;
                          await db.legalTerms.delete(term.id);
                          toastUndo('Terme supprimé', async () => {
                            await db.legalTerms.put(snapshot);
                          });
                        }}
                      >
                        <Trash2 size={16} />
                      </button>
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}
        </div>
      )}

      {editing ? (
        <Modal
          open
          onClose={() => setEditing(null)}
          title={creating ? 'Nouveau terme' : editing.term || 'Terme'}
          footer={
            <>
              <button type="button" className="btn-outline" onClick={() => setEditing(null)}>
                Annuler
              </button>
              <button
                type="button"
                className="btn-primary"
                onClick={async () => {
                  if (!editing.term.trim()) return;
                  await db.legalTerms.put({ ...editing, updatedAt: nowISO() });
                  toast(creating ? 'Terme ajouté' : 'Terme mis à jour');
                  setEditing(null);
                }}
              >
                Enregistrer
              </button>
            </>
          }
        >
          <div className="space-y-4">
            <div>
              <label className="label" htmlFor="lex-term">
                Terme
              </label>
              <input
                id="lex-term"
                className="field"
                value={editing.term}
                onChange={(event) => setEditing({ ...editing, term: event.target.value })}
              />
            </div>
            <div>
              <label className="label" htmlFor="lex-def">
                Définition
              </label>
              <textarea
                id="lex-def"
                className="field min-h-[100px]"
                value={editing.definition}
                onChange={(event) => setEditing({ ...editing, definition: event.target.value })}
              />
            </div>
            <div>
              <label className="label" htmlFor="lex-ex">
                Exemples
              </label>
              <textarea
                id="lex-ex"
                className="field min-h-[70px]"
                value={editing.examples ?? ''}
                onChange={(event) => setEditing({ ...editing, examples: event.target.value })}
              />
            </div>
            <div>
              <label className="label" htmlFor="lex-subject">
                Matière
              </label>
              <select
                id="lex-subject"
                className="field"
                value={editing.subjectId ?? ''}
                onChange={(event) =>
                  setEditing({ ...editing, subjectId: event.target.value || null })
                }
              >
                <option value="">Aucune matière</option>
                {(subjects ?? []).map((subject) => (
                  <option key={subject.id} value={subject.id}>
                    {subject.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </Modal>
      ) : null}
    </>
  );
}
