/**
 * Cycle jour / nuit. Logique pure, sans Phaser.
 *
 * La nuit assombrit et fait apparaître quelques créatures, elle ne met pas la
 * partie en péril : le campement reste sûr et éclairé. Voir GAME_DESIGN.md § 3.
 */

export const SECONDES_DE_JOUR = 360;
export const SECONDES_DE_NUIT = 120;
export const DUREE_DU_CYCLE = SECONDES_DE_JOUR + SECONDES_DE_NUIT;

/** Durée du fondu entre jour et nuit. Une bascule nette serait brutale. */
export const SECONDES_DE_TRANSITION = 30;
/** Assombrissement maximal. Au-delà on ne voit plus assez pour jouer. */
export const OBSCURITE_MAX = 0.5;

export type Phase = 'jour' | 'nuit';

export function numeroDuJour(secondesEcoulees: number): number {
  return Math.floor(secondesEcoulees / DUREE_DU_CYCLE) + 1;
}

/** Position dans le cycle courant, en secondes. */
function positionDansLeCycle(secondesEcoulees: number): number {
  return ((secondesEcoulees % DUREE_DU_CYCLE) + DUREE_DU_CYCLE) % DUREE_DU_CYCLE;
}

export function phase(secondesEcoulees: number): Phase {
  return positionDansLeCycle(secondesEcoulees) < SECONDES_DE_JOUR ? 'jour' : 'nuit';
}

/**
 * Niveau d'assombrissement, de 0 (plein jour) à OBSCURITE_MAX (pleine nuit),
 * avec un fondu de part et d'autre du coucher et du lever.
 */
export function obscurite(secondesEcoulees: number): number {
  const t = positionDansLeCycle(secondesEcoulees);
  const debutNuit = SECONDES_DE_JOUR;

  // Coucher : on s'assombrit progressivement avant la tombée de la nuit.
  if (t >= debutNuit - SECONDES_DE_TRANSITION && t < debutNuit) {
    return OBSCURITE_MAX * ((t - (debutNuit - SECONDES_DE_TRANSITION)) / SECONDES_DE_TRANSITION);
  }
  // Lever : on s'éclaircit sur la fin de la nuit.
  if (t >= DUREE_DU_CYCLE - SECONDES_DE_TRANSITION) {
    return OBSCURITE_MAX * ((DUREE_DU_CYCLE - t) / SECONDES_DE_TRANSITION);
  }
  return t < debutNuit ? 0 : OBSCURITE_MAX;
}

/** Libellé court affiché à la joueuse. Pas de chiffre : elle a 9 ans. */
export function momentDeLaJournee(secondesEcoulees: number): string {
  const t = positionDansLeCycle(secondesEcoulees);
  if (t < SECONDES_DE_JOUR / 3) return 'Matin';
  if (t < (SECONDES_DE_JOUR * 2) / 3) return 'Midi';
  if (t < SECONDES_DE_JOUR) return 'Soir';
  return 'Nuit';
}
