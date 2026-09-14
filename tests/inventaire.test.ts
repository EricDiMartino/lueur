import { describe, expect, it } from 'vitest';
import { ajouter, estVide, INVENTAIRE_VIDE, quantite, retirer } from '../src/engine/inventaire';

describe('inventaire', () => {
  it('part vide', () => {
    expect(estVide(INVENTAIRE_VIDE)).toBe(true);
    expect(quantite(INVENTAIRE_VIDE, 'bois')).toBe(0);
  });

  it('ajoute et cumule', () => {
    const a = ajouter(INVENTAIRE_VIDE, 'bois', 3, 40).inventaire;
    const b = ajouter(a, 'bois', 5, 40).inventaire;
    expect(quantite(b, 'bois')).toBe(8);
  });

  it('ne dépasse jamais la taille de pile', () => {
    const plein = ajouter(INVENTAIRE_VIDE, 'bois', 100, 40);
    expect(quantite(plein.inventaire, 'bois')).toBe(40);
    expect(plein.ajoute).toBe(40);
    expect(plein.refuse).toBe(60);
  });

  it('signale le refus au lieu de perdre la récolte en silence', () => {
    const plein = ajouter(INVENTAIRE_VIDE, 'baie', 20, 20).inventaire;
    const suivant = ajouter(plein, 'baie', 5, 20);
    expect(suivant.ajoute).toBe(0);
    expect(suivant.refuse).toBe(5);
    expect(suivant.inventaire).toBe(plein);
  });

  it('ne modifie jamais l’inventaire d’origine', () => {
    const depart = ajouter(INVENTAIRE_VIDE, 'bois', 3, 40).inventaire;
    ajouter(depart, 'bois', 10, 40);
    expect(quantite(depart, 'bois')).toBe(3);
  });

  it('retire sans passer sous zéro et nettoie la ligne vidée', () => {
    const depart = ajouter(INVENTAIRE_VIDE, 'bois', 3, 40).inventaire;
    const apres = retirer(depart, 'bois', 10);
    expect(quantite(apres, 'bois')).toBe(0);
    expect(estVide(apres)).toBe(true);
  });

  it('ignore une quantité nulle ou négative', () => {
    expect(ajouter(INVENTAIRE_VIDE, 'bois', 0, 40).inventaire).toBe(INVENTAIRE_VIDE);
    expect(ajouter(INVENTAIRE_VIDE, 'bois', -5, 40).inventaire).toBe(INVENTAIRE_VIDE);
  });
});
