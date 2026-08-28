/** Retire les accents pour comparer des chaines (recherche, parsing). */
export function deaccent(value: string): string {
  const decomposed = value.normalize('NFD');
  let out = '';
  for (let i = 0; i < decomposed.length; i += 1) {
    const code = decomposed.charCodeAt(i);
    // Bloc Unicode "Combining Diacritical Marks"
    if (code >= 0x0300 && code <= 0x036f) continue;
    out += decomposed[i];
  }
  return out;
}

export function foldCase(value: string): string {
  return deaccent(value).toLowerCase();
}

export function formatBytes(bytes: number): string {
  if (!bytes) return '—';
  if (bytes < 1024) return `${bytes} o`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} Ko`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`;
}
