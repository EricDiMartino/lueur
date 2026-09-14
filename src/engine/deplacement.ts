/**
 * Lecture des commandes de déplacement, indépendante de Phaser pour rester
 * testable. Les trois jeux de touches sont actifs en permanence : flèches pour
 * la joueuse, ZQSD et WASD pour les claviers des adultes.
 */

export interface Commandes {
  haut: boolean;
  bas: boolean;
  gauche: boolean;
  droite: boolean;
}

export type Direction = 'haut' | 'bas' | 'gauche' | 'droite';

export interface Vitesse {
  vx: number;
  vy: number;
  /** null quand le personnage est à l'arrêt. */
  direction: Direction | null;
}

/**
 * Convertit les commandes en vitesse. La diagonale est normalisée : sans ça on
 * se déplace 40 % plus vite en biais, ce qui se sent immédiatement à la manette
 * comme au clavier.
 */
export function calculerVitesse(c: Commandes, vitesse: number): Vitesse {
  const x = (c.droite ? 1 : 0) - (c.gauche ? 1 : 0);
  const y = (c.bas ? 1 : 0) - (c.haut ? 1 : 0);

  if (x === 0 && y === 0) return { vx: 0, vy: 0, direction: null };

  const norme = Math.hypot(x, y);
  const vx = (x / norme) * vitesse;
  const vy = (y / norme) * vitesse;

  // Le sprite regarde en priorité à gauche ou à droite : en diagonale, une
  // silhouette de profil est plus lisible qu'une silhouette de dos.
  let direction: Direction;
  if (x !== 0) direction = x > 0 ? 'droite' : 'gauche';
  else direction = y > 0 ? 'bas' : 'haut';

  return { vx, vy, direction };
}
