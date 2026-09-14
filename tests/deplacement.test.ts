import { describe, expect, it } from 'vitest';
import { calculerVitesse, type Commandes } from '../src/engine/deplacement';

const aucune: Commandes = { haut: false, bas: false, gauche: false, droite: false };

describe('déplacement', () => {
  it('reste immobile sans commande', () => {
    expect(calculerVitesse(aucune, 100)).toEqual({ vx: 0, vy: 0, direction: null });
  });

  it('applique la vitesse pleine en ligne droite', () => {
    const v = calculerVitesse({ ...aucune, droite: true }, 100);
    expect(v.vx).toBe(100);
    expect(v.vy).toBe(0);
    expect(v.direction).toBe('droite');
  });

  it('normalise la diagonale : pas plus rapide en biais', () => {
    const droite = calculerVitesse({ ...aucune, droite: true }, 100);
    const diagonale = calculerVitesse({ ...aucune, droite: true, bas: true }, 100);
    expect(Math.hypot(diagonale.vx, diagonale.vy)).toBeCloseTo(Math.hypot(droite.vx, droite.vy), 5);
  });

  it('privilégie le profil en diagonale', () => {
    expect(calculerVitesse({ ...aucune, droite: true, haut: true }, 100).direction).toBe('droite');
  });

  it('annule deux commandes opposées', () => {
    expect(calculerVitesse({ ...aucune, gauche: true, droite: true }, 100).direction).toBeNull();
  });
});
