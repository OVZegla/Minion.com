/**
 * Texte enrichi : gras, italique, souligné, barré, couleur, surlignage,
 * police et taille.
 *
 * Le texte est stocké sous forme d'un HTML volontairement minuscule, et il est
 * **reconstruit** par ce module à chaque lecture comme à chaque écriture :
 * on ne conserve jamais le HTML tel quel. Une balise inconnue perd sa balise
 * mais garde son texte, un attribut non prévu disparaît, et rien de ce qui
 * pourrait s'exécuter (script, style, gestionnaire d'événement, adresse) ne
 * survit. Le collage est converti en texte brut par l'éditeur, donc en usage
 * normal le contenu ne vient jamais d'ailleurs que de la barre de mise en forme.
 *
 * Les couleurs et les tailles sont des **classes**, pas des styles en dur :
 * elles s'adaptent ainsi au mode clair et au mode sombre.
 */

export interface RichOption {
  key: string;
  label: string;
  /** Valeur envoyée au navigateur pour appliquer la mise en forme. */
  value: string;
}

/** Couleurs de texte proposées. */
export const RICH_COLORS: RichOption[] = [
  { key: 'jaune', label: 'Jaune', value: '#ca8a04' },
  { key: 'rouge', label: 'Rouge', value: '#dc2626' },
  { key: 'vert', label: 'Vert', value: '#16a34a' },
  { key: 'bleu', label: 'Bleu', value: '#2563eb' },
  { key: 'violet', label: 'Violet', value: '#9333ea' },
  { key: 'gris', label: 'Gris', value: '#6b7280' },
];

/** Couleurs de surlignage proposées. */
export const RICH_MARKS: RichOption[] = [
  { key: 'jaune', label: 'Jaune', value: '#fef08a' },
  { key: 'vert', label: 'Vert', value: '#bbf7d0' },
  { key: 'bleu', label: 'Bleu', value: '#bfdbfe' },
  { key: 'rose', label: 'Rose', value: '#fbcfe8' },
];

/**
 * Tailles proposées, en points comme dans un traitement de texte.
 * La taille du corps de texte est 11 pt : elle ne pose aucune classe.
 */
export const RICH_SIZE_PT = [8, 9, 10, 11, 12, 14, 16, 18, 20, 24, 28, 32, 36, 48, 72] as const;
export const RICH_DEFAULT_PT = 11;

export const RICH_SIZES: RichOption[] = RICH_SIZE_PT.map((pt) => ({
  key: String(pt),
  label: `${pt}`,
  value: String(pt),
}));

/** Polices proposées. La police « normale » ne pose aucune classe. */
export const RICH_FONTS: RichOption[] = [
  { key: 'normal', label: 'Police du logiciel', value: 'system-ui' },
  { key: 'times', label: 'Times New Roman', value: "'Times New Roman', Times, serif" },
  { key: 'arial', label: 'Arial', value: 'Arial, Helvetica, sans-serif' },
  { key: 'calibri', label: 'Calibri', value: "Calibri, Carlito, 'Segoe UI', sans-serif" },
  { key: 'montserrat', label: 'Montserrat', value: "Montserrat, 'Segoe UI', sans-serif" },
  { key: 'roboto', label: 'Roboto', value: "Roboto, 'Segoe UI', Arial, sans-serif" },
  { key: 'georgia', label: 'Georgia', value: 'Georgia, serif' },
  { key: 'mono', label: 'Machine à écrire', value: "ui-monospace, Consolas, monospace" },
];

const COLOR_BY_HEX = new Map(RICH_COLORS.map((c) => [c.value, c.key]));
const MARK_BY_HEX = new Map(RICH_MARKS.map((c) => [c.value, c.key]));
/** Clés « retour à la normale » : elles annulent une mise en forme englobante. */
export const RICH_COLOR_NONE = 'defaut';
export const RICH_MARK_NONE = 'aucun';
export const RICH_FONT_NONE = 'normal';

const COLOR_KEYS = new Set([...RICH_COLORS.map((c) => c.key), RICH_COLOR_NONE]);
const MARK_KEYS = new Set([...RICH_MARKS.map((c) => c.key), RICH_MARK_NONE]);
const SIZE_KEYS = new Set(RICH_SIZES.map((s) => s.key));
const FONT_KEYS = new Set(RICH_FONTS.map((f) => f.key));

/* ------------------------------------------------------------------ */
/* Entités                                                             */
/* ------------------------------------------------------------------ */

const NAMED: Record<string, string> = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
  nbsp: ' ',
};

