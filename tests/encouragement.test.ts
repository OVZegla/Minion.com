import { describe, expect, it } from 'vitest';
import { ENCOURAGEMENTS } from '@/lib/encouragements';
import { EMPTY_STATE, pickEncouragement } from '@/lib/encouragement';

describe('phrases d’encouragement', () => {
  it('la liste est complète et sans doublon', () => {
    expect(ENCOURAGEMENTS.length).toBe(250);
    expect(new Set(ENCOURAGEMENTS).size).toBe(ENCOURAGEMENTS.length);
    expect(ENCOURAGEMENTS.every((phrase) => phrase.trim().length > 0)).toBe(true);
  });

  it('renvoie une phrase réelle de la liste', () => {
    const pick = pickEncouragement(EMPTY_STATE);
    expect(ENCOURAGEMENTS).toContain(pick.text);
    expect(pick.state.seen).toEqual([pick.index]);
  });

  it('ne répète aucune phrase avant d’avoir tout parcouru', () => {
    let state = EMPTY_STATE;
    const vues: number[] = [];
    for (let i = 0; i < ENCOURAGEMENTS.length; i += 1) {
      const pick = pickEncouragement(state);
      vues.push(pick.index);
      state = pick.state;
      expect(pick.cycleRestarted).toBe(false);
    }
    expect(new Set(vues).size).toBe(ENCOURAGEMENTS.length);
  });

  it('repart pour un nouveau tour une fois la liste épuisée', () => {
    let state = EMPTY_STATE;
    for (let i = 0; i < ENCOURAGEMENTS.length; i += 1) state = pickEncouragement(state).state;
    const pick = pickEncouragement(state);
    expect(pick.cycleRestarted).toBe(true);
    expect(pick.state.seen).toEqual([pick.index]);
  });

  it('ne rejoue jamais la même phrase deux fois de suite au changement de tour', () => {
    let state = EMPTY_STATE;
    for (let i = 0; i < ENCOURAGEMENTS.length; i += 1) state = pickEncouragement(state).state;
    const dernier = state.last;
    // le hasard poussé aux extrêmes ne doit pas ramener la dernière phrase
    for (const random of [() => 0, () => 0.999999]) {
      expect(pickEncouragement(state, ENCOURAGEMENTS.length, random).index).not.toBe(dernier);
    }
  });

  it('résiste à un état corrompu', () => {
    const pick = pickEncouragement({ seen: [-5, 9999, 1.5], last: 99999 } as never);
    expect(ENCOURAGEMENTS).toContain(pick.text);
  });

  it('gère une liste réduite à une seule phrase', () => {
    const pick = pickEncouragement({ seen: [0], last: 0 }, 1);
    expect(pick.index).toBe(0);
    expect(pick.cycleRestarted).toBe(true);
  });
});
