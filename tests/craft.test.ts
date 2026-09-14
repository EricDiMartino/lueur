import { describe, expect, it } from 'vitest';
import { evaluer, fabriquer, type Recette } from '../src/engine/craft';

const hache: Recette = {
  id: 'hache_bois',
  resultat: 'hache_bois',
  quantite: 1,
  ingredients: [{ objet: 'bois', quantite: 3 }],
  auFeuDeCamp: true,
};

describe('fabrication', () => {
  it('refuse et détaille ce qui manque', () => {
    const r = evaluer({ bois: 1 }, hache, 1, true);
    expect(r.possible).toBe(false);
    expect(r.raison).toBe('ingredients');
    expect(r.manquants).toEqual([{ objet: 'bois', quantite: 2 }]);
  });

  it('refuse loin du feu quand la recette l’exige', () => {
    expect(evaluer({ bois: 5 }, hache, 1, false).raison).toBe('loin-du-feu');
  });

  it('refuse si le résultat ne tient pas dans le sac', () => {
    expect(evaluer({ bois: 5, hache_bois: 1 }, hache, 1, true).raison).toBe('sac-plein');
  });

  it('fabrique, consomme les ingrédients et rend le résultat', () => {
    const r = fabriquer({ bois: 5 }, hache, 1, true);
    expect(r.fabrique).toBe(true);
    expect(r.inventaire).toEqual({ bois: 2, hache_bois: 1 });
  });

  it('ne consomme rien quand la fabrication échoue', () => {
    const depart = { bois: 1 };
    const r = fabriquer(depart, hache, 1, true);
    expect(r.fabrique).toBe(false);
    expect(r.inventaire).toBe(depart);
  });

  it('retire la ligne d’un ingrédient entièrement consommé', () => {
    expect(fabriquer({ bois: 3 }, hache, 1, true).inventaire).toEqual({ hache_bois: 1 });
  });
});