/** Ramène un texte HTML à ses caractères réels. */
export function decodeEntities(input: string): string {
  return input.replace(/&(#x[0-9a-fA-F]+|#\d+|[a-zA-Z]+);/g, (whole, body: string) => {
    if (body[0] === '#') {
      const code = body[1] === 'x' || body[1] === 'X'
        ? Number.parseInt(body.slice(2), 16)
        : Number.parseInt(body.slice(1), 10);
      if (!Number.isFinite(code) || code <= 0 || code > 0x10ffff) return '';
      try {
        return String.fromCodePoint(code);
      } catch {
        return '';
      }
    }
    const named = NAMED[body.toLowerCase()];
    return named === undefined ? whole : named;
  });
}

/** Rend un texte inoffensif dans du HTML. */
export function escapeHtml(input: string): string {
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/* ------------------------------------------------------------------ */
/* Modèle interne                                                      */
/* ------------------------------------------------------------------ */

interface Marks {
  b?: boolean;
  i?: boolean;
  u?: boolean;
  s?: boolean;
  color?: string;
  mark?: string;
  size?: string;
  font?: string;
}

interface Run {
  text: string;
  marks: Marks;
}

const sameMarks = (a: Marks, b: Marks): boolean =>
  !!a.b === !!b.b &&
  !!a.i === !!b.i &&
  !!a.u === !!b.u &&
  !!a.s === !!b.s &&
  a.color === b.color &&
  a.mark === b.mark &&
  a.size === b.size &&
  a.font === b.font;

/** Normalise une couleur (#abc, #aabbcc, rgb(1, 2, 3)) en #aabbcc minuscule. */
function normalizeColor(raw: string): string | null {
  const value = raw.trim().toLowerCase();
  const short = /^#([0-9a-f])([0-9a-f])([0-9a-f])$/.exec(value);
  if (short) return `#${short[1]}${short[1]}${short[2]}${short[2]}${short[3]}${short[3]}`;
  if (/^#[0-9a-f]{6}$/.test(value)) return value;
  const rgb = /^rgba?\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})/.exec(value);
  if (!rgb) return null;
  const part = (n: string) => Math.min(255, Number(n)).toString(16).padStart(2, '0');
  return `#${part(rgb[1])}${part(rgb[2])}${part(rgb[3])}`;
}

/**
 * Taille demandée → clé de taille connue (en points), ou null.
 *
 * On accepte les points, les pixels et les mots-clés du navigateur, puis on
 * arrondit à la taille la plus proche de la liste proposée. La taille du corps
 * de texte ne pose aucune classe.
 */
function nearestPt(pt: number): string {
  return String(
    RICH_SIZE_PT.reduce((best, candidate) =>
      Math.abs(candidate - pt) < Math.abs(best - pt) ? candidate : best,
    ),
  );
}

/**
 * Attribut `size` d'une balise `<font>` : ancienne échelle 1 à 7, sans rapport
 * avec les points. Utilisée par les navigateurs pour execCommand('fontSize').
 */
function sizeFromFontAttr(raw: string): string | null {
  const legacy: Record<string, number> = { '1': 8, '2': 10, '3': 11, '4': 12, '5': 14, '6': 18, '7': 24 };
  const pt = legacy[raw.trim()];
  return pt === undefined || pt === RICH_DEFAULT_PT ? null : String(pt);
}

function normalizeSize(raw: string): string | null {
  const value = raw.trim().toLowerCase();
  let pt: number | null = null;

  const direct = /^(\d+(?:\.\d+)?)\s*(pt|px)?$/.exec(value);
  if (direct) {
    const amount = Number(direct[1]);
    pt = direct[2] === 'px' ? amount * 0.75 : amount;
  } else {
    const byName: Record<string, number> = {
      'xx-small': 8,
      'x-small': 9,
      small: 10,
      medium: 11,
      large: 14,
      'x-large': 18,
      'xx-large': 24,
    };
    if (value in byName) pt = byName[value];
  }
  if (pt === null || !Number.isFinite(pt) || pt <= 0) return null;
  const nearest = nearestPt(pt);
  return nearest === String(RICH_DEFAULT_PT) ? null : nearest;
}

/** Police demandée → clé de police connue, ou null. */
function normalizeFont(raw: string): string | null {
  const value = raw.toLowerCase().replace(/["']/g, '');
  if (/times|liberation serif|tinos/.test(value)) return 'times';
  if (/arial|helvetica|liberation sans|arimo/.test(value)) return 'arial';
  if (/calibri|carlito/.test(value)) return 'calibri';
  if (/montserrat/.test(value)) return 'montserrat';
  if (/roboto/.test(value)) return 'roboto';
  if (/georgia|garamond|cambria/.test(value)) return 'georgia';
  if (/mono|courier|consolas/.test(value)) return 'mono';
  return null;
}

/** Attributs d'une balise, en minuscules. */
function parseAttributes(source: string): Record<string, string> {
  const out: Record<string, string> = {};
  const re = /([a-zA-Z-]+)\s*=\s*("([^"]*)"|'([^']*)'|([^\s"'>]+))/g;
  let match: RegExpExecArray | null;
  while ((match = re.exec(source))) {
    out[match[1].toLowerCase()] = decodeEntities(match[3] ?? match[4] ?? match[5] ?? '');
  }
  return out;
}

/** Déclarations d'un attribut style, en minuscules. */
function parseStyle(source: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const part of source.split(';')) {
    const index = part.indexOf(':');
    if (index === -1) continue;
    out[part.slice(0, index).trim().toLowerCase()] = part.slice(index + 1).trim();
  }
  return out;
}

