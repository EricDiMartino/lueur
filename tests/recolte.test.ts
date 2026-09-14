import { describe, expect, it } from 'vitest';
import { cibleLaPlusProche, PORTEE, type CibleRecolte } from '../src/engine/recolte';

const cible = (id: number, x: number, y: number, disponible = true): CibleRecolte => ({
  id, x, y, disponible,
});

describe('choix de la cible de récolte', () => {
  it('ne renvoie rien quand il n’y a rien', () => {
    expect(cibleLaPlusProche(0, 0, [])).toBeNull();
  });

  it('ignore ce qui est hors de portée', () => {
    expect(cibleLaPlusProche(0, 0, [cible(1, PORTEE + 10, 0)])).toBeNull();
  });

  it('prend la plus proche', () => {
    const choisie = cibleLaPlusProche(0, 0, [cible(1, 40, 0), cible(2, 10, 0), cible(3, 30, 0)]);
    expect(choisie?.id).toBe(2);
  });

  it('ignore une cible déjà récoltée', () => {
    const choisie = cibleLaPlusProche(0, 0, [cible(1, 10, 0, false), cible(2, 30, 0)]);
    expect(choisie?.id).toBe(2);
  });

  it('accepte une cible pile à la limite de portée', () => {
    expect(cibleLaPlusProche(0, 0, [cible(1, PORTEE, 0)])?.id).toBe(1);
  });

  it('tranche les égalités par l’ordre de la carte, donc de façon stable', () => {
    const premier = cibleLaPlusProche(0, 0, [cible(1, 20, 0), cible(2, 0, 20)]);
    const second = cibleLaPlusProche(0, 0, [cible(1, 20, 0), cible(2, 0, 20)]);
    expect(premier?.id).toBe(1);
    expect(second?.id).toBe(1);
  });
});
