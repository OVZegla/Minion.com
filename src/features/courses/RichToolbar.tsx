'use client';

import clsx from 'clsx';
import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { Baseline, Bold, Highlighter, Italic, RemoveFormatting, Strikethrough, Underline } from 'lucide-react';
import {
  RICH_COLORS,
  RICH_COLOR_NONE,
  RICH_DEFAULT_PT,
  RICH_FONTS,
  RICH_FONT_NONE,
  RICH_MARKS,
  RICH_MARK_NONE,
  RICH_SIZE_PT,
} from '@/lib/richtext';
import {
  applyRichClass,
  clearRichFormatting,
  richMarksStore,
  toggleRichCommand,
  type ActiveMarks,
} from './RichText';

/** Bouton à bascule : allumé quand la mise en forme est active sous le curseur. */
function ToggleButton({
  label,
  active,
  disabled,
  onApply,
  children,
}: {
  label: string;
  active: boolean;
  disabled: boolean;
  onApply: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      aria-pressed={active}
      disabled={disabled}
      // Sans cela le clic viderait la sélection avant que la commande
      // ne s'applique.
      onMouseDown={(event) => event.preventDefault()}
      onClick={onApply}
      className={clsx(
        'flex h-8 w-8 items-center justify-center rounded-lg border transition disabled:opacity-40',
        active
          ? 'border-[color:var(--primary-line)] bg-primary-soft text-accent'
          : 'border-transparent text-ink hover:bg-surface2',
      )}
    >
      {children}
    </button>
  );
}

