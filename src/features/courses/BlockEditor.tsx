'use client';

import clsx from 'clsx';
import { ChevronDown, ChevronUp, Plus, Trash2, X } from 'lucide-react';
import { useState } from 'react';
import { BLOCK_MENU, CALLOUT_LABELS, createBlock } from './blocks';
import type { CourseBlock } from '@/types';

/** Zone de texte qui grandit avec le contenu. */
function AutoTextarea({
  value,
  onChange,
  placeholder,
  className,
  rows = 1,
  ariaLabel,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  rows?: number;
  ariaLabel: string;
}) {
  return (
    <textarea
      aria-label={ariaLabel}
      rows={rows}
      value={value}
      placeholder={placeholder}
      onChange={(event) => {
        onChange(event.target.value);
        event.target.style.height = 'auto';
        event.target.style.height = `${event.target.scrollHeight}px`;
      }}
      ref={(node) => {
        if (node) {
          node.style.height = 'auto';
          node.style.height = `${node.scrollHeight}px`;
        }
      }}
      className={clsx(
        'w-full resize-none bg-transparent text-ink outline-none placeholder:text-muted/60',
        className,
      )}
    />
  );
}

const CALLOUT_STYLE: Record<string, string> = {
  remember: 'border-primary-line bg-primary-soft',
  definition: 'border-line bg-surface2',
  example: 'border-line bg-surface2',
  warning: 'border-[color:var(--danger)]/40 bg-danger-soft',
};

