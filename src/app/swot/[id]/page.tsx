'use client';

import { use, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Minus, Plus, ThumbsDown, ThumbsUp, Trash2 } from 'lucide-react';
import clsx from 'clsx';
import { db } from '@/db/db';
import { useSubjects, useSwot } from '@/hooks/data';
import {
  INTERNAL_HINTS,
  INTERNAL_LABELS,
  INTERNAL_ORDER,
  PESTEL_HINTS,
  PESTEL_LABELS,
  PESTEL_ORDER,
  QUADRANT_LABELS,
  QUADRANT_ORIGIN,
  completion,
  itemsOfCategory,
  itemsOfQuadrant,
  summarize,
  type SwotQuadrant,
} from '@/features/swot/matrix';
import { RichText } from '@/features/courses/RichText';
import { RichToolbar } from '@/features/courses/RichToolbar';
import { EmptyState, ProgressBar, Segmented } from '@/components/ui';
import { ConfirmDialog } from '@/components/ui/Modal';
import { useToast } from '@/components/ui/Toast';
import { SaveButton } from '@/components/ui/SaveButton';
import { ExportPdfButton } from '@/components/ui/ExportPdfButton';
import { useAutosave } from '@/hooks/useAutosave';
import { newId } from '@/lib/id';
import { nowISO } from '@/lib/dates';
import type { InternalDomain, PestelDimension, SwotItem, SwotSide } from '@/types';

type Vue = 'pestel' | 'interne' | 'matrice';

const QUADRANT_STYLE: Record<SwotQuadrant, string> = {
  forces: 'bb-vert',
  faiblesses: 'bb-rouge',
  opportunites: 'bb-bleu',
  menaces: 'bb-orange',
};

