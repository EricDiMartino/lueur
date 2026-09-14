import { describe, expect, it } from 'vitest';
import { objet, objets } from '../src/content';
import { CatalogueObjetsSchema } from '../src/content/schemas';

describe('catalogue d’objets', () => {
  it('se charge et se valide', () => {
    expect(objets.length).toBeGreaterThan(0);
  });

  it('expose des identifiants uniques', () => {
    const ids = objets.map((o) => o.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('refuse deux objets partageant un identifiant', () => {
    const doublon = [objets[0], objets[0]];
    expect(CatalogueObjetsSchema.safeParse(doublon).success).toBe(false);
  });

  it('signale clairement un objet inconnu', () => {
    expect(() => objet('objet_qui_nexiste_pas')).toThrow(/Objet inconnu/);
  });
});
