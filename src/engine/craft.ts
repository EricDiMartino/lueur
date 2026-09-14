import { ajouter, quantite, retirer, type Inventaire } from './inventaire';

/**
 * Fabrication. Logique pure, sans Phaser.
 *
 * Une recette ne se fabrique jamais à moitié : soit tous les ingrédients sont
 * là et le résultat tient dans le sac, soit rien ne bouge. Perdre des
 * ingrédients sans rien obtenir serait incompréhensible.
 */

export interface Ingredient {
  objet: string;
  quantite: number;
}

export interface Recette {
  id: string;
  resultat: string;
  quantite: number;
  ingredients: readonly Ingredient[];
  /** Certaines recettes demandent le feu de camp. */
  auFeuDeCamp: boolean;
}

export type RaisonDeRefus = 'ingredients' | 'loin-du-feu' | 'sac-plein';

export interface Faisabilite {
  possible: boolean;
  raison?: RaisonDeRefus;
  /** Ce qui manque, pour pouvoir le dire précisément. */
  manquants: Ingredient[];
}

export function evaluer(
  inventaire: Inventaire,
  recette: Recette,
  pileMaxDuResultat: number,
  presDuFeu: boolean,
): Faisabilite {
  const manquants = recette.ingredients
    .map((i) => ({ objet: i.objet, quantite: i.quantite - quantite(inventaire, i.objet) }))
    .filter((i) => i.quantite > 0);

  if (manquants.length > 0) return { possible: false, raison: 'ingredients', manquants };
  if (recette.auFeuDeCamp && !presDuFeu) return { possible: false, raison: 'loin-du-feu', manquants: [] };

  const place = pileMaxDuResultat - quantite(inventaire, recette.resultat);
  if (place < recette.quantite) return { possible: false, raison: 'sac-plein', manquants: [] };

  return { possible: true, manquants: [] };
}

export interface ResultatFabrication {
  inventaire: Inventaire;
  fabrique: boolean;
}

export function fabriquer(
  inventaire: Inventaire,
  recette: Recette,
  pileMaxDuResultat: number,
  presDuFeu: boolean,
): ResultatFabrication {
  if (!evaluer(inventaire, recette, pileMaxDuResultat, presDuFeu).possible) {
    return { inventaire, fabrique: false };
  }

  let apres = inventaire;
  for (const ingredient of recette.ingredients) {
    apres = retirer(apres, ingredient.objet, ingredient.quantite);
  }
  return {
    inventaire: ajouter(apres, recette.resultat, recette.quantite, pileMaxDuResultat).inventaire,
    fabrique: true,
  };
}
