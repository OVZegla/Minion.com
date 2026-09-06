import { describe, expect, it } from 'vitest';
import { applyMarksInRange, readMarksInRange, sanitizeRich } from '@/lib/richtext';

/**
 * Les cas qui échouaient avec les commandes du navigateur : une sélection à
 * cheval sur du texte déjà mis en forme et du texte vierge.
 */
describe('applyMarksInRange — sélection mixte', () => {
  it('surligner « déjà surligné + rien » surligne tout', () => {
    const source = sanitizeRich('<span class="rt-m-jaune">alpha</span> beta');
    expect(applyMarksInRange(source, 0, 10, { mark: 'vert' })).toBe(
      '<span class="rt-m-vert">alpha beta</span>',
    );
  });

  it('mettre en gras « déjà gras + rien » met tout en gras', () => {
    const source = sanitizeRich('<b>alpha</b> beta');
    expect(applyMarksInRange(source, 0, 10, { b: true })).toBe('<b>alpha beta</b>');
  });

  it('mettre en italique « déjà italique + rien » met tout en italique', () => {
    const source = sanitizeRich('<i>alpha</i> beta');
    expect(applyMarksInRange(source, 0, 10, { i: true })).toBe('<i>alpha beta</i>');
  });

  it('changer la police de mots de tailles différentes garde les tailles', () => {
    const source = sanitizeRich('<span class="rt-pt-24">alpha</span> beta');
    expect(applyMarksInRange(source, 0, 10, { font: 'times' })).toBe(
      '<span class="rt-pt-24 rt-f-times">alpha</span><span class="rt-f-times"> beta</span>',
    );
  });

  it('changer la taille de mots de couleurs différentes garde les couleurs', () => {
    const source = sanitizeRich('<span class="rt-c-rouge">alpha</span> beta');
    expect(applyMarksInRange(source, 0, 10, { size: '18' })).toBe(
      '<span class="rt-c-rouge rt-pt-18">alpha</span><span class="rt-pt-18"> beta</span>',
    );
  });

  it('remplace une couleur existante au lieu de l’empiler', () => {
    const source = sanitizeRich('<span class="rt-c-rouge">alpha</span> beta');
    expect(applyMarksInRange(source, 0, 10, { color: 'bleu' })).toBe(
      '<span class="rt-c-bleu">alpha beta</span>',
    );
  });
});

describe('applyMarksInRange — portée et retrait', () => {
  const texte = 'alpha beta gamma';

  it('ne touche que la plage demandée', () => {
    expect(applyMarksInRange(texte, 6, 10, { b: true })).toBe('alpha <b>beta</b> gamma');
  });

  it('retire une mise en forme quand on passe null', () => {
    const source = sanitizeRich('<span class="rt-m-jaune">alpha beta</span>');
    expect(applyMarksInRange(source, 0, 10, { mark: null })).toBe('alpha beta');
  });

  it('retire le gras sur une partie seulement', () => {
    const source = sanitizeRich('<b>alpha beta</b>');
    expect(applyMarksInRange(source, 0, 5, { b: false })).toBe('alpha<b> beta</b>');
  });

  it('une plage vide ne change rien', () => {
    const source = sanitizeRich('<b>alpha</b> beta');
    expect(applyMarksInRange(source, 4, 4, { b: true })).toBe(source);
  });

  it('respecte les sauts de ligne comme un caractère', () => {
    const source = 'alpha\nbeta';
    expect(applyMarksInRange(source, 0, 5, { b: true })).toBe('<b>alpha</b><br>beta');
    expect(applyMarksInRange(source, 6, 10, { b: true })).toBe('alpha<br><b>beta</b>');
  });

  it('reste stable si on applique deux fois la même chose', () => {
    const once = applyMarksInRange('alpha beta', 0, 10, { b: true, color: 'vert' });
    expect(applyMarksInRange(once, 0, 10, { b: true, color: 'vert' })).toBe(once);
  });

  it('le résultat est toujours du contenu déjà assaini', () => {
    const out = applyMarksInRange('alpha beta', 0, 5, { b: true, mark: 'jaune' });
    expect(sanitizeRich(out)).toBe(out);
  });
});

describe('readMarksInRange', () => {
  it('n’annonce le gras que si toute la sélection est en gras', () => {
    const source = sanitizeRich('<b>alpha</b> beta');
    expect(readMarksInRange(source, 0, 5).b).toBe(true);
    expect(readMarksInRange(source, 0, 10).b).toBe(false);
  });

  it('n’annonce une couleur que si elle est la même partout', () => {
    const source = sanitizeRich(
      '<span class="rt-c-rouge">alpha</span> <span class="rt-c-bleu">beta</span>',
    );
    expect(readMarksInRange(source, 0, 5).color).toBe('rouge');
    expect(readMarksInRange(source, 0, 10).color).toBe(null);
  });

  it('lit la mise en forme sous un curseur seul', () => {
    const source = sanitizeRich('<span class="rt-pt-18">alpha</span> beta');
    expect(readMarksInRange(source, 2, 2).size).toBe('18');
  });

  it('ne renvoie rien sur un contenu vide', () => {
    const vide = readMarksInRange('', 0, 0);
    expect(vide.b).toBe(false);
    expect(vide.color).toBe(null);
  });
});
