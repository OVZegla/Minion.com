'use client';

import clsx from 'clsx';
import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { Bold, Highlighter, Italic, RemoveFormatting, Strikethrough, Underline } from 'lucide-react';
import {
  RICH_COLORS,
  RICH_FONTS,
  RICH_MARKS,
  RICH_SIZES,
  isRichEmpty,
  sanitizeRich,
} from '@/lib/richtext';

/**
 * Champ de saisie avec mise en forme (gras, italique, souligné, barré,
 * couleur, surlignage, taille, police).
 *
 * Deux principes :
 *
 * 1. Le contenu du champ n'est jamais réécrit pendant la frappe. Il ne l'est
 *    que lorsque la valeur change pour une raison extérieure. Sans cela le
 *    curseur sauterait à chaque lettre.
 * 2. La hauteur est laissée au navigateur. L'ancienne zone de texte remettait
 *    sa hauteur à zéro avant de la recalculer, à chaque rendu et pour tous les
 *    champs de la page : la page se raccourcissait brutalement et le navigateur
 *    ramenait la vue vers le haut. C'était le bug de « l'écran qui remonte ».
 */

interface ActiveField {
  el: HTMLElement;
  emit: () => void;
}

let activeField: ActiveField | null = null;
const listeners = new Set<() => void>();

