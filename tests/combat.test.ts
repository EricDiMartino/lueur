import { describe, expect, it } from 'vitest';
import {
  avancerCreature,
  blesserCreature,
  estDansLArc,
  estVaincue,
  MS_AVANT_DE_FRAPPER,
  PORTEE_EPEE,
  type Creature,
} from '../src/engine/combat';

const neuve = (): Creature => ({ pointsDeVie: 2, etat: 'approche', msDansLEtat: 0 });

describe('combat', () => {
  it('annonce son coup avant de frapper', () => {
    const apres = avancerCreature(neuve(), 16, true);
    expect(apres.creature.etat).toBe('annonce');
    expect(apres.frappeMaintenant).toBe(false);
  });

  it('ne frappe qu’au bout du délai d’annonce', () => {
    let c = avancerCreature(neuve(), 16, true).creature;
    let frappe = false;
    for (let t = 0; t < MS_AVANT_DE_FRAPPER; t += 16) {
      const r = avancerCreature(c, 16, true);
      c = r.creature;
      frappe = frappe || r.frappeMaintenant;
    }
    expect(frappe).toBe(true);
  });

  it('s’éloigner pendant l’annonce suffit à éviter le coup', () => {
    let c = avancerCreature(neuve(), 16, true).creature;
    let frappe = false;
    for (let t = 0; t < MS_AVANT_DE_FRAPPER + 100; t += 16) {
      const r = avancerCreature(c, 16, false);
      c = r.creature;
      frappe = frappe || r.frappeMaintenant;
    }
    expect(frappe).toBe(false);
  });

  it('ne frappe jamais sans être passée par l’annonce', () => {
    const r = avancerCreature(neuve(), 5000, false);
    expect(r.frappeMaintenant).toBe(false);
    expect(r.creature.etat).toBe('approche');
  });

  it('perd des points de vie sans passer sous zéro', () => {
    expect(blesserCreature(neuve(), 10).pointsDeVie).toBe(0);
    expect(estVaincue(blesserCreature(neuve(), 10))).toBe(true);
    expect(estVaincue(blesserCreature(neuve(), 1))).toBe(false);
  });

  it('le coup d’épée porte devant soi et pas derrière', () => {
    expect(estDansLArc(0, 0, 1, 0, 30, 0)).toBe(true);
    expect(estDansLArc(0, 0, 1, 0, -30, 0)).toBe(false);
  });

  it('le coup d’épée s’arrête à sa portée', () => {
    expect(estDansLArc(0, 0, 1, 0, PORTEE_EPEE, 0)).toBe(true);
    expect(estDansLArc(0, 0, 1, 0, PORTEE_EPEE + 1, 0)).toBe(false);
  });
});
