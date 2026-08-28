const ALPHABET = 'abcdefghijklmnopqrstuvwxyz0123456789';

/** Identifiant court, suffisant pour un usage local mono-appareil. */
export function newId(prefix = ''): string {
  let out = '';
  const bytes =
    typeof crypto !== 'undefined' && crypto.getRandomValues
      ? crypto.getRandomValues(new Uint8Array(12))
      : Array.from({ length: 12 }, () => Math.floor(Math.random() * 256));
  for (const b of bytes as Iterable<number>) out += ALPHABET[b % ALPHABET.length];
  return prefix ? `${prefix}_${out}` : out;
}
