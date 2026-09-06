import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { RICH_COLORS, RICH_FONTS, RICH_MARKS, RICH_SIZE_PT } from '@/lib/richtext';
import { BACKGROUNDS } from '@/features/courses/backgrounds';

/**
 * Une couleur peut très bien être proposée dans la barre, acceptée par le
 * nettoyeur… et n'avoir aucune règle de style : elle ne ferait alors rien du
 * tout. Ce test relie la palette à la feuille de style.
 */
const css = fs.readFileSync(path.join(process.cwd(), 'src/app/globals.css'), 'utf8');

const declares = (selector: string): boolean =>
  new RegExp(`\\${selector}\\s*[,{]`).test(css);

describe('la feuille de style couvre toute la palette', () => {
  it('chaque couleur de texte a une règle, en clair et en sombre', () => {
    for (const color of RICH_COLORS) {
      expect(declares(`.rt-c-${color.key}`), `.rt-c-${color.key} manquant`).toBe(true);
      expect(css.includes(`.dark .rt-c-${color.key}`), `.dark .rt-c-${color.key} manquant`).toBe(true);
    }
  });

  it('chaque surlignage a une règle, en clair et en sombre', () => {
    for (const mark of RICH_MARKS) {
      expect(declares(`.rt-m-${mark.key}`), `.rt-m-${mark.key} manquant`).toBe(true);
      expect(css.includes(`.dark .rt-m-${mark.key}`), `.dark .rt-m-${mark.key} manquant`).toBe(true);
    }
  });

  it('chaque taille a une règle', () => {
    for (const pt of RICH_SIZE_PT) {
      expect(declares(`.rt-pt-${pt}`), `.rt-pt-${pt} manquant`).toBe(true);
    }
  });

  it('chaque police a une règle', () => {
    for (const font of RICH_FONTS) {
      expect(declares(`.rt-f-${font.key}`), `.rt-f-${font.key} manquant`).toBe(true);
    }
  });

  it('les retours à la normale sont définis', () => {
    expect(declares('.rt-c-defaut')).toBe(true);
    expect(declares('.rt-m-aucun')).toBe(true);
  });
});

/** Distance simple entre deux couleurs, sur les trois composantes. */
function distance(a: string, b: string): number {
  const parse = (hex: string) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
  const [r1, g1, b1] = parse(a);
  const [r2, g2, b2] = parse(b);
  return Math.sqrt((r1 - r2) ** 2 + (g1 - g2) ** 2 + (b1 - b2) ** 2);
}

describe('fonds de bloc', () => {
  const teintes = BACKGROUNDS.filter((entry) => entry.key !== 'aucun');

  it('chaque fond a une règle, en clair et en sombre', () => {
    for (const entry of teintes) {
      expect(declares(`.bb-${entry.key}`), `.bb-${entry.key} manquant`).toBe(true);
      expect(css.includes(`.dark .bb-${entry.key}`), `.dark .bb-${entry.key} manquant`).toBe(true);
    }
  });

  it('au moins dix fonds sont proposés, dont du rouge', () => {
    expect(teintes.length).toBeGreaterThanOrEqual(10);
    expect(teintes.map((entry) => entry.key)).toContain('rouge');
  });

  it('les fonds se distinguent vraiment les uns des autres', () => {
    // Ils étaient tous des teintes très pâles : à l'œil, ils se ressemblaient
    // tous. On exige désormais un écart perceptible entre chaque paire.
    for (let i = 0; i < teintes.length; i += 1) {
      for (let j = i + 1; j < teintes.length; j += 1) {
        const ecart = distance(teintes[i].preview, teintes[j].preview);
        expect(
          ecart,
          `${teintes[i].key} et ${teintes[j].key} sont trop proches (${Math.round(ecart)})`,
        ).toBeGreaterThan(20);
      }
    }
  });
});