export function BlockEditor({
  blocks,
  onChange,
}: {
  blocks: CourseBlock[];
  onChange: (blocks: CourseBlock[]) => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);

  const update = (id: string, patch: Partial<CourseBlock>) => {
    onChange(blocks.map((block) => (block.id === id ? ({ ...block, ...patch } as CourseBlock) : block)));
  };
  const remove = (id: string) => onChange(blocks.filter((block) => block.id !== id));
  const move = (index: number, delta: number) => {
    const target = index + delta;
    if (target < 0 || target >= blocks.length) return;
    const copy = [...blocks];
    const [item] = copy.splice(index, 1);
    copy.splice(target, 0, item);
    onChange(copy);
  };

  return (
    <div className="space-y-2">
      {blocks.map((block, index) => (
        <div key={block.id} className="group relative rounded-2xl px-1 py-0.5 hover:bg-surface2/40">
          <div className="absolute -left-1 top-1 z-10 hidden -translate-x-full gap-0.5 pr-1 group-hover:flex group-focus-within:flex lg:flex-col">
            <button
              type="button"
              onClick={() => move(index, -1)}
              className="btn-ghost h-7 w-7 rounded-lg p-0"
              aria-label="Monter le bloc"
            >
              <ChevronUp size={14} />
            </button>
            <button
              type="button"
              onClick={() => move(index, 1)}
              className="btn-ghost h-7 w-7 rounded-lg p-0"
              aria-label="Descendre le bloc"
            >
              <ChevronDown size={14} />
            </button>
            <button
              type="button"
              onClick={() => remove(block.id)}
              className="btn-ghost h-7 w-7 rounded-lg p-0"
              aria-label="Supprimer le bloc"
            >
              <Trash2 size={14} />
            </button>
          </div>

          <div className="px-2 py-1">
            <BlockBody block={block} update={update} />
          </div>

          <div className="flex justify-end gap-0.5 lg:hidden">
            <button type="button" onClick={() => move(index, -1)} className="btn-ghost h-7 px-2 text-[11px]">
              ↑
            </button>
            <button type="button" onClick={() => move(index, 1)} className="btn-ghost h-7 px-2 text-[11px]">
              ↓
            </button>
            <button type="button" onClick={() => remove(block.id)} className="btn-ghost h-7 px-2 text-[11px]">
              Supprimer
            </button>
          </div>
        </div>
      ))}

      <div className="relative">
        <button
          type="button"
          className="btn-soft w-full justify-center"
          onClick={() => setMenuOpen((value) => !value)}
          aria-expanded={menuOpen}
        >
          {menuOpen ? <X size={16} /> : <Plus size={16} />}
          {menuOpen ? 'Fermer' : 'Ajouter un bloc'}
        </button>
        {menuOpen ? (
          <div className="mt-2 grid grid-cols-2 gap-1.5 rounded-2xl border border-line bg-surface p-2 sm:grid-cols-3">
            {BLOCK_MENU.map((entry) => (
              <button
                key={`${entry.type}-${entry.variant ?? ''}`}
                type="button"
                onClick={() => {
                  onChange([...blocks, createBlock(entry.type, entry.variant)]);
                  setMenuOpen(false);
                }}
                className="rounded-xl px-3 py-2 text-left text-[13px] text-ink transition hover:bg-primary-soft hover:text-accent"
              >
                {entry.label}
              </button>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}

function BlockBody({
  block,
  update,
}: {
  block: CourseBlock;
  update: (id: string, patch: Partial<CourseBlock>) => void;
}) {
  switch (block.type) {
    case 'heading':
      return (
        <div className="flex items-start gap-2">
          <select
            aria-label="Niveau de titre"
            className="mt-1 shrink-0 rounded-lg border border-line bg-surface px-1.5 py-0.5 text-[11px] text-muted"
            value={block.level}
            onChange={(event) => update(block.id, { level: Number(event.target.value) as 1 | 2 | 3 })}
          >
            <option value={1}>H1</option>
            <option value={2}>H2</option>
            <option value={3}>H3</option>
          </select>
          <AutoTextarea
            ariaLabel="Titre"
            value={block.text}
            onChange={(text) => update(block.id, { text })}
            placeholder="Titre de section"
            className={clsx(
              'font-semibold tracking-tight',
              block.level === 1 ? 'text-[22px]' : block.level === 2 ? 'text-[18px]' : 'text-[16px]',
            )}
          />
        </div>
      );

    case 'paragraph':
      return (
        <AutoTextarea
          ariaLabel="Texte"
          value={block.text}
          onChange={(text) => update(block.id, { text })}
          placeholder="Écris tes notes…"
          className="text-[15px] leading-relaxed"
        />
      );

    case 'bullets':
    case 'numbered':
      return (
        <ul className="space-y-1">
          {block.items.map((item, index) => (
            <li key={index} className="flex items-start gap-2">
              <span className="mt-[6px] shrink-0 text-[13px] text-muted">
                {block.type === 'bullets' ? '•' : `${index + 1}.`}
              </span>
              <AutoTextarea
                ariaLabel={`Élément ${index + 1}`}
                value={item}
                onChange={(value) => {
                  const items = [...block.items];
                  items[index] = value;
                  update(block.id, { items });
                }}
                placeholder="Élément"
                className="text-[15px] leading-relaxed"
              />
              <button
                type="button"
                aria-label="Retirer l’élément"
                className="btn-ghost h-6 w-6 shrink-0 rounded-md p-0"
                onClick={() =>
                  update(block.id, { items: block.items.filter((_, i) => i !== index) })
                }
              >
                <X size={12} />
              </button>
            </li>
          ))}
          <li>
            <button
              type="button"
              className="btn-ghost -ml-2 text-[12px]"
              onClick={() => update(block.id, { items: [...block.items, ''] })}
            >
              <Plus size={13} />
              Élément
            </button>
          </li>
        </ul>
      );

    case 'checklist':
      return (
        <ul className="space-y-1.5">
          {block.items.map((item, index) => (
            <li key={index} className="flex items-start gap-2">
              <input
                type="checkbox"
                className="mt-1 h-4 w-4 shrink-0 accent-[color:var(--primary)]"
                checked={item.done}
                aria-label={`Terminé : ${item.text || 'élément'}`}
                onChange={(event) => {
                  const items = [...block.items];
                  items[index] = { ...item, done: event.target.checked };
                  update(block.id, { items });
                }}
              />
              <AutoTextarea
                ariaLabel={`Case ${index + 1}`}
                value={item.text}
                onChange={(text) => {
                  const items = [...block.items];
                  items[index] = { ...item, text };
                  update(block.id, { items });
                }}
                placeholder="À faire"
                className={clsx('text-[15px]', item.done && 'text-muted line-through')}
              />
              <button
                type="button"
                aria-label="Retirer la case"
                className="btn-ghost h-6 w-6 shrink-0 rounded-md p-0"
                onClick={() => update(block.id, { items: block.items.filter((_, i) => i !== index) })}
              >
                <X size={12} />
              </button>
            </li>
          ))}
          <li>
            <button
              type="button"
              className="btn-ghost -ml-2 text-[12px]"
              onClick={() =>
                update(block.id, { items: [...block.items, { text: '', done: false }] })
              }
            >
              <Plus size={13} />
              Case
            </button>
          </li>
        </ul>
      );

    case 'quote':
      return (
        <blockquote className="border-l-[3px] border-line pl-3">
          <AutoTextarea
            ariaLabel="Citation"
            value={block.text}
            onChange={(text) => update(block.id, { text })}
            placeholder="Citation"
            className="text-[15px] italic leading-relaxed"
          />
          <input
            aria-label="Source"
            className="mt-1 w-full bg-transparent text-[12px] text-muted outline-none"
            value={block.source ?? ''}
            placeholder="Source"
            onChange={(event) => update(block.id, { source: event.target.value })}
          />
        </blockquote>
      );

    case 'divider':
      return <hr className="my-2 border-t border-line" />;

    case 'link':
      return (
        <div className="flex flex-col gap-1.5 rounded-xl border border-line px-3 py-2 sm:flex-row sm:items-center">
          <input
            aria-label="Intitulé du lien"
            className="w-full bg-transparent text-[14px] font-medium text-ink outline-none sm:w-1/3"
            value={block.label ?? ''}
            placeholder="Intitulé"
            onChange={(event) => update(block.id, { label: event.target.value })}
          />
          <input
            aria-label="Adresse du lien"
            className="w-full bg-transparent text-[13px] text-muted outline-none"
            value={block.url}
            placeholder="https://…"
            onChange={(event) => update(block.id, { url: event.target.value })}
          />
        </div>
      );

    case 'table':
      return (
        <div className="overflow-x-auto rounded-xl border border-line">
          <table className="w-full border-collapse text-[13px]">
            <thead>
              <tr>
                {block.header.map((cell, index) => (
                  <th key={index} className="border-b border-line bg-surface2 p-0">
                    <input
                      aria-label={`Colonne ${index + 1}`}
                      className="w-full bg-transparent px-2.5 py-2 text-left font-semibold text-ink outline-none"
                      value={cell}
                      onChange={(event) => {
                        const header = [...block.header];
                        header[index] = event.target.value;
                        update(block.id, { header });
                      }}
                    />
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {block.rows.map((row, rowIndex) => (
                <tr key={rowIndex}>
                  {row.map((cell, cellIndex) => (
                    <td key={cellIndex} className="border-b border-line p-0">
                      <input
                        aria-label={`Ligne ${rowIndex + 1} colonne ${cellIndex + 1}`}
                        className="w-full bg-transparent px-2.5 py-2 text-ink outline-none"
                        value={cell}
                        onChange={(event) => {
                          const rows = block.rows.map((r) => [...r]);
                          rows[rowIndex][cellIndex] = event.target.value;
                          update(block.id, { rows });
                        }}
                      />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
          <div className="flex gap-1 p-1.5">
            <button
              type="button"
              className="btn-ghost text-[12px]"
              onClick={() =>
                update(block.id, { rows: [...block.rows, block.header.map(() => '')] })
              }
            >
              <Plus size={13} />
              Ligne
            </button>
            <button
              type="button"
              className="btn-ghost text-[12px]"
              onClick={() =>
                update(block.id, {
                  header: [...block.header, `Colonne ${block.header.length + 1}`],
                  rows: block.rows.map((row) => [...row, '']),
                })
              }
            >
              <Plus size={13} />
              Colonne
            </button>
          </div>
        </div>
      );

    case 'callout':
      return (
        <div className={clsx('rounded-2xl border p-3.5', CALLOUT_STYLE[block.variant])}>
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-semibold uppercase tracking-wide text-accent">
              {CALLOUT_LABELS[block.variant]}
            </span>
            <input
              aria-label="Titre de l’encadré"
              className="min-w-0 flex-1 bg-transparent text-[13px] font-semibold text-ink outline-none"
              value={block.title ?? ''}
              placeholder="Titre (facultatif)"
              onChange={(event) => update(block.id, { title: event.target.value })}
            />
          </div>
          <AutoTextarea
            ariaLabel="Contenu de l’encadré"
            value={block.text}
            onChange={(text) => update(block.id, { text })}
            placeholder="Contenu"
            className="mt-1.5 text-[14px] leading-relaxed"
          />
        </div>
      );

    case 'article':
      return (
        <div className="rounded-2xl border border-line bg-surface2/50 p-3.5">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-muted">Article de loi</p>
          <div className="mt-1.5 grid gap-2 sm:grid-cols-2">
            <input
              aria-label="Code"
              className="field bg-surface"
              value={block.code}
              placeholder="Code civil"
              onChange={(event) => update(block.id, { code: event.target.value })}
            />
            <input
              aria-label="Référence"
              className="field bg-surface"
              value={block.reference}
              placeholder="Article 1240"
              onChange={(event) => update(block.id, { reference: event.target.value })}
            />
          </div>
          <AutoTextarea
            ariaLabel="Texte de l’article"
            value={block.text}
            onChange={(text) => update(block.id, { text })}
            placeholder="Texte de l’article (recopie ta source officielle)"
            className="mt-2 text-[14px] italic leading-relaxed"
          />
          <AutoTextarea
            ariaLabel="Commentaire personnel"
            value={block.comment ?? ''}
            onChange={(comment) => update(block.id, { comment })}
            placeholder="Ton commentaire personnel"
            className="mt-2 border-t border-line pt-2 text-[13px] leading-relaxed text-muted"
          />
        </div>
      );

    case 'caselaw':
      return (
        <div className="rounded-2xl border border-line bg-surface2/50 p-3.5">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-muted">Jurisprudence</p>
          <div className="mt-1.5 grid gap-2 sm:grid-cols-2">
            <input
              aria-label="Juridiction"
              className="field bg-surface"
              value={block.court}
              placeholder="Juridiction"
              onChange={(event) => update(block.id, { court: event.target.value })}
            />
            <input
              aria-label="Chambre"
              className="field bg-surface"
              value={block.chamber ?? ''}
              placeholder="Chambre / formation"
              onChange={(event) => update(block.id, { chamber: event.target.value })}
            />
            <input
              aria-label="Date"
              className="field bg-surface"
              value={block.date ?? ''}
              placeholder="Date"
              onChange={(event) => update(block.id, { date: event.target.value })}
            />
            <input
              aria-label="Numéro"
              className="field bg-surface"
              value={block.number ?? ''}
              placeholder="Numéro"
              onChange={(event) => update(block.id, { number: event.target.value })}
            />
          </div>
          <AutoTextarea
            ariaLabel="Principe"
            value={block.principle ?? ''}
            onChange={(principle) => update(block.id, { principle })}
            placeholder="Principe"
            className="mt-2 text-[14px] leading-relaxed"
          />
          <AutoTextarea
            ariaLabel="Portée"
            value={block.scope ?? ''}
            onChange={(scope) => update(block.id, { scope })}
            placeholder="Portée"
            className="mt-1.5 text-[13px] leading-relaxed text-muted"
          />
        </div>
      );

    default:
      return null;
  }
}