/** Petite palette de carrés de couleur, comme dans un traitement de texte. */
function ColorPalette({
  label,
  icon,
  swatches,
  noneKey,
  noneLabel,
  activeKey,
  previewClass,
  disabled,
  onPick,
}: {
  label: string;
  icon: React.ReactNode;
  swatches: { key: string; label: string; value: string }[];
  noneKey: string;
  noneLabel: string;
  activeKey: string | null;
  previewClass: string;
  disabled: boolean;
  onPick: (key: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (event: MouseEvent) => {
      if (!box.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [open]);

  const active = swatches.find((entry) => entry.key === activeKey);

  return (
    <div className="relative" ref={box}>
      <button
        type="button"
        title={label}
        aria-label={label}
        aria-expanded={open}
        disabled={disabled}
        onMouseDown={(event) => event.preventDefault()}
        onClick={() => setOpen((value) => !value)}
        className="flex h-8 items-center gap-1 rounded-lg border border-transparent px-1.5 text-ink transition hover:bg-surface2 disabled:opacity-40"
      >
        <span className="flex flex-col items-center leading-none">
          {icon}
          <span
            aria-hidden
            className="mt-0.5 h-[3px] w-4 rounded-full border border-line"
            style={{ background: active ? active.value : 'transparent' }}
          />
        </span>
      </button>
      {open ? (
        <div className="absolute left-0 top-9 z-30 w-[168px] rounded-xl border border-line bg-surface p-2 shadow-lg">
          <div className="grid grid-cols-4 gap-1.5">
            {swatches.map((entry) => (
              <button
                key={entry.key}
                type="button"
                title={entry.label}
                aria-label={entry.label}
                aria-pressed={activeKey === entry.key}
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => {
                  onPick(entry.key);
                  setOpen(false);
                }}
                className={clsx(
                  'h-7 w-7 rounded-md border transition',
                  activeKey === entry.key
                    ? 'border-[color:var(--text)] ring-2 ring-[color:var(--primary)]'
                    : 'border-line hover:scale-110',
                )}
                style={{ background: entry.value }}
              />
            ))}
          </div>
          <button
            type="button"
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => {
              onPick(noneKey);
              setOpen(false);
            }}
            className={clsx(
              'mt-2 w-full rounded-lg px-2 py-1.5 text-left text-[12px] transition hover:bg-surface2',
              previewClass,
            )}
          >
            {noneLabel}
          </button>
        </div>
      ) : null}
    </div>
  );
}

/**
 * Barre de mise en forme, collée en haut de l'éditeur.
 *
 * Elle agit sur le champ qui a le focus. Les boutons s'allument selon ce qui
 * est déjà appliqué là où se trouve le curseur.
 */
export function RichToolbar({ className }: { className?: string }) {
  const marks = useSyncExternalStore<ActiveMarks | null>(
    richMarksStore.subscribe,
    richMarksStore.get,
    () => null,
  );
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const disabled = !mounted || marks === null;
  const current: ActiveMarks | null = marks;

  const sizeValue = current?.size ?? String(RICH_DEFAULT_PT);
  const fontValue = current?.font ?? RICH_FONT_NONE;

  return (
    <div
      className={clsx(
        'sticky top-2 z-20 flex flex-wrap items-center gap-1 rounded-2xl border border-line bg-surface/95 px-2 py-1.5 backdrop-blur',
        className,
      )}
    >
      <select
        aria-label="Police"
        title="Police"
        disabled={disabled}
        value={fontValue}
        onMouseDown={(event) => event.stopPropagation()}
        onChange={(event) => applyRichClass('rt-f-', event.target.value)}
        className="h-8 w-[132px] rounded-lg border border-line bg-surface px-1.5 text-[12px] text-ink disabled:opacity-40"
      >
        {RICH_FONTS.map((font) => (
          <option key={font.key} value={font.key} style={{ fontFamily: font.value }}>
            {font.label}
          </option>
        ))}
      </select>

      <select
        aria-label="Taille"
        title="Taille du texte, en points"
        disabled={disabled}
        value={sizeValue}
        onMouseDown={(event) => event.stopPropagation()}
        onChange={(event) => applyRichClass('rt-pt-', event.target.value)}
        className="h-8 w-[58px] rounded-lg border border-line bg-surface px-1.5 text-[12px] text-ink disabled:opacity-40"
      >
        {RICH_SIZE_PT.map((pt) => (
          <option key={pt} value={String(pt)}>
            {pt}
          </option>
        ))}
      </select>

      <span className="mx-0.5 h-5 w-px bg-line" />

      <ToggleButton
        label="Gras"
        active={Boolean(current?.bold)}
        disabled={disabled}
        onApply={() => toggleRichCommand('bold')}
      >
        <Bold size={15} />
      </ToggleButton>
      <ToggleButton
        label="Italique"
        active={Boolean(current?.italic)}
        disabled={disabled}
        onApply={() => toggleRichCommand('italic')}
      >
        <Italic size={15} />
      </ToggleButton>
      <ToggleButton
        label="Souligné"
        active={Boolean(current?.underline)}
        disabled={disabled}
        onApply={() => toggleRichCommand('underline')}
      >
        <Underline size={15} />
      </ToggleButton>
      <ToggleButton
        label="Barré"
        active={Boolean(current?.strike)}
        disabled={disabled}
        onApply={() => toggleRichCommand('strikeThrough')}
      >
        <Strikethrough size={15} />
      </ToggleButton>

      <span className="mx-0.5 h-5 w-px bg-line" />

      <ColorPalette
        label="Couleur du texte"
        icon={<Baseline size={15} />}
        swatches={RICH_COLORS}
        noneKey={RICH_COLOR_NONE}
        noneLabel="Couleur automatique"
        activeKey={current?.color === RICH_COLOR_NONE ? null : current?.color ?? null}
        previewClass="text-ink"
        disabled={disabled}
        onPick={(key) => applyRichClass('rt-c-', key)}
      />
      <ColorPalette
        label="Surligner"
        icon={<Highlighter size={15} />}
        swatches={RICH_MARKS}
        noneKey={RICH_MARK_NONE}
        noneLabel="Aucun surlignage"
        activeKey={current?.mark === RICH_MARK_NONE ? null : current?.mark ?? null}
        previewClass="text-muted"
        disabled={disabled}
        onPick={(key) => applyRichClass('rt-m-', key)}
      />

      <ToggleButton
        label="Enlever la mise en forme"
        active={false}
        disabled={disabled}
        onApply={clearRichFormatting}
      >
        <RemoveFormatting size={15} />
      </ToggleButton>

      <span className="ml-auto hidden pr-1 text-[11px] text-muted lg:block">
        {disabled ? 'Clique dans un texte pour le mettre en forme' : 'Sélectionne du texte'}
      </span>
    </div>
  );
}
