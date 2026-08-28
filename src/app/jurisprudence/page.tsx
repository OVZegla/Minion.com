'use client';

import { useMemo, useState } from 'react';
import { Info, Plus, Scale, Star, Trash2 } from 'lucide-react';
import { db } from '@/db/db';
import { EmptyState, PageHeader, SubjectBadge } from '@/components/ui';
import { Modal } from '@/components/ui/Modal';
import { useCaseLaws, useSubjectMap, useSubjects } from '@/hooks/data';
import { useUi } from '@/components/layout/AppProviders';
import { useToast } from '@/components/ui/Toast';
import { nowISO } from '@/lib/dates';
import { foldCase } from '@/lib/text';
import type { CaseLaw } from '@/types';

export default function CaseLawPage() {
  const caseLaws = useCaseLaws();
  const subjects = useSubjects();
  const subjectMap = useSubjectMap();
  const { openQuickAdd } = useUi();
  const { toast, toastUndo } = useToast();
  const [query, setQuery] = useState('');
  const [editing, setEditing] = useState<CaseLaw | null>(null);

  const filtered = useMemo(() => {
    const q = foldCase(query.trim());
    if (!q) return caseLaws ?? [];
    return (caseLaws ?? []).filter((item) =>
      foldCase(
        [item.court, item.chamber, item.theme, item.principle, item.number, ...item.tags]
          .filter(Boolean)
          .join(' '),
      ).includes(q),
    );
  }, [caseLaws, query]);

  return (
    <>
      <PageHeader
        title="Jurisprudence"
        subtitle="Ta bibliothèque personnelle de décisions."
        actions={
          <button type="button" className="btn-primary" onClick={() => openQuickAdd('caselaw')}>
            <Plus size={16} />
            Décision
          </button>
        }
      >
        <div className="flex flex-wrap gap-2">
          <input
            className="field max-w-xs"
            placeholder="Rechercher une décision…"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            aria-label="Rechercher une décision"
          />
        </div>
        <p className="mt-3 inline-flex items-start gap-2 rounded-xl bg-surface2 px-3 py-2 text-[12px] leading-relaxed text-muted">
          <Info size={14} className="mt-0.5 shrink-0" />
          Ce n’est pas une base officielle : seules les décisions que tu saisis toi-même y figurent.
          Vérifie toujours tes références auprès de tes sources de cours.
        </p>
      </PageHeader>

      {filtered.length === 0 ? (
        <EmptyState
          icon={<Scale size={20} />}
          title="Aucune décision enregistrée"
          description="Ajoute les arrêts vus en cours pour les retrouver au moment des révisions."
          action={
            <button type="button" className="btn-primary" onClick={() => openQuickAdd('caselaw')}>
              Ajouter une décision
            </button>
          }
        />
      ) : (
        <ul className="space-y-2">
          {filtered.map((item) => {
            const subject = item.subjectId ? subjectMap.get(item.subjectId) : undefined;
            return (
              <li key={item.id} className="rounded-2xl border border-line bg-surface p-4">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <button
                    type="button"
                    className="min-w-0 flex-1 text-left"
                    onClick={() => setEditing(item)}
                  >
                    <p className="text-[15px] font-semibold text-ink">
                      {item.court}
                      {item.chamber ? `, ${item.chamber}` : ''}
                    </p>
                    <p className="mt-0.5 text-[13px] text-muted">
                      {[item.dateLabel, item.number].filter(Boolean).join(' · ') || 'Date à compléter'}
                    </p>
                    {item.theme ? (
                      <p className="mt-1.5 text-[13px] text-ink">{item.theme}</p>
                    ) : null}
                  </button>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      className="btn-ghost h-9 w-9 rounded-xl p-0"
                      aria-label={item.favorite ? 'Retirer des favoris' : 'Ajouter aux favoris'}
                      onClick={async () => {
                        await db.caseLaws.update(item.id, {
                          favorite: !item.favorite,
                          updatedAt: nowISO(),
                        });
                      }}
                    >
                      <Star size={16} className={item.favorite ? 'fill-primary text-primary' : ''} />
                    </button>
                    <button
                      type="button"
                      className="btn-ghost h-9 w-9 rounded-xl p-0"
                      aria-label="Supprimer cette décision"
                      onClick={async () => {
                        const snapshot = item;
                        await db.caseLaws.delete(item.id);
                        toastUndo('Décision supprimée', async () => {
                          await db.caseLaws.put(snapshot);
                        });
                      }}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-1.5">
                  {subject ? (
                    <SubjectBadge name={subject.shortName} color={subject.color} size="sm" />
                  ) : null}
                  {item.tags.map((tag) => (
                    <span key={tag} className="chip text-muted">
                      {tag}
                    </span>
                  ))}
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <CaseLawEditor
        item={editing}
        open={Boolean(editing)}
        onClose={() => setEditing(null)}
        subjects={subjects ?? []}
        onSaved={() => toast('Décision mise à jour')}
      />
    </>
  );
}

function CaseLawEditor({
  item,
  open,
  onClose,
  subjects,
  onSaved,
}: {
  item: CaseLaw | null;
  open: boolean;
  onClose: () => void;
  subjects: { id: string; name: string }[];
  onSaved: () => void;
}) {
  const [draft, setDraft] = useState<CaseLaw | null>(null);

  const current = draft && item && draft.id === item.id ? draft : item;
  if (!current) return null;

  const set = (patch: Partial<CaseLaw>) => setDraft({ ...current, ...patch });

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Décision"
      size="lg"
      footer={
        <>
          <button type="button" className="btn-outline" onClick={onClose}>
            Annuler
          </button>
          <button
            type="button"
            className="btn-primary"
            onClick={async () => {
              await db.caseLaws.put({ ...current, updatedAt: nowISO() });
              onSaved();
              onClose();
            }}
          >
            Enregistrer
          </button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <Text label="Juridiction" value={current.court} onChange={(court) => set({ court })} />
          <Text
            label="Chambre / formation"
            value={current.chamber ?? ''}
            onChange={(chamber) => set({ chamber })}
          />
          <Text
            label="Date"
            value={current.dateLabel ?? ''}
            onChange={(dateLabel) => set({ dateLabel })}
          />
          <Text label="Numéro" value={current.number ?? ''} onChange={(number) => set({ number })} />
        </div>
        <Text label="Thème" value={current.theme ?? ''} onChange={(theme) => set({ theme })} />
        <div>
          <label className="label" htmlFor="cl-subject">
            Matière
          </label>
          <select
            id="cl-subject"
            className="field"
            value={current.subjectId ?? ''}
            onChange={(event) => set({ subjectId: event.target.value || null })}
          >
            <option value="">Aucune matière</option>
            {subjects.map((subject) => (
              <option key={subject.id} value={subject.id}>
                {subject.name}
              </option>
            ))}
          </select>
        </div>
        <Area label="Faits résumés" value={current.facts ?? ''} onChange={(facts) => set({ facts })} />
        <Area
          label="Principe"
          value={current.principle ?? ''}
          onChange={(principle) => set({ principle })}
        />
        <Area
          label="Solution"
          value={current.solution ?? ''}
          onChange={(solution) => set({ solution })}
        />
        <Area label="Portée" value={current.scope ?? ''} onChange={(scope) => set({ scope })} />
        <Text
          label="Tags (séparés par des virgules)"
          value={current.tags.join(', ')}
          onChange={(value) =>
            set({ tags: value.split(',').map((tag) => tag.trim()).filter(Boolean) })
          }
        />
      </div>
    </Modal>
  );
}

function Text({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  const id = `cl-${label.replace(/\s+/g, '-').toLowerCase()}`;
  return (
    <div>
      <label className="label" htmlFor={id}>
        {label}
      </label>
      <input id={id} className="field" value={value} onChange={(event) => onChange(event.target.value)} />
    </div>
  );
}

function Area({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  const id = `cl-${label.replace(/\s+/g, '-').toLowerCase()}`;
  return (
    <div>
      <label className="label" htmlFor={id}>
        {label}
      </label>
      <textarea
        id={id}
        className="field min-h-[80px]"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </div>
  );
}
