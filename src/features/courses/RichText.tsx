'use client';

import clsx from 'clsx';
import { useCallback, useEffect, useRef } from 'react';
import { isRichEmpty, sanitizeRich } from '@/lib/richtext';

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

/** Lit la mise en forme sous le curseur en remontant les parents du champ. */
function readActiveMarks(): ActiveMarks {
  const field = activeField;
  if (!field || typeof window === 'undefined') return NO_MARKS;
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0) return NO_MARKS;

  const state = (command: string) => {
    try {
      return document.queryCommandState(command);
    } catch {
      return false;
    }
  };

  const marks: ActiveMarks = {
    bold: state('bold'),
    italic: state('italic'),
    underline: state('underline'),
    strike: state('strikeThrough'),
    color: null,
    mark: null,
    size: null,
    font: null,
  };

  let node: Node | null = selection.anchorNode;
  while (node && node !== field.el) {
    if (node.nodeType === 1) {
      for (const name of (node as HTMLElement).classList) {
        if (marks.color === null && name.startsWith('rt-c-')) marks.color = name.slice(5);
        else if (marks.mark === null && name.startsWith('rt-m-')) marks.mark = name.slice(5);
        else if (marks.size === null && name.startsWith('rt-pt-')) marks.size = name.slice(6);
        else if (marks.font === null && name.startsWith('rt-f-')) marks.font = name.slice(5);
      }
    }
    node = node.parentNode;
  }
  return marks;
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

/** Commande simple du navigateur : gras, italique, souligné, barré. */
export function toggleRichCommand(command: string): void {
  const field = activeField;
  if (!field) return;
  focusField(field);
  try {
    document.execCommand('styleWithCSS', false, 'false');
    document.execCommand(command, false);
  } catch {
    return;
  }
  field.emit();
  refreshMarks();
}

/**
 * Applique une classe de mise en forme à la sélection.
 *
 * `execCommand` ne sait pas poser une taille en points ni une classe. On lui
 * fait donc marquer la sélection avec une taille factice — lui seul sait
 * découper proprement une sélection à cheval sur plusieurs éléments — puis on
 * remplace ces marqueurs par nos propres balises.
 */
export function applyRichClass(prefix: 'rt-c-' | 'rt-m-' | 'rt-pt-' | 'rt-f-', key: string): void {
  const field = activeField;
  if (!field) return;
  const selection = focusField(field);
  if (!selection || selection.rangeCount === 0) return;

  try {
    document.execCommand('styleWithCSS', false, 'false');
    document.execCommand('fontSize', false, '7');
  } catch {
    return;
  }

  const created: HTMLElement[] = [];
  for (const marker of Array.from(field.el.querySelectorAll('font[size="7"]'))) {
    const span = document.createElement('span');
    span.className = `${prefix}${key}`;
    while (marker.firstChild) span.appendChild(marker.firstChild);
    marker.replaceWith(span);
    created.push(span);
  }

  if (created.length > 0) {
    // La sélection est replacée À L'INTÉRIEUR des balises créées : sans cela la
    // barre ne verrait pas la mise en forme qu'elle vient d'appliquer.
    const last = created[created.length - 1];
    const range = document.createRange();
    range.setStart(created[0], 0);
    range.setEnd(last, last.childNodes.length);
    selection.removeAllRanges();
    selection.addRange(range);
    savedRange = range.cloneRange();
  }

  field.emit();
  refreshMarks();
}

export function clearRichFormatting(): void {
  const field = activeField;
  if (!field) return;
  focusField(field);
  try {
    document.execCommand('removeFormat', false);
  } catch {
    return;
  }
  // removeFormat ne connaît pas nos classes : on dépouille la sélection.
  const selection = window.getSelection();
  if (selection && selection.rangeCount > 0) {
    const range = selection.getRangeAt(0);
    for (const span of Array.from(field.el.querySelectorAll('span'))) {
      if (!range.intersectsNode(span)) continue;
      if (![...span.classList].some((name) => name.startsWith('rt-'))) continue;
      span.replaceWith(...Array.from(span.childNodes));
    }
  }
  field.emit();
  refreshMarks();
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