function setActiveField(next: ActiveField | null) {
  activeField = next;
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** Applique une commande de mise en forme au champ en cours d'édition. */
export function richCommand(command: string, value?: string, useCss = false): void {
  const field = activeField;
  if (!field) return;
  field.el.focus();
  try {
    document.execCommand('styleWithCSS', false, String(useCss));
    document.execCommand(command, false, value);
  } catch {
    return;
  }
  field.emit();
}

export function RichText({
  value,
  onChange,
  placeholder,
  className,
  ariaLabel,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  ariaLabel: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const lastHtml = useRef<string>('');
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  const emit = () => {
    const el = ref.current;
    if (!el) return;
    const clean = sanitizeRich(el.innerHTML);
    if (clean === lastHtml.current) return;
    lastHtml.current = clean;
    onChangeRef.current(clean);
  };

  // Réécriture uniquement sur changement venu de l'extérieur.
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const clean = sanitizeRich(value);
    if (clean !== lastHtml.current) {
      el.innerHTML = clean;
      lastHtml.current = clean;
    }
  }, [value]);

  useEffect(() => {
    return () => {
      if (activeField?.el === ref.current) setActiveField(null);
    };
  }, []);

  return (
    <div className="relative w-full min-w-0">
      {isRichEmpty(value) && placeholder ? (
        <span
          aria-hidden
          className={clsx(
            'pointer-events-none absolute left-0 top-0 select-none text-muted/60',
            className,
          )}
        >
          {placeholder}
        </span>
      ) : null}
      <div
        ref={ref}
        role="textbox"
        aria-label={ariaLabel}
        aria-multiline
        contentEditable
        suppressContentEditableWarning
        spellCheck
        onInput={emit}
        onBlur={emit}
        onFocus={() => setActiveField({ el: ref.current as HTMLElement, emit })}
        // Un collage n'apporte jamais de balises : uniquement du texte.
        onPaste={(event) => {
          event.preventDefault();
          const text = event.clipboardData.getData('text/plain');
          document.execCommand('insertText', false, text);
        }}
        onDrop={(event) => event.preventDefault()}
        className={clsx(
          'w-full whitespace-pre-wrap break-words bg-transparent text-ink outline-none',
          className,
        )}
      />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Barre de mise en forme                                              */
/* ------------------------------------------------------------------ */

function ToolButton({
  label,
  onApply,
  children,
  disabled,
}: {
  label: string;
  onApply: () => void;
  children: React.ReactNode;
  disabled: boolean;
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      disabled={disabled}
      // On empêche la perte de sélection : sans cela le clic viderait la
      // sélection avant que la commande ne s'applique.
      onMouseDown={(event) => event.preventDefault()}
      onClick={onApply}
      className="btn-ghost h-8 w-8 rounded-lg p-0 disabled:opacity-40"
    >
      {children}
    </button>
  );
}

function ToolSelect({
  label,
  options,
  onPick,
  disabled,
}: {
  label: string;
  options: { key: string; label: string }[];
  onPick: (key: string) => void;
  disabled: boolean;
}) {
  return (
    <select
      aria-label={label}
      title={label}
      disabled={disabled}
      value=""
      onMouseDown={(event) => event.stopPropagation()}
      onChange={(event) => {
        const key = event.target.value;
        event.target.value = '';
        if (key) onPick(key);
      }}
      className="h-8 rounded-lg border border-line bg-surface px-1.5 text-[12px] text-ink disabled:opacity-40"
    >
      <option value="">{label}</option>
      {options.map((option) => (
        <option key={option.key} value={option.key}>
          {option.label}
        </option>
      ))}
    </select>
  );
}

/**
 * Barre collante affichée au-dessus de l'éditeur. Elle agit sur le champ qui a
 * le focus ; sans champ actif, elle est grisée et explique quoi faire.
 */
export function RichToolbar({ className }: { className?: string }) {
  const active = useSyncExternalStore(
    subscribe,
    () => activeField !== null,
    () => false,
  );
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const disabled = !mounted || !active;

  return (
    <div
      className={clsx(
        'sticky top-2 z-20 flex flex-wrap items-center gap-1 rounded-2xl border border-line bg-surface/95 px-2 py-1.5 backdrop-blur',
        className,
      )}
    >
      <ToolButton label="Gras" disabled={disabled} onApply={() => richCommand('bold')}>
        <Bold size={15} />
      </ToolButton>
      <ToolButton label="Italique" disabled={disabled} onApply={() => richCommand('italic')}>
        <Italic size={15} />
      </ToolButton>
      <ToolButton label="Souligné" disabled={disabled} onApply={() => richCommand('underline')}>
        <Underline size={15} />
      </ToolButton>
      <ToolButton label="Barré" disabled={disabled} onApply={() => richCommand('strikeThrough')}>
        <Strikethrough size={15} />
      </ToolButton>

      <span className="mx-0.5 h-5 w-px bg-line" />

      <ToolSelect
        label="Couleur"
        disabled={disabled}
        options={[{ key: 'aucune', label: 'Couleur du texte' }, ...RICH_COLORS]}
        onPick={(key) => {
          const color = RICH_COLORS.find((entry) => entry.key === key);
          richCommand('foreColor', color ? color.value : 'currentColor', true);
        }}
      />
      <ToolSelect
        label="Surligner"
        disabled={disabled}
        options={[{ key: 'aucun', label: 'Aucun surlignage' }, ...RICH_MARKS]}
        onPick={(key) => {
          const mark = RICH_MARKS.find((entry) => entry.key === key);
          richCommand('hiliteColor', mark ? mark.value : 'transparent', true);
        }}
      />
      <ToolSelect
        label="Taille"
        disabled={disabled}
        options={RICH_SIZES}
        onPick={(key) => {
          const size = RICH_SIZES.find((entry) => entry.key === key);
          if (size) richCommand('fontSize', size.value);
        }}
      />
      <ToolSelect
        label="Police"
        disabled={disabled}
        options={RICH_FONTS}
        onPick={(key) => {
          const font = RICH_FONTS.find((entry) => entry.key === key);
          if (font) richCommand('fontName', font.value);
        }}
      />

      <ToolButton
        label="Enlever la mise en forme"
        disabled={disabled}
        onApply={() => richCommand('removeFormat')}
      >
        <RemoveFormatting size={15} />
      </ToolButton>

      <span className="ml-auto hidden items-center gap-1 pr-1 text-[11px] text-muted sm:flex">
        <Highlighter size={12} />
        {disabled ? 'Clique dans un texte pour le mettre en forme' : 'Sélectionne du texte'}
      </span>
    </div>
  );
}
