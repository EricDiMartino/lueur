import { describe, expect, it } from 'vitest';
import {
  avancer,
  blesser,
  COEURS_MAX,
  estAffaiblie,
  facteurDeVitesse,
  FAIM_MAX,
  manger,
  reveil,
  SECONDES_PAR_COEUR_PERDU,
  SECONDES_POUR_VIDER_LA_FAIM,
  SURVIE_NEUVE,
} from '../src/engine/survie';

describe('survie', () => {
  it('démarre le ventre plein et en pleine forme', () => {
    expect(SURVIE_NEUVE).toEqual({ coeurs: COEURS_MAX, faim: FAIM_MAX, secondesVentreVide: 0 });
  });

  it('vide la jauge de faim dans le temps annoncé', () => {
    const apres = avancer(SURVIE_NEUVE, SECONDES_POUR_VIDER_LA_FAIM).survie;
    expect(apres.faim).toBe(0);
    expect(apres.coeurs).toBe(COEURS_MAX);
  });

  it('ne touche pas aux cœurs tant qu’il reste de la faim', () => {
    const apres = avancer(SURVIE_NEUVE, SECONDES_POUR_VIDER_LA_FAIM - 1).survie;
    expect(apres.faim).toBeGreaterThan(0);
    expect(apres.coeurs).toBe(COEURS_MAX);
  });

  it('grignote un cœur toutes les 20 s le ventre vide, sans jamais tuer d’un coup', () => {
    const vide = avancer(SURVIE_NEUVE, SECONDES_POUR_VIDER_LA_FAIM).survie;
    const apresUn = avancer(vide, SECONDES_PAR_COEUR_PERDU).survie;
    expect(apresUn.coeurs).toBe(COEURS_MAX - 1);
  });

  it('n’accumule pas de dette de cœurs sous zéro', () => {
    const vide = avancer(SURVIE_NEUVE, SECONDES_POUR_VIDER_LA_FAIM).survie;
    const apres = avancer(vide, SECONDES_PAR_COEUR_PERDU * 10).survie;
    expect(apres.coeurs).toBe(0);
  });

  it('signale la chute une seule fois', () => {
    const presqueVide = { coeurs: 1, faim: 0, secondesVentreVide: 0 };
    const premier = avancer(presqueVide, SECONDES_PAR_COEUR_PERDU);
    expect(premier.vientDeTomber).toBe(true);
    expect(avancer(premier.survie, SECONDES_PAR_COEUR_PERDU).vientDeTomber).toBe(false);
  });

  it('ne perd pas les fractions de seconde entre deux images', () => {
    const vide = avancer(SURVIE_NEUVE, SECONDES_POUR_VIDER_LA_FAIM).survie;
    let etat = vide;
    for (let i = 0; i < SECONDES_PAR_COEUR_PERDU * 60; i++) etat = avancer(etat, 1 / 60).survie;
    expect(etat.coeurs).toBe(COEURS_MAX - 1);
  });

  it('mange sans jamais dépasser le maximum', () => {
    expect(manger({ coeurs: 3, faim: 95, secondesVentreVide: 0 }, 15).faim).toBe(FAIM_MAX);
  });

  it('le mode balade gèle complètement la faim', () => {
    const apres = avancer(SURVIE_NEUVE, SECONDES_POUR_VIDER_LA_FAIM * 3, true).survie;
    expect(apres).toBe(SURVIE_NEUVE);
  });

  it('blesse sans passer sous zéro', () => {
    expect(blesser({ coeurs: 1, faim: 50, secondesVentreVide: 0 }, 5).survie.coeurs).toBe(0);
  });

  it('se réveille en forme, le ventre à moitié plein', () => {
    expect(reveil()).toEqual({ coeurs: COEURS_MAX, faim: FAIM_MAX / 2, secondesVentreVide: 0 });
  });

  it('ralentit le ventre vide, et seulement là', () => {
    expect(facteurDeVitesse(SURVIE_NEUVE)).toBe(1);
    expect(estAffaiblie(SURVIE_NEUVE)).toBe(false);
    const vide = avancer(SURVIE_NEUVE, SECONDES_POUR_VIDER_LA_FAIM).survie;
    expect(estAffaiblie(vide)).toBe(true);
    expect(facteurDeVitesse(vide)).toBeLessThan(1);
  });
});
