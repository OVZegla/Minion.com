import { createRequire } from 'node:module';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const require_ = createRequire(import.meta.url);
const paths = require_('../electron/paths.cjs') as {
  cleanSegment: (value: unknown) => string | null;
  resolveTarget: (root: string, dir: unknown, file: unknown) => { dir: string; file: string };
  isInside: (root: string, candidate: string) => boolean;
  uniquePath: (file: string, exists: (candidate: string) => boolean) => string;
};

const ROOT = path.resolve('/tmp/minion-lib');

describe('sécurité des chemins (processus principal)', () => {
  it('neutralise les remontées de dossier', () => {
    expect(paths.cleanSegment('..')).toBeNull();
    expect(paths.cleanSegment('.')).toBeNull();
    expect(paths.cleanSegment('../etc')).toBe('-etc');
  });

  it('retire séparateurs et caractères interdits', () => {
    expect(paths.cleanSegment('a/b\\c')).toBe('a-b-c');
    expect(paths.cleanSegment('note?.pdf')).toBe('note-.pdf');
  });

  it('garde toute écriture sous la racine', () => {
    for (const attempt of ['../../etc', '..\\..\\Windows', 'cours/../../..', '/etc']) {
      const { file } = paths.resolveTarget(ROOT, attempt, 'x.pdf');
      expect(paths.isInside(ROOT, file)).toBe(true);
    }
  });

  it('neutralise aussi un nom de fichier malveillant', () => {
    const { file } = paths.resolveTarget(ROOT, 'cours', '../../evil.exe');
    expect(paths.isInside(ROOT, file)).toBe(true);
    expect(path.basename(file)).not.toBe('evil.exe');
  });

  it('construit le chemin attendu', () => {
    const { file } = paths.resolveTarget(ROOT, 'cours/droit-des-affaires-chapitre1', 'CM03.pdf');
    expect(file).toBe(path.join(ROOT, 'cours', 'droit-des-affaires-chapitre1', 'CM03.pdf'));
  });

  it('évite d’écraser un fichier existant', () => {
    const taken = new Set([
      path.join(ROOT, 'CM03.pdf'),
      path.join(ROOT, 'CM03 (2).pdf'),
    ]);
    const result = paths.uniquePath(path.join(ROOT, 'CM03.pdf'), (candidate) => taken.has(candidate));
    expect(result).toBe(path.join(ROOT, 'CM03 (3).pdf'));
  });
});
