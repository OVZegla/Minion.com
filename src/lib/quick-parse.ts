import { addDays, addWeeks } from 'date-fns';
import type { DateISO } from '@/types';
import { toDateISO, todayISO } from './dates';
import { deaccent } from './text';

/**
 * Parsing local et volontairement conservateur d'une saisie rapide.
 * Aucun service externe. On ne reconnait que des formes tres explicites,
 * et on retire du titre uniquement ce qu'on a reellement compris.
 */

export interface ParsedQuickInput {
  title: string;
  date: DateISO | null;
  time: string | null;
  subjectId: string | null;
  matchedDateLabel: string | null;
  matchedSubjectName: string | null;
}

const WEEKDAYS: Record<string, number> = {
  dimanche: 0,
  lundi: 1,
  mardi: 2,
  mercredi: 3,
  jeudi: 4,
  vendredi: 5,
  samedi: 6,
};

const MONTHS: Record<string, number> = {
  janvier: 0,
  fevrier: 1,
  mars: 2,
  avril: 3,
  mai: 4,
  juin: 5,
  juillet: 6,
  aout: 7,
  septembre: 8,
  octobre: 9,
  novembre: 10,
  decembre: 11,
};


function nextWeekday(from: Date, target: number, forceNextWeek = false): Date {
  const current = from.getDay();
  let delta = (target - current + 7) % 7;
  if (delta === 0) delta = 7;
  if (forceNextWeek) delta += 7;
  return addDays(from, delta);
}

export function parseQuickInput(
  raw: string,
  subjects: { id: string; name: string; shortName: string }[] = [],
  now = new Date(),
): ParsedQuickInput {
  const original = raw.trim();
  let working = ` ${original} `;
  const plain = deaccent(working.toLowerCase());

  let date: DateISO | null = null;
  let time: string | null = null;
  let matchedDateLabel: string | null = null;

  const consume = (matchIndex: number, length: number) => {
    working = working.slice(0, matchIndex) + ' ' + working.slice(matchIndex + length);
  };

  // ---- heure : "a 14h", "14h30", "18:00"
  const timeRe = /\b(?:a\s+)?(\d{1,2})\s*(?:h|:)\s*(\d{2})?\b/;
  const timeMatch = plain.match(timeRe);
  if (timeMatch && timeMatch.index !== undefined) {
    const h = Number(timeMatch[1]);
    const m = Number(timeMatch[2] ?? 0);
    if (h >= 0 && h <= 23 && m >= 0 && m <= 59) {
      time = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
      consume(timeMatch.index, timeMatch[0].length);
    }
  }

  const plain2 = deaccent(working.toLowerCase());

  // ---- date explicite "le 8 octobre" / "8 octobre"
  const dateRe = new RegExp(`\\b(?:le\\s+)?(\\d{1,2})\\s+(${Object.keys(MONTHS).join('|')})\\b`);
  const dateMatch = plain2.match(dateRe);

  // ---- mots-cles relatifs
  const relatives: { re: RegExp; resolve: () => Date; label: string }[] = [
    { re: /\baujourd'?hui\b/, resolve: () => now, label: "aujourd'hui" },
    { re: /\bdemain\b/, resolve: () => addDays(now, 1), label: 'demain' },
    { re: /\bapres-demain\b/, resolve: () => addDays(now, 2), label: 'après-demain' },
    { re: /\bce soir\b/, resolve: () => now, label: 'ce soir' },
    { re: /\bla semaine prochaine\b/, resolve: () => addWeeks(now, 1), label: 'la semaine prochaine' },
  ];

  let handled = false;
  for (const rel of relatives) {
    const m = plain2.match(rel.re);
    if (m && m.index !== undefined) {
      date = toDateISO(rel.resolve());
      matchedDateLabel = rel.label;
      consume(m.index, m[0].length);
      handled = true;
      break;
    }
  }

  if (!handled && dateMatch && dateMatch.index !== undefined) {
    const day = Number(dateMatch[1]);
    const month = MONTHS[dateMatch[2]];
    if (day >= 1 && day <= 31 && month !== undefined) {
      let year = now.getFullYear();
      const candidate = new Date(year, month, day);
      if (candidate.getTime() < new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()) {
        year += 1;
      }
      const resolved = new Date(year, month, day);
      if (resolved.getMonth() === month) {
        date = toDateISO(resolved);
        matchedDateLabel = `${day} ${dateMatch[2]}`;
        consume(dateMatch.index, dateMatch[0].length);
        handled = true;
      }
    }
  }

  if (!handled) {
    const wdRe = new RegExp(
      `\\b(?:(lundi|mardi|mercredi|jeudi|vendredi|samedi|dimanche))(\\s+prochain)?\\b`,
    );
    const m = plain2.match(wdRe);
    if (m && m.index !== undefined) {
      const target = WEEKDAYS[m[1]];
      const resolved = nextWeekday(now, target, Boolean(m[2]));
      date = toDateISO(resolved);
      matchedDateLabel = m[0].trim();
      consume(m.index, m[0].length);
    }
  }

  // ---- matiere : on essaie plusieurs formes du nom, la plus longue d'abord
  let subjectId: string | null = null;
  let matchedSubjectName: string | null = null;
  const haystack = deaccent(working.toLowerCase());

  const candidates: { id: string; name: string; needle: string }[] = [];
  for (const subject of subjects) {
    for (const raw of [subject.name, subject.shortName]) {
      if (!raw) continue;
      // "Droit constitutionnel 1" -> aussi "Droit constitutionnel"
      const trimmed = raw.replace(/\s+\d+$/, '').replace(/\.$/, '').trim();
      for (const needle of new Set([raw, trimmed])) {
        if (needle.length >= 4) {
          candidates.push({ id: subject.id, name: subject.name, needle });
        }
      }
    }
  }
  candidates.sort((a, b) => b.needle.length - a.needle.length);

  for (const candidate of candidates) {
    const needle = deaccent(candidate.needle.toLowerCase());
    const index = haystack.indexOf(needle);
    if (index >= 0) {
      subjectId = candidate.id;
      matchedSubjectName = candidate.name;
      working = working.slice(0, index) + ' ' + working.slice(index + needle.length);
      break;
    }
  }

  const title = working
    .replace(/\s+/g, ' ')
    .replace(/\s*[,;:–-]\s*$/, '')
    .replace(/^\s*(pour|le|a|à)\s+/i, '')
    .trim();

  return {
    title: title || original,
    date,
    time,
    subjectId,
    matchedDateLabel,
    matchedSubjectName,
  };
}

export { todayISO };
