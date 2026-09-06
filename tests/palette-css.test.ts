import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { RICH_COLORS, RICH_FONTS, RICH_MARKS, RICH_SIZE_PT } from '@/lib/richtext';

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
