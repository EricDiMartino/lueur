/**
 * Le sac. Logique pure, sans Phaser : c'est ce qui sera sauvegardé, et ce qui
 * doit rester testable sans lancer le jeu.
 */

export type Inventaire = Readonly<Record<string, number>>;

export const INVENTAIRE_VIDE: Inventaire = Object.freeze({});

export interface ResultatAjout {
  inventaire: Inventaire;
  /** Ce qui est réellement entré dans le sac. Peut être inférieur au demandé. */
  ajoute: number;
  /** Ce qui n'a pas pu entrer, faute de place. */
  refuse: number;
}

/**
 * Ajoute des objets sans jamais dépasser la taille de pile.
 *
 * Le surplus est refusé plutôt que perdu silencieusement : l'interface doit
 * pouvoir dire « ton sac est plein » au lieu de laisser disparaître une récolte.
 */
export function ajouter(
  inventaire: Inventaire,
  objetId: string,
  quantite: number,
  pileMax: number,
): ResultatAjout {
  if (quantite <= 0) return { inventaire, ajoute: 0, refuse: 0 };

  const actuel = inventaire[objetId] ?? 0;
  const place = Math.max(0, pileMax - actuel);
  const ajoute = Math.min(quantite, place);

  if (ajoute === 0) return { inventaire, ajoute: 0, refuse: quantite };

  return {
    inventaire: { ...inventaire, [objetId]: actuel + ajoute },
    ajoute,
    refuse: quantite - ajoute,
  };
}

/** Retire des objets. Ne descend jamais sous zéro. */
export function retirer(inventaire: Inventaire, objetId: string, quantite: number): Inventaire {
  const actuel = inventaire[objetId] ?? 0;
  const restant = Math.max(0, actuel - quantite);
  if (restant === 0) {
    const copie = { ...inventaire };
    delete copie[objetId];
    return copie;
  }
  return { ...inventaire, [objetId]: restant };
}

export function quantite(inventaire: Inventaire, objetId: string): number {
  return inventaire[objetId] ?? 0;
}

export function estVide(inventaire: Inventaire): boolean {
  return Object.keys(inventaire).length === 0;
}
