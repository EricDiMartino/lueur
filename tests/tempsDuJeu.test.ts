import { describe, expect, it } from 'vitest';
import {
  DUREE_DU_CYCLE,
  momentDeLaJournee,
  numeroDuJour,
  obscurite,
  OBSCURITE_MAX,
  phase,
  SECONDES_DE_JOUR,
  SECONDES_DE_TRANSITION,
} from '../src/engine/tempsDuJeu';

describe('cycle jour / nuit', () => {
  it('commence au jour 1, en plein jour', () => {
    expect(numeroDuJour(0)).toBe(1);
    expect(phase(0)).toBe('jour');
    expect(obscurite(0)).toBe(0);
  });

  it('change de jour à chaque cycle complet', () => {
    expect(numeroDuJour(DUREE_DU_CYCLE - 1)).toBe(1);
    expect(numeroDuJour(DUREE_DU_CYCLE)).toBe(2);
    expect(numeroDuJour(DUREE_DU_CYCLE * 4 + 5)).toBe(5);
  });

  it('bascule en nuit au bon moment', () => {
    expect(phase(SECONDES_DE_JOUR - 1)).toBe('jour');
    expect(phase(SECONDES_DE_JOUR)).toBe('nuit');
    expect(phase(DUREE_DU_CYCLE - 1)).toBe('nuit');
  });

  it('atteint l’obscurité maximale en pleine nuit', () => {
    expect(obscurite(SECONDES_DE_JOUR + SECONDES_DE_TRANSITION + 1)).toBe(OBSCURITE_MAX);
  });

  it('fond progressivement au coucher, sans bascule nette', () => {
    const avant = obscurite(SECONDES_DE_JOUR - SECONDES_DE_TRANSITION);
    const milieu = obscurite(SECONDES_DE_JOUR - SECONDES_DE_TRANSITION / 2);
    expect(avant).toBe(0);
    expect(milieu).toBeGreaterThan(0);
    expect(milieu).toBeLessThan(OBSCURITE_MAX);
  });

  it('revient au plein jour à la fin du cycle', () => {
    expect(obscurite(DUREE_DU_CYCLE - 1)).toBeLessThan(OBSCURITE_MAX / 10);
    expect(obscurite(DUREE_DU_CYCLE)).toBe(0);
  });

  it('ne sort jamais des bornes, sur plusieurs jours', () => {
    for (let t = 0; t < DUREE_DU_CYCLE * 3; t += 7) {
      const o = obscurite(t);
      expect(o).toBeGreaterThanOrEqual(0);
      expect(o).toBeLessThanOrEqual(OBSCURITE_MAX);
    }
  });

  it('nomme les moments de la journée sans chiffre', () => {
    expect(momentDeLaJournee(0)).toBe('Matin');
    expect(momentDeLaJournee(SECONDES_DE_JOUR / 2)).toBe('Midi');
    expect(momentDeLaJournee(SECONDES_DE_JOUR - 10)).toBe('Soir');
    expect(momentDeLaJournee(SECONDES_DE_JOUR + 10)).toBe('Nuit');
  });
});
