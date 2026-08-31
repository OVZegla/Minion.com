/**
 * Résolution des chemins de destination — sans dépendance à Electron,
 * pour être testable directement.
 *
 * Règle de sécurité : le renderer n'est jamais cru sur parole. Chaque segment
 * est réassaini ici et le chemin final doit rester sous la racine choisie.
 */
const path = require('node:path');

const FORBIDDEN = new Set(['<', '>', ':', '"', '/', '\\', '|', '?', '*']);

/** Nettoie un segment : ni séparateur, ni caractère interdit, jamais « .. ». */
function cleanSegment(segment) {
  let out = '';
  for (const char of String(segment ?? '')) {
    const code = char.codePointAt(0) ?? 0;
    if (code < 32 || code === 127) continue;
    out += FORBIDDEN.has(char) ? '-' : char;
  }
  const cleaned = out.replace(/^\.+/, '').trim().slice(0, 120);
  return cleaned && cleaned !== '.' && cleaned !== '..' ? cleaned : null;
}

function resolveTarget(root, relativeDir, fileName) {
  const segments = String(relativeDir ?? '')
    .split(/[/\\]+/)
    .map(cleanSegment)
    .filter(Boolean);
  const name = cleanSegment(fileName) ?? 'document';

  const dir = path.resolve(root, ...segments);
  const file = path.resolve(dir, name);

  const boundary = path.resolve(root) + path.sep;
  if (!file.startsWith(boundary)) {
    throw new Error('Chemin refusé : hors du dossier de documents.');
  }
  return { dir, file, name };
}

/** Vrai si le chemin est bien contenu dans la racine. */
function isInside(root, candidate) {
  const boundary = path.resolve(root) + path.sep;
  return path.resolve(candidate).startsWith(boundary);
}

/** « CM03.pdf » devient « CM03 (2).pdf » si le nom est déjà pris. */
function uniquePath(file, exists) {
  const parsed = path.parse(file);
  let candidate = file;
  let index = 2;
  while (exists(candidate) && index <= 999) {
    candidate = path.join(parsed.dir, `${parsed.name} (${index})${parsed.ext}`);
    index += 1;
  }
  return candidate;
}

module.exports = { cleanSegment, resolveTarget, isInside, uniquePath };
