/**
 * Choix de la cible de récolte. Logique pure, sans Phaser.
 *
 * La règle compte plus qu'elle n'en a l'air : à 9 ans, on appuie sur la touche
 * en étant approximativement au bon endroit. Viser trop juste rend le jeu
 * frustrant, viser trop large fait récolter la mauvaise chose.
 */

export interface CibleRecolte {
  /** Identifiant du décor posé, unique sur la carte. */
  id: number;
  x: number;
  y: number;
  /** Un décor épuisé attend sa repousse : il ne peut pas être visé. */
  disponible: boolean;
}

/** Rayon d'action autour du personnage, en pixels. Généreux volontairement. */
export const PORTEE = 56;

/**
 * Renvoie la cible disponible la plus proche dans la portée, ou null.
 *
 * À égalité de distance, la première de la liste gagne — l'ordre de la carte
 * est stable, donc le comportement l'est aussi.
 */
export function cibleLaPlusProche(
  joueurX: number,
  joueurY: number,
  cibles: readonly CibleRecolte[],
  portee: number = PORTEE,
): CibleRecolte | null {
  let meilleure: CibleRecolte | null = null;
  let meilleureDistance = portee * portee;

  for (const cible of cibles) {
    if (!cible.disponible) continue;
    const dx = cible.x - joueurX;
    const dy = cible.y - joueurY;
    const distance = dx * dx + dy * dy;
    if (distance <= meilleureDistance) {
      // `<=` exclu volontairement pour ne pas remplacer à égalité stricte.
      if (distance < meilleureDistance || meilleure === null) {
        meilleureDistance = distance;
        meilleure = cible;
      }
    }
  }

  return meilleure;
}