/** Ce qu'une balise ouvrante ajoute à la mise en forme courante. */
function marksFromTag(tag: string, attrs: Record<string, string>): Marks {
  const delta: Marks = {};
  if (tag === 'b' || tag === 'strong') delta.b = true;
  if (tag === 'i' || tag === 'em') delta.i = true;
  if (tag === 'u' || tag === 'ins') delta.u = true;
  if (tag === 's' || tag === 'strike' || tag === 'del') delta.s = true;

  // Classes déjà produites par cet éditeur.
  for (const name of (attrs.class ?? '').split(/\s+/)) {
    if (name.startsWith('rt-c-') && COLOR_KEYS.has(name.slice(5))) {
      delta.color = name.slice(5);
    } else if (name.startsWith('rt-m-') && MARK_KEYS.has(name.slice(5))) {
      delta.mark = name.slice(5);
    } else if (name.startsWith('rt-pt-') && SIZE_KEYS.has(name.slice(6))) {
      delta.size = name.slice(6);
    } else if (name.startsWith('rt-f-') && FONT_KEYS.has(name.slice(5))) {
      delta.font = name.slice(5);
    }
  }

  // Mise en forme produite par le navigateur (<font>, style en ligne).
  if (attrs.color) {
    const key = COLOR_BY_HEX.get(normalizeColor(attrs.color) ?? '');
    if (key) delta.color = key;
  }
  if (attrs.size) {
    const key = sizeFromFontAttr(attrs.size);
    if (key) delta.size = key;
  }
  if (attrs.face) {
    const key = normalizeFont(attrs.face);
    if (key) delta.font = key;
  }
  if (attrs.style) {
    const style = parseStyle(attrs.style);
    if (style.color) {
      const key = COLOR_BY_HEX.get(normalizeColor(style.color) ?? '');
      if (key) delta.color = key;
    }
    if (style['background-color']) {
      const key = MARK_BY_HEX.get(normalizeColor(style['background-color']) ?? '');
      if (key) delta.mark = key;
    }
    if (style['font-size']) {
      const key = normalizeSize(style['font-size']);
      if (key) delta.size = key;
    }
    if (style['font-family']) {
      const key = normalizeFont(style['font-family']);
      if (key) delta.font = key;
    }
    const weight = style['font-weight'];
    if (weight && (weight === 'bold' || weight === 'bolder' || Number(weight) >= 600)) delta.b = true;
    if (style['font-style'] === 'italic') delta.i = true;
    const decoration = `${style['text-decoration'] ?? ''} ${style['text-decoration-line'] ?? ''}`;
    if (decoration.includes('underline')) delta.u = true;
    if (decoration.includes('line-through')) delta.s = true;
  }
  return delta;
}

/** Balises dont le contenu entier est supprimé. */
const DROPPED = new Set(['script', 'style', 'iframe', 'object', 'embed', 'template', 'noscript', 'svg', 'math']);
/** Balises qui provoquent un retour à la ligne. */
const BREAKING = new Set(['div', 'p', 'br', 'li', 'tr', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'blockquote']);

/* ------------------------------------------------------------------ */
/* Analyse                                                             */
/* ------------------------------------------------------------------ */

