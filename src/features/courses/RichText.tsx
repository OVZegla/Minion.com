'use client';

import clsx from 'clsx';
import { useCallback, useEffect, useRef } from 'react';
import {
  RICH_COLOR_NONE,
  RICH_DEFAULT_PT,
  RICH_FONT_NONE,
  RICH_MARK_NONE,
  applyMarksInRange,
  isRichEmpty,
  readMarksInRange,
  sanitizeRich,
  type MarkPatch,
} from '@/lib/richtext';

/**
 * Champ de saisie avec mise en forme.
 *
 * Deux principes :
 *
 * 1. Le contenu du champ n'est jamais réécrit pendant la frappe. Il ne l'est
 *    que lorsque la valeur change pour une raison extérieure. Sans cela le
 *    curseur sauterait à chaque lettre.
 * 2. La hauteur est laissée au navigateur. L'ancienne zone de texte remettait
 *    sa hauteur à zéro avant de la recalculer, à chaque rendu et pour tous les
 *    champs de la page : la page se raccourcissait brutalement et le navigateur
 *    déplaçait la vue. C'était le bug de « l'écran qui remonte ».
 */

interface ActiveField {
  el: HTMLElement;
  emit: () => void;
}

/** Mise en forme actuellement sous le curseur, pour allumer les boutons. */
export interface ActiveMarks {
  bold: boolean;
  italic: boolean;
  underline: boolean;
  strike: boolean;
  color: string | null;
  mark: string | null;
  size: string | null;
  font: string | null;
}

const NO_MARKS: ActiveMarks = {
  bold: false,
  italic: false,
  underline: false,
  strike: false,
  color: null,
  mark: null,
  size: null,
  font: null,
};

let activeField: ActiveField | null = null;
let activeMarks: ActiveMarks = NO_MARKS;
/**
 * Dernière sélection connue dans le champ actif.
 *
 * Cliquer une liste déroulante de la barre déplace le focus hors du champ et
 * peut effacer la sélection : on la remet en place avant d'appliquer.
 */
let savedRange: Range | null = null;
const listeners = new Set<() => void>();

const notify = () => {
  for (const listener of listeners) listener();
};

/** Magasin lu par la barre de mise en forme : null quand aucun champ n'est actif. */
export const richMarksStore = {
  subscribe(listener: () => void) {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },
  get(): ActiveMarks | null {
    return activeField ? activeMarks : null;
  },
};

/* ------------------------------------------------------------------ */
/* Position du curseur, comptée en caractères                          */
/* ------------------------------------------------------------------ */

/** Nombre de caractères d'un fragment, un saut de ligne comptant pour un. */
function textLength(node: Node): number {
  let total = 0;
  const walker = document.createTreeWalker(node, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT);
  let current = walker.nextNode();
  while (current) {
    if (current.nodeType === Node.TEXT_NODE) total += current.textContent?.length ?? 0;
    else if ((current as Element).tagName === 'BR') total += 1;
    current = walker.nextNode();
  }
  return total;
}

/** Position d'un point du document, en caractères depuis le début du champ. */
function offsetOf(root: HTMLElement, container: Node, offset: number): number {
  const range = document.createRange();
  range.setStart(root, 0);
  try {
    range.setEnd(container, offset);
  } catch {
    return 0;
  }
  return textLength(range.cloneContents());
}

/** Point du document correspondant à une position en caractères. */
function pointAt(root: HTMLElement, target: number): { node: Node; offset: number } {
  let seen = 0;
  let lastText: Text | null = null;
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT);
  let current = walker.nextNode();
  while (current) {
    if (current.nodeType === Node.TEXT_NODE) {
      const text = current as Text;
      if (seen + text.length >= target) return { node: text, offset: target - seen };
      seen += text.length;
      lastText = text;
    } else if ((current as Element).tagName === 'BR') {
      seen += 1;
    }
    current = walker.nextNode();
  }
  if (lastText) return { node: lastText, offset: lastText.length };
  return { node: root, offset: root.childNodes.length };
}

/** Mémorise la sélection courante si elle est dans le champ actif. */
function rememberSelection(): void {
  const field = activeField;
  if (!field || typeof window === 'undefined') return;
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0) return;
  const range = selection.getRangeAt(0);
  if (field.el.contains(range.commonAncestorContainer)) savedRange = range.cloneRange();
}

/** Redonne le focus au champ et rétablit la sélection mémorisée si besoin. */
function focusField(field: ActiveField): Selection | null {
  field.el.focus();
  const selection = window.getSelection();
  if (!selection) return null;
  const inside =
    selection.rangeCount > 0 && field.el.contains(selection.getRangeAt(0).commonAncestorContainer);
  if (!inside && savedRange) {
    selection.removeAllRanges();
    selection.addRange(savedRange);
  }
  return selection;
}

/** Bornes de la sélection dans le champ actif, en caractères. */
function selectionRange(field: ActiveField): { start: number; end: number } | null {
  if (typeof window === 'undefined') return null;
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0) return null;
  const range = selection.getRangeAt(0);
  if (!field.el.contains(range.commonAncestorContainer)) return null;
  const a = offsetOf(field.el, range.startContainer, range.startOffset);
  const b = offsetOf(field.el, range.endContainer, range.endOffset);
  return { start: Math.min(a, b), end: Math.max(a, b) };
}

