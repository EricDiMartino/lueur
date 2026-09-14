/**
 * Faim et cœurs. Logique pure, sans Phaser.
 *
 * Toute la difficulté du jeu tient dans ces quelques constantes. Elles sont
 * réglées pour une joueuse de 9 ans : la faim rythme l'exploration, elle ne la
 * punit pas. Voir GAME_DESIGN.md § 3.
 */

export const COEURS_MAX = 3;
export const FAIM_MAX = 100;

/** La jauge se vide en 15 minutes de jeu. */
export const SECONDES_POUR_VIDER_LA_FAIM = 900;
/** Ventre vide : un cœur toutes les 20 s. Jamais de mort brutale. */
export const SECONDES_PAR_COEUR_PERDU = 20;
/** Ventre vide : on ralentit, ce qui se sent avant que ça fasse mal. */
export const RALENTISSEMENT_VENTRE_VIDE = 0.6;

export interface Survie {
  coeurs: number;
  faim: number;
  /** Compteur interne d'accumulation, pour ne pas perdre les fractions de seconde. */
  secondesVentreVide: number;
}

export const SURVIE_NEUVE: Survie = Object.freeze({
  coeurs: COEURS_MAX,
  faim: FAIM_MAX,
  secondesVentreVide: 0,
});

export interface Evolution {
  survie: Survie;
  /** Passé à true sur la transition vers zéro cœur, une seule fois. */
  vientDeTomber: boolean;
}

/**
 * Fait avancer la survie de `secondes`.
 *
 * `modeBalade` neutralise la faim : c'est l'invariant 7, une joueuse qui veut
 * seulement explorer ne doit rien avoir à gérer.
 */
export function avancer(survie: Survie, secondes: number, modeBalade = false): Evolution {
  if (modeBalade || secondes <= 0) return { survie, vientDeTomber: false };

  const taux = FAIM_MAX / SECONDES_POUR_VIDER_LA_FAIM;
  const faim = Math.max(0, survie.faim - taux * secondes);

  // Un même appel peut couvrir la fin de la jauge et la suite. Seule la part
  // réellement passée le ventre vide compte, sinon une longue image de jeu
  // coûterait des cœurs qu'on n'a pas eu le temps de perdre.
  const secondesAvantLeVide = survie.faim / taux;
  const secondesAJeun = Math.max(0, secondes - secondesAvantLeVide);

  if (secondesAJeun === 0) {
    return { survie: { ...survie, faim, secondesVentreVide: 0 }, vientDeTomber: false };
  }

  const accumule = survie.secondesVentreVide + secondesAJeun;
  const coeursPerdus = Math.floor(accumule / SECONDES_PAR_COEUR_PERDU);
  const coeurs = Math.max(0, survie.coeurs - coeursPerdus);

  return {
    survie: {
      coeurs,
      faim: 0,
      secondesVentreVide: accumule - coeursPerdus * SECONDES_PAR_COEUR_PERDU,
    },
    vientDeTomber: coeurs === 0 && survie.coeurs > 0,
  };
}

/** Applique des dégâts. Ne descend jamais sous zéro. */
export function blesser(survie: Survie, degats: number): Evolution {
  const coeurs = Math.max(0, survie.coeurs - Math.max(0, degats));
  return { survie: { ...survie, coeurs }, vientDeTomber: coeurs === 0 && survie.coeurs > 0 };
}

export function manger(survie: Survie, satiete: number): Survie {
  return { ...survie, faim: Math.min(FAIM_MAX, survie.faim + satiete), secondesVentreVide: 0 };
}

/**
 * État après un réveil au campement.
 *
 * Invariant 1 : pas d'écran de game over, on se réveille. Le ventre est
 * à moitié plein pour ne pas retomber aussitôt.
 */
export function reveil(): Survie {
  return { coeurs: COEURS_MAX, faim: FAIM_MAX / 2, secondesVentreVide: 0 };
}

export function estAffaiblie(survie: Survie): boolean {
  return survie.faim <= 0;
}

export function facteurDeVitesse(survie: Survie): number {
  return estAffaiblie(survie) ? RALENTISSEMENT_VENTRE_VIDE : 1;
}
