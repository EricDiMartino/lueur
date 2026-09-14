/**
 * Combat. Logique pure, sans Phaser.
 *
 * L'attaque ennemie est toujours annoncée : la créature se fige et clignote
 * avant de frapper. C'est ce qui rend le combat lisible à 9 ans — sans ce
 * temps mort, se faire toucher paraît arbitraire. Voir GAME_DESIGN.md § 3.
 */

/** Durée pendant laquelle la créature s'immobilise avant de frapper. */
export const MS_AVANT_DE_FRAPPER = 550;
/** Après avoir été touchée, la joueuse est invulnérable le temps de réagir. */
export const MS_INVULNERABILITE = 900;
/** Délai entre deux coups d'épée. */
export const MS_ENTRE_DEUX_COUPS = 450;
/** Portée du coup d'épée, en pixels. */
export const PORTEE_EPEE = 46;

export type EtatCreature = 'approche' | 'annonce' | 'frappe' | 'recul';

export interface Creature {
  pointsDeVie: number;
  etat: EtatCreature;
  /** Temps passé dans l'état courant, en millisecondes. */
  msDansLEtat: number;
}

/**
 * Fait avancer une créature d'un pas de temps.
 *
 * `aPortee` décrit si la joueuse est à portée d'attaque de la créature.
 */
export function avancerCreature(
  creature: Creature,
  ms: number,
  aPortee: boolean,
): { creature: Creature; frappeMaintenant: boolean } {
  const dans = creature.msDansLEtat + ms;

  switch (creature.etat) {
    case 'approche':
      if (aPortee) return { creature: { ...creature, etat: 'annonce', msDansLEtat: 0 }, frappeMaintenant: false };
      return { creature: { ...creature, msDansLEtat: dans }, frappeMaintenant: false };

    case 'annonce':
      if (dans < MS_AVANT_DE_FRAPPER) {
        return { creature: { ...creature, msDansLEtat: dans }, frappeMaintenant: false };
      }
      // On ne frappe que si la joueuse est toujours là : s'éloigner pendant
      // l'annonce doit suffire à éviter le coup, c'est tout l'intérêt du signal.
      return {
        creature: { ...creature, etat: 'recul', msDansLEtat: 0 },
        frappeMaintenant: aPortee,
      };

    case 'frappe':
    case 'recul':
      if (dans < MS_ENTRE_DEUX_COUPS) {
        return { creature: { ...creature, msDansLEtat: dans }, frappeMaintenant: false };
      }
      return { creature: { ...creature, etat: 'approche', msDansLEtat: 0 }, frappeMaintenant: false };
  }
}

export function blesserCreature(creature: Creature, degats: number): Creature {
  return { ...creature, pointsDeVie: Math.max(0, creature.pointsDeVie - Math.max(0, degats)) };
}

export function estVaincue(creature: Creature): boolean {
  return creature.pointsDeVie <= 0;
}

/** Le coup d'épée porte devant soi, dans un demi-disque. */
export function estDansLArc(
  attaquantX: number,
  attaquantY: number,
  regardX: number,
  regardY: number,
  cibleX: number,
  cibleY: number,
  portee = PORTEE_EPEE,
): boolean {
  const dx = cibleX - attaquantX;
  const dy = cibleY - attaquantY;
  if (dx * dx + dy * dy > portee * portee) return false;
  // Produit scalaire positif : la cible est du côté où l'on regarde.
  return dx * regardX + dy * regardY >= 0;
}