export default function SwotPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { toast } = useToast();
  const analysis = useSwot(id);
  const subjects = useSubjects();

  const [title, setTitle] = useState('');
  const [company, setCompany] = useState('');
  const [context, setContext] = useState('');
  const [conclusion, setConclusion] = useState('');
  const [items, setItems] = useState<SwotItem[]>([]);
  const [vue, setVue] = useState<Vue>('pestel');
  const [confirm, setConfirm] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!analysis || ready) return;
    setTitle(analysis.title);
    setCompany(analysis.company);
    setContext(analysis.context ?? '');
    setConclusion(analysis.conclusion ?? '');
    setItems(analysis.items);
    setReady(true);
  }, [analysis, ready]);

  const payload = useMemo(
    () => ({ title, company, context, conclusion, items }),
    [title, company, context, conclusion, items],
  );

  const autosave = useAutosave(
    payload,
    async (value) => {
      await db.swots.update(id, {
        title: value.title.trim() || 'Diagnostic d’entreprise',
        company: value.company.trim(),
        context: value.context,
        conclusion: value.conclusion,
        items: value.items,
        updatedAt: nowISO(),
      });
    },
    { enabled: ready },
  );

  const bilan = summarize(items);

  const addItem = (side: SwotSide, category: PestelDimension | InternalDomain) => {
    setItems((current) => [
      ...current,
      { id: newId('swi'), side, category, polarity: 'favorable', text: '', weight: 2 },
    ]);
  };
  const updateItem = (itemId: string, patch: Partial<SwotItem>) => {
    setItems((current) =>
      current.map((item) => (item.id === itemId ? { ...item, ...patch } : item)),
    );
  };
  const removeItem = (itemId: string) =>
    setItems((current) => current.filter((item) => item.id !== itemId));

  if (analysis === undefined) return null;
  if (!analysis) {
    return (
      <EmptyState
        title="Diagnostic introuvable"
        description="Il a peut-être été supprimé."
        action={
          <Link href="/swot" className="btn-primary">
            Retour aux diagnostics
          </Link>
        }
      />
    );
  }

  return (
    <>
      <div className="no-print mb-4 flex flex-wrap items-center justify-between gap-2">
        <Link href="/swot" className="btn-ghost -ml-2 text-[13px]">
          <ArrowLeft size={15} />
          Diagnostics
        </Link>
        <div className="flex flex-wrap items-center gap-2">
          <SaveButton autosave={autosave} />
          <ExportPdfButton folder="diagnostics" fileName={title || 'diagnostic'} />
          <button
            type="button"
            onClick={() => setConfirm(true)}
            className="btn-ghost h-9 w-9 rounded-xl p-0"
            aria-label="Supprimer le diagnostic"
          >
            <Trash2 size={17} />
          </button>
        </div>
      </div>

      <header className="mb-5">
        <input
          className="w-full bg-transparent text-[26px] font-semibold tracking-tight text-ink outline-none placeholder:text-muted/50 sm:text-[30px]"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          placeholder="Intitulé du diagnostic"
          aria-label="Intitulé du diagnostic"
        />
        <div className="mt-3 grid gap-3 sm:max-w-2xl sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="swot-entreprise">
              Entreprise analysée
            </label>
            <input
              id="swot-entreprise"
              className="field"
              value={company}
              placeholder="Nom de l’entreprise"
              onChange={(event) => setCompany(event.target.value)}
            />
          </div>
          <div className="no-print">
            <label className="label" htmlFor="swot-matiere">
              Matière
            </label>
            <select
              id="swot-matiere"
              className="field"
              value={analysis.subjectId ?? ''}
              onChange={async (event) => {
                await db.swots.update(id, {
                  subjectId: event.target.value || null,
                  updatedAt: nowISO(),
                });
              }}
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

        <div className="mt-4 max-w-2xl">
          <span className="label">Avancement</span>
          <ProgressBar value={completion(items)} label="Avancement du diagnostic" />
          <p className="mt-1 text-[12px] text-muted">
            {completion(items)} % — une case compte pour explorée dès qu’elle porte un constat.
            Il reste {bilan.missingPestel.length + bilan.missingInternal.length} case
            {bilan.missingPestel.length + bilan.missingInternal.length > 1 ? 's' : ''} à regarder.
          </p>
        </div>
      </header>

      <div className="no-print mb-5 -mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
        <Segmented
          ariaLabel="Vue du diagnostic"
          value={vue}
          onChange={setVue}
          options={[
            { value: 'pestel', label: 'PESTEL (environnement)' },
            { value: 'interne', label: 'Diagnostic interne' },
            { value: 'matrice', label: 'Matrice SWOT' },
          ]}
        />
      </div>

      <RichToolbar className="no-print mb-4" />

      <section className="mb-6 max-w-3xl">
        <span className="label">Contexte</span>
        <div className="rounded-2xl border border-line bg-surface p-3.5">
          <RichText
            ariaLabel="Contexte du diagnostic"
            value={context}
            onChange={setContext}
            placeholder="Secteur, taille, situation de l’entreprise…"
            className="text-[15px] leading-relaxed"
          />
        </div>
      </section>

      {vue === 'pestel' ? (
        <CategoryGrid
          side="externe"
          order={PESTEL_ORDER}
          labels={PESTEL_LABELS}
          hints={PESTEL_HINTS}
          items={items}
          onAdd={addItem}
          onUpdate={updateItem}
          onRemove={removeItem}
          favorableLabel="Opportunité"
          defavorableLabel="Menace"
        />
      ) : null}

      {vue === 'interne' ? (
        <CategoryGrid
          side="interne"
          order={INTERNAL_ORDER}
          labels={INTERNAL_LABELS}
          hints={INTERNAL_HINTS}
          items={items}
          onAdd={addItem}
          onUpdate={updateItem}
          onRemove={removeItem}
          favorableLabel="Force"
          defavorableLabel="Faiblesse"
        />
      ) : null}

      {vue === 'matrice' ? <Matrix items={items} /> : null}

      <section className="mt-6 max-w-3xl">
        <span className="label">Synthèse</span>
        <div className="rounded-2xl border border-line bg-surface p-3.5">
          <RichText
            ariaLabel="Synthèse du diagnostic"
            value={conclusion}
            onChange={setConclusion}
            placeholder="Ce que tu retiens : sur quoi l’entreprise peut s’appuyer, ce qu’elle doit surveiller…"
            className="text-[15px] leading-relaxed"
          />
        </div>
      </section>

      {/* À l'impression, le document complet est repris, quelle que soit la
          vue affichée à l'écran : la matrice seule ne dirait pas d'où
          viennent les constats. */}
      <div className="hidden print:block">
        <PrintReport items={items} />
      </div>

      <ConfirmDialog
        open={confirm}
        onClose={() => setConfirm(false)}
        title="Supprimer ce diagnostic ?"
        message="Tous les constats seront supprimés."
        onConfirm={async () => {
          await db.swots.delete(id);
          toast('Diagnostic supprimé');
          router.push('/swot');
        }}
      />
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Saisie des constats                                                 */
/* ------------------------------------------------------------------ */

function CategoryGrid<T extends string>({
  side,
  order,
  labels,
  hints,
  items,
  onAdd,
  onUpdate,
  onRemove,
  favorableLabel,
  defavorableLabel,
}: {
  side: SwotSide;
  order: T[];
  labels: Record<T, string>;
  hints: Record<T, string>;
  items: SwotItem[];
  onAdd: (side: SwotSide, category: T) => void;
  onUpdate: (id: string, patch: Partial<SwotItem>) => void;
  onRemove: (id: string) => void;
  favorableLabel: string;
  defavorableLabel: string;
}) {
  return (
    <div className="grid gap-3 lg:grid-cols-2">
      {order.map((category) => {
        const list = itemsOfCategory(items, side, category as never);
        return (
          <section key={category} className="rounded-2xl border border-line bg-surface p-4">
            <h2 className="text-[15px] font-semibold text-ink">{labels[category]}</h2>
            <p className="mt-0.5 text-[12px] leading-snug text-muted">{hints[category]}</p>

            <ul className="mt-3 space-y-2">
              {list.map((item) => (
                <li key={item.id} className="flex flex-wrap items-center gap-1.5">
                  <div className="flex shrink-0 overflow-hidden rounded-lg border border-line">
                    <button
                      type="button"
                      aria-label={`${favorableLabel} : ${item.text || 'constat'}`}
                      aria-pressed={item.polarity === 'favorable'}
                      onClick={() => onUpdate(item.id, { polarity: 'favorable' })}
                      className={clsx(
                        'flex h-8 w-8 items-center justify-center transition',
                        item.polarity === 'favorable'
                          ? 'bg-primary-soft text-accent'
                          : 'text-muted hover:bg-surface2',
                      )}
                      title={favorableLabel}
                    >
                      <ThumbsUp size={14} />
                    </button>
                    <button
                      type="button"
                      aria-label={`${defavorableLabel} : ${item.text || 'constat'}`}
                      aria-pressed={item.polarity === 'defavorable'}
                      onClick={() => onUpdate(item.id, { polarity: 'defavorable' })}
                      className={clsx(
                        'flex h-8 w-8 items-center justify-center border-l border-line transition',
                        item.polarity === 'defavorable'
                          ? 'bg-danger-soft text-[color:var(--danger)]'
                          : 'text-muted hover:bg-surface2',
                      )}
                      title={defavorableLabel}
                    >
                      <ThumbsDown size={14} />
                    </button>
                  </div>

                  <input
                    className="min-w-0 flex-1 rounded-lg border border-line bg-surface px-2.5 py-1.5 text-[13px] text-ink outline-none focus:border-[color:var(--primary-line)]"
                    value={item.text}
                    aria-label={`Constat — ${labels[category]}`}
                    placeholder={
                      item.polarity === 'favorable'
                        ? `Un ${favorableLabel.toLowerCase()}…`
                        : `Une ${defavorableLabel.toLowerCase()}…`
                    }
                    onChange={(event) => onUpdate(item.id, { text: event.target.value })}
                  />

                  <select
                    className="h-8 shrink-0 rounded-lg border border-line bg-surface px-1 text-[12px] text-muted"
                    value={item.weight}
                    aria-label={`Importance — ${item.text || 'constat'}`}
                    onChange={(event) =>
                      onUpdate(item.id, { weight: Number(event.target.value) as 1 | 2 | 3 })
                    }
                  >
                    <option value={1}>Faible</option>
                    <option value={2}>Moyen</option>
                    <option value={3}>Majeur</option>
                  </select>

                  <button
                    type="button"
                    className="btn-ghost h-8 w-8 shrink-0 rounded-lg p-0"
                    aria-label={`Retirer le constat ${item.text || ''}`.trim()}
                    onClick={() => onRemove(item.id)}
                  >
                    <Minus size={14} />
                  </button>
                </li>
              ))}
            </ul>

            <button
              type="button"
              className="btn-ghost mt-2 -ml-2 text-[12px]"
              onClick={() => onAdd(side, category)}
            >
              <Plus size={13} />
              Ajouter un constat
            </button>
          </section>
        );
      })}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Matrice                                                             */
/* ------------------------------------------------------------------ */

function Quadrant({ items, quadrant }: { items: SwotItem[]; quadrant: SwotQuadrant }) {
  const list = itemsOfQuadrant(items, quadrant);
  return (
    <section className={clsx('rounded-2xl border p-4', QUADRANT_STYLE[quadrant])}>
      <h2 className="text-[15px] font-semibold text-ink">
        {QUADRANT_LABELS[quadrant]}
        <span className="ml-2 text-[12px] font-normal text-muted">({list.length})</span>
      </h2>
      <p className="mt-0.5 text-[11px] leading-snug text-muted">{QUADRANT_ORIGIN[quadrant]}</p>
      {list.length === 0 ? (
        <p className="mt-3 text-[13px] text-muted">
          Rien pour l’instant. Les constats saisis dans les deux autres vues arrivent ici tout
          seuls.
        </p>
      ) : (
        <ul className="mt-3 space-y-1.5">
          {list.map((item) => (
            <li key={item.id} className="flex items-start gap-2 text-[13px] text-ink">
              <span aria-hidden className="mt-[3px] shrink-0 text-[11px] text-muted">
                {'●'.repeat(item.weight)}
              </span>
              <span className="min-w-0">{item.text || <em className="text-muted">constat vide</em>}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function Matrix({ items }: { items: SwotItem[] }) {
  return (
    <div>
      <div className="grid gap-3 lg:grid-cols-2">
        <Quadrant items={items} quadrant="forces" />
        <Quadrant items={items} quadrant="faiblesses" />
        <Quadrant items={items} quadrant="opportunites" />
        <Quadrant items={items} quadrant="menaces" />
      </div>
      <p className="mt-3 text-[12px] leading-relaxed text-muted">
        La matrice n’est pas saisie à part : elle reprend les constats des deux autres vues.
        Un constat de l’environnement devient une opportunité ou une menace, un constat interne
        devient une force ou une faiblesse.
      </p>
    </div>
  );
}

/** Document imprimé : le raisonnement complet, pas seulement la matrice. */
function PrintReport({ items }: { items: SwotItem[] }) {
  return (
    <div className="print-page space-y-4">
      <h2 className="text-[17px] font-semibold text-ink">Environnement — analyse PESTEL</h2>
      {PESTEL_ORDER.map((dimension) => {
        const list = itemsOfCategory(items, 'externe', dimension);
        if (list.length === 0) return null;
        return (
          <div key={dimension}>
            <h3 className="text-[14px] font-semibold text-ink">{PESTEL_LABELS[dimension]}</h3>
            <ul className="ml-4 list-disc text-[13px] text-ink">
              {list.map((item) => (
                <li key={item.id}>
                  {item.text}{' '}
                  <em className="text-muted">
                    ({item.polarity === 'favorable' ? 'opportunité' : 'menace'})
                  </em>
                </li>
              ))}
            </ul>
          </div>
        );
      })}

      <h2 className="text-[17px] font-semibold text-ink">Diagnostic interne</h2>
      {INTERNAL_ORDER.map((domain) => {
        const list = itemsOfCategory(items, 'interne', domain);
        if (list.length === 0) return null;
        return (
          <div key={domain}>
            <h3 className="text-[14px] font-semibold text-ink">{INTERNAL_LABELS[domain]}</h3>
            <ul className="ml-4 list-disc text-[13px] text-ink">
              {list.map((item) => (
                <li key={item.id}>
                  {item.text}{' '}
                  <em className="text-muted">
                    ({item.polarity === 'favorable' ? 'force' : 'faiblesse'})
                  </em>
                </li>
              ))}
            </ul>
          </div>
        );
      })}

      <h2 className="text-[17px] font-semibold text-ink">Matrice SWOT</h2>
      <Matrix items={items} />
    </div>
  );
}