function toRuns(input: string): Run[] {
  const runs: Run[] = [];
  const stack: { tag: string; delta: Marks }[] = [];
  let pendingBreak = false;
  let started = false;

  const effective = (): Marks => {
    const marks: Marks = {};
    for (const entry of stack) Object.assign(marks, entry.delta);
    return marks;
  };

  const pushText = (text: string) => {
    if (!text) return;
    if (pendingBreak) {
      if (started) runs.push({ text: '\n', marks: {} });
      pendingBreak = false;
    }
    started = true;
    const marks = effective();
    const last = runs[runs.length - 1];
    if (last && sameMarks(last.marks, marks)) last.text += text;
    else runs.push({ text, marks });
  };

  let index = 0;
  while (index < input.length) {
    const next = input.indexOf('<', index);
    if (next === -1) {
      pushText(decodeEntities(input.slice(index)));
      break;
    }
    if (next > index) pushText(decodeEntities(input.slice(index, next)));

    // Commentaire ou instruction : ignoré en bloc.
    if (input.startsWith('<!--', next)) {
      const end = input.indexOf('-->', next + 4);
      index = end === -1 ? input.length : end + 3;
      continue;
    }
    if (input.startsWith('<!', next) || input.startsWith('<?', next)) {
      const end = input.indexOf('>', next);
      index = end === -1 ? input.length : end + 1;
      continue;
    }

    const tagMatch = /^<(\/?)([a-zA-Z][a-zA-Z0-9]*)((?:[^>"']|"[^"]*"|'[^']*')*)>/.exec(input.slice(next));
    if (!tagMatch) {
      // Un « < » qui n'ouvre pas une balise reste du texte.
      pushText('<');
      index = next + 1;
      continue;
    }

    const [whole, closing, rawTag, rawAttrs] = tagMatch;
    const tag = rawTag.toLowerCase();
    index = next + whole.length;

    if (DROPPED.has(tag)) {
      if (!closing) {
        const closeAt = input.toLowerCase().indexOf(`</${tag}`, index);
        if (closeAt === -1) {
          index = input.length;
        } else {
          const end = input.indexOf('>', closeAt);
          index = end === -1 ? input.length : end + 1;
        }
      }
      continue;
    }

    if (closing) {
      if (BREAKING.has(tag)) pendingBreak = true;
      for (let i = stack.length - 1; i >= 0; i -= 1) {
        if (stack[i].tag === tag) {
          stack.splice(i, 1);
          break;
        }
      }
      continue;
    }

    if (tag === 'br') {
      if (started) runs.push({ text: '\n', marks: {} });
      pendingBreak = false;
      continue;
    }

    const attrs = parseAttributes(rawAttrs);
    const delta = marksFromTag(tag, attrs);
    if (BREAKING.has(tag)) pendingBreak = true;
    // Une balise inconnue ne pose aucune mise en forme, mais son texte est
    // conservé : on l'empile avec un delta vide pour retrouver sa fermeture.
    if (!/\/\s*$/.test(rawAttrs)) stack.push({ tag, delta });
  }

  return runs;
}

/* ------------------------------------------------------------------ */
/* Sérialisation                                                       */
/* ------------------------------------------------------------------ */

function classesFor(marks: Marks): string[] {
  const classes: string[] = [];
  if (marks.color && marks.color !== RICH_COLOR_NONE) classes.push(`rt-c-${marks.color}`);
  if (marks.mark && marks.mark !== RICH_MARK_NONE) classes.push(`rt-m-${marks.mark}`);
  if (marks.size && marks.size !== String(RICH_DEFAULT_PT)) classes.push(`rt-pt-${marks.size}`);
  if (marks.font && marks.font !== RICH_FONT_NONE) classes.push(`rt-f-${marks.font}`);
  return classes;
}

function serialize(runs: Run[]): string {
  let out = '';
  for (const run of runs) {
    if (!run.text) continue;
    const body = run.text
      .split('\n')
      .map((part) => escapeHtml(part))
      .join('<br>');
    const classes = classesFor(run.marks);
    let open = '';
    let close = '';
    if (run.marks.b) { open += '<b>'; close = '</b>' + close; }
    if (run.marks.i) { open += '<i>'; close = '</i>' + close; }
    if (run.marks.u) { open += '<u>'; close = '</u>' + close; }
    if (run.marks.s) { open += '<s>'; close = '</s>' + close; }
    if (classes.length) {
      open += `<span class="${classes.join(' ')}">`;
      close = '</span>' + close;
    }
    out += open + body + close;
  }
  return out;
}

/**
 * Reconstruit un contenu enrichi sûr. Le texte brut hérité (sans balise)
 * traverse cette fonction sans dommage : ses retours à la ligne deviennent
 * des `<br>` et ses caractères spéciaux sont échappés.
 */
export function sanitizeRich(input: string | null | undefined): string {
  if (!input) return '';
  return serialize(toRuns(input));
}

/** Texte sans mise en forme — recherche, compteurs, exports, impression. */
export function richToPlain(input: string | null | undefined): string {
  if (!input) return '';
  return toRuns(input)
    .map((run) => run.text)
    .join('');
}

/** Passe un texte brut en contenu enrichi. */
export function plainToRich(input: string | null | undefined): string {
  if (!input) return '';
  return serialize([{ text: input, marks: {} }]);
}

/** Vrai si le contenu ne comporte aucun caractère visible. */
export function isRichEmpty(input: string | null | undefined): boolean {
  return richToPlain(input).replace(/[\s ]/g, '') === '';
}