/** Lit la mise en forme de la sélection, à partir du contenu assaini. */
function readActiveMarks(): ActiveMarks {
  const field = activeField;
  if (!field) return NO_MARKS;
  const range = selectionRange(field);
  if (!range) return NO_MARKS;
  const summary = readMarksInRange(sanitizeRich(field.el.innerHTML), range.start, range.end);
  return {
    bold: summary.b,
    italic: summary.i,
    underline: summary.u,
    strike: summary.s,
    color: summary.color,
    mark: summary.mark,
    size: summary.size,
    font: summary.font,
  };
}

function refreshMarks() {
  const next = readActiveMarks();
  const previous = activeMarks;
  if (
    next.bold === previous.bold &&
    next.italic === previous.italic &&
    next.underline === previous.underline &&
    next.strike === previous.strike &&
    next.color === previous.color &&
    next.mark === previous.mark &&
    next.size === previous.size &&
    next.font === previous.font
  ) {
    return;
  }
  activeMarks = next;
  notify();
}

function setActiveField(next: ActiveField | null) {
  activeField = next;
  activeMarks = next ? readActiveMarks() : NO_MARKS;
  notify();
}

/**
 * Applique une mise en forme à la sélection.
 *
 * Le calcul se fait sur le contenu assaini, pas sur le document affiché. Les
 * commandes du navigateur décidaient d'après le début de la sélection : mettre
 * en couleur « un mot déjà surligné + un mot vierge » laissait le premier
 * inchangé. Ici toute la plage reçoit exactement le même traitement.
 */
function applyPatch(patch: MarkPatch): void {
  const field = activeField;
  if (!field) return;
  focusField(field);
  const range = selectionRange(field);
  if (!range || range.end <= range.start) return;

  const next = applyMarksInRange(
    sanitizeRich(field.el.innerHTML),
    range.start,
    range.end,
    patch,
  );
  field.el.innerHTML = next;
  restoreRange(field.el, range.start, range.end);
  field.emit();
  refreshMarks();
}

/** Replace la sélection sur une plage de caractères. */
function restoreRange(el: HTMLElement, start: number, end: number): void {
  const selection = window.getSelection();
  if (!selection) return;
  const from = pointAt(el, start);
  const to = pointAt(el, end);
  const range = document.createRange();
  try {
    range.setStart(from.node, from.offset);
    range.setEnd(to.node, to.offset);
  } catch {
    return;
  }
  selection.removeAllRanges();
  selection.addRange(range);
  savedRange = range.cloneRange();
}

/** Gras, italique, souligné, barré. */
export function toggleRichCommand(command: string): void {
  const field = activeField;
  if (!field) return;
  focusField(field);
  const key = ({ bold: 'b', italic: 'i', underline: 'u', strikeThrough: 's' } as const)[
    command as 'bold' | 'italic' | 'underline' | 'strikeThrough'
  ];
  if (!key) return;

  const range = selectionRange(field);
  if (!range || range.end <= range.start) {
    // Curseur seul : le navigateur retient la mise en forme pour la frappe
    // qui suit, ce que le modèle ne sait pas faire.
    try {
      document.execCommand('styleWithCSS', false, 'false');
      document.execCommand(command, false);
    } catch {
      return;
    }
    field.emit();
    refreshMarks();
    return;
  }

  const summary = readMarksInRange(sanitizeRich(field.el.innerHTML), range.start, range.end);
  // Si une partie seulement porte la mise en forme, on l'étend à tout ;
  // on ne l'enlève que lorsque toute la sélection la porte déjà.
  applyPatch({ [key]: !summary[key] } as MarkPatch);
}

/** Couleur, surlignage, taille, police. */
export function applyRichClass(prefix: 'rt-c-' | 'rt-m-' | 'rt-pt-' | 'rt-f-', key: string): void {
  if (prefix === 'rt-c-') applyPatch({ color: key === RICH_COLOR_NONE ? null : key });
  else if (prefix === 'rt-m-') applyPatch({ mark: key === RICH_MARK_NONE ? null : key });
  else if (prefix === 'rt-f-') applyPatch({ font: key === RICH_FONT_NONE ? null : key });
  else applyPatch({ size: key === String(RICH_DEFAULT_PT) ? null : key });
}

export function clearRichFormatting(): void {
  applyPatch({ b: false, i: false, u: false, s: false, color: null, mark: null, size: null, font: null });
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

  const emit = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    const clean = sanitizeRich(el.innerHTML);
    if (clean === lastHtml.current) return;
    lastHtml.current = clean;
    onChangeRef.current(clean);
  }, []);

  // Réécriture uniquement sur changement venu de l'extérieur, et jamais
  // pendant que le champ a le focus : cela détruirait le curseur.
  useEffect(() => {
    const el = ref.current;
    if (!el || document.activeElement === el) return;
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
        onBlur={() => {
          rememberSelection();
          emit();
        }}
        onFocus={() => setActiveField({ el: ref.current as HTMLElement, emit })}
        onKeyUp={() => {
          rememberSelection();
          refreshMarks();
        }}
        onMouseUp={() => {
          rememberSelection();
          refreshMarks();
        }}
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
