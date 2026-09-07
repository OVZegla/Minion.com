import { describe, expect, it } from 'vitest';
import {
  INTERNAL_ORDER,
  PESTEL_ORDER,
  completion,
  itemsOfCategory,
  itemsOfQuadrant,
  quadrantOf,
  summarize,
} from '@/features/swot/matrix';
import type { InternalDomain, PestelDimension, SwotItem } from '@/types';

const item = (over: Partial<SwotItem> & Pick<SwotItem, 'side' | 'category' | 'polarity'>): SwotItem => ({
  id: `it_${Math.random().toString(36).slice(2)}`,
  text: 'constat',
  weight: 2,
  ...over,
});

describe('quadrantOf — le lien entre PESTEL, diagnostic interne et matrice', () => {
  it('un constat externe favorable est une opportunité', () => {
    expect(quadrantOf('externe', 'favorable')).toBe('opportunites');
  });

  it('un constat externe défavorable est une menace', () => {
    expect(quadrantOf('externe', 'defavorable')).toBe('menaces');
  });

  it('un constat interne favorable est une force', () => {
    expect(quadrantOf('interne', 'favorable')).toBe('forces');
  });

  it('un constat interne défavorable est une faiblesse', () => {
    expect(quadrantOf('interne', 'defavorable')).toBe('faiblesses');
  });

  it('les quatre combinaisons donnent quatre cases différentes', () => {
    const cases = [
      quadrantOf('externe', 'favorable'),
      quadrantOf('externe', 'defavorable'),
      quadrantOf('interne', 'favorable'),
      quadrantOf('interne', 'defavorable'),
    ];
    expect(new Set(cases).size).toBe(4);
  });
});

describe('répartition des constats', () => {
  const items: SwotItem[] = [
    item({ side: 'externe', category: 'legal', polarity: 'defavorable', text: 'Nouvelle norme' }),
    item({ side: 'externe', category: 'economique', polarity: 'favorable', text: 'Marché en croissance' }),
    item({ side: 'interne', category: 'humain', polarity: 'favorable', text: 'Équipe expérimentée' }),
    item({ side: 'interne', category: 'financier', polarity: 'defavorable', text: 'Trésorerie tendue' }),
  ];

  it('chaque constat tombe dans la bonne case', () => {
    expect(itemsOfQuadrant(items, 'menaces').map((i) => i.text)).toEqual(['Nouvelle norme']);
    expect(itemsOfQuadrant(items, 'opportunites').map((i) => i.text)).toEqual(['Marché en croissance']);
    expect(itemsOfQuadrant(items, 'forces').map((i) => i.text)).toEqual(['Équipe expérimentée']);
    expect(itemsOfQuadrant(items, 'faiblesses').map((i) => i.text)).toEqual(['Trésorerie tendue']);
  });

  it('les constats les plus importants passent devant', () => {
    const classes = [
      item({ side: 'interne', category: 'humain', polarity: 'favorable', text: 'faible', weight: 1 }),
      item({ side: 'interne', category: 'humain', polarity: 'favorable', text: 'majeur', weight: 3 }),
      item({ side: 'interne', category: 'humain', polarity: 'favorable', text: 'moyen', weight: 2 }),
    ];
    expect(itemsOfQuadrant(classes, 'forces').map((i) => i.text)).toEqual(['majeur', 'moyen', 'faible']);
  });

  it('un constat interne ne remonte pas dans une dimension PESTEL', () => {
    // Les catégories internes et PESTEL sont distinctes, mais un même mot
    // pourrait exister des deux côtés : c'est l'origine qui tranche.
    const ambigus = [
      item({ side: 'externe', category: 'technologique', polarity: 'favorable', text: 'externe' }),
      item({ side: 'interne', category: 'technique', polarity: 'favorable', text: 'interne' }),
    ];
    expect(itemsOfCategory(ambigus, 'externe', 'technologique').map((i) => i.text)).toEqual(['externe']);
    expect(itemsOfCategory(ambigus, 'interne', 'technique').map((i) => i.text)).toEqual(['interne']);
  });
});

describe('summarize', () => {
  it('compte les quatre cases', () => {
    const items: SwotItem[] = [
      item({ side: 'externe', category: 'legal', polarity: 'favorable' }),
      item({ side: 'externe', category: 'legal', polarity: 'favorable' }),
      item({ side: 'interne', category: 'humain', polarity: 'defavorable' }),
    ];
    const bilan = summarize(items);
    expect(bilan.opportunites).toBe(2);
    expect(bilan.faiblesses).toBe(1);
    expect(bilan.forces).toBe(0);
    expect(bilan.menaces).toBe(0);
    expect(bilan.total).toBe(3);
  });

  it('signale ce qui n’a pas encore été exploré', () => {
    const bilan = summarize([
      item({ side: 'externe', category: 'legal', polarity: 'favorable' }),
      item({ side: 'interne', category: 'humain', polarity: 'favorable' }),
    ]);
    expect(bilan.missingPestel).not.toContain('legal');
    expect(bilan.missingPestel).toContain('politique');
    expect(bilan.missingInternal).not.toContain('humain');
    expect(bilan.missingInternal).toContain('financier');
  });

  it('sur une analyse vide, tout reste à explorer', () => {
    const bilan = summarize([]);
    expect(bilan.missingPestel).toHaveLength(PESTEL_ORDER.length);
    expect(bilan.missingInternal).toHaveLength(INTERNAL_ORDER.length);
  });
});

describe('completion', () => {
  it('vaut 0 sur une analyse vide', () => {
    expect(completion([])).toBe(0);
  });

  it('vaut 100 quand les douze cases portent un constat', () => {
    const items = [
      ...PESTEL_ORDER.map((category: PestelDimension) =>
        item({ side: 'externe' as const, category, polarity: 'favorable' as const }),
      ),
      ...INTERNAL_ORDER.map((category: InternalDomain) =>
        item({ side: 'interne' as const, category, polarity: 'favorable' as const }),
      ),
    ];
    expect(completion(items)).toBe(100);
  });

  it('compte une case explorée, pas le nombre de constats', () => {
    const unSeulDomaine = [
      item({ side: 'interne', category: 'humain', polarity: 'favorable' }),
      item({ side: 'interne', category: 'humain', polarity: 'defavorable' }),
      item({ side: 'interne', category: 'humain', polarity: 'favorable' }),
    ];
    // 1 case sur 12 : le pourcentage ne bouge pas avec le nombre de constats.
    expect(completion(unSeulDomaine)).toBe(8);
  });
});
