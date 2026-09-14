import Phaser from 'phaser';

/**
 * Habillage commun de l'interface : panneaux arrondis vert sombre, texte crème.
 * Centralisé pour que le titre, le menu et l'interface de jeu se ressemblent.
 */

export const VERT_PANNEAU = 0x1e3a2f;
export const BORD_PANNEAU = 0x3c6552;
export const VERT_SURVOL = 0x2c5744;
export const CREME = '#f6e7c1';
export const OR = '#ffe9a8';
export const OPACITE_PANNEAU = 0.9;
export const RAYON = 14;

export function dessinerPanneau(
  g: Phaser.GameObjects.Graphics,
  x: number,
  y: number,
  largeur: number,
  hauteur: number,
  couleur = VERT_PANNEAU,
  opacite = OPACITE_PANNEAU,
): void {
  g.clear();
  g.fillStyle(couleur, opacite);
  g.fillRoundedRect(x, y, largeur, hauteur, RAYON);
  g.lineStyle(2, BORD_PANNEAU, 0.9);
  g.strokeRoundedRect(x, y, largeur, hauteur, RAYON);
}

export interface Bouton {
  fond: Phaser.GameObjects.Graphics;
  texte: Phaser.GameObjects.Text;
  activer(): void;
  survoler(actif: boolean): void;
  detruire(): void;
}

/**
 * Bouton cliquable **et** navigable au clavier.
 *
 * Les deux comptent : une enfant de 9 ans tend la main vers la souris, un
 * adulte tape au clavier. N'en proposer qu'un seul exclut quelqu'un.
 */
export function creerBouton(
  scene: Phaser.Scene,
  x: number,
  y: number,
  largeur: number,
  libelle: string,
  auClic: () => void,
  hauteur = 52,
): Bouton {
  const fond = scene.add.graphics();
  const texte = scene.add
    .text(x, y, libelle, { fontFamily: 'system-ui, sans-serif', fontSize: '20px', color: CREME })
    .setOrigin(0.5);

  let survole = false;
  const redessiner = () => {
    dessinerPanneau(fond, x - largeur / 2, y - hauteur / 2, largeur, hauteur, survole ? VERT_SURVOL : VERT_PANNEAU, 0.95);
    texte.setColor(survole ? OR : CREME);
  };
  redessiner();

  const zone = scene.add
    .zone(x, y, largeur, hauteur)
    .setOrigin(0.5)
    .setInteractive({ useHandCursor: true });

  zone.on('pointerover', () => { survole = true; redessiner(); });
  zone.on('pointerout', () => { survole = false; redessiner(); });
  zone.on('pointerdown', auClic);

  return {
    fond,
    texte,
    activer: auClic,
    survoler(actif: boolean) { survole = actif; redessiner(); },
    detruire() { fond.destroy(); texte.destroy(); zone.destroy(); },
  };
}

/** Les commandes du jeu, en un seul endroit : elles sont affichées à trois endroits. */
export const COMMANDES: readonly { touche: string; action: string }[] = [
  { touche: '← ↑ ↓ →', action: 'Se déplacer' },
  { touche: 'E', action: 'Ramasser' },
  { touche: 'A', action: 'Manger' },
  { touche: 'C', action: 'Fabriquer, près du feu' },
  { touche: 'Espace', action: 'Donner un coup d’épée' },
  { touche: 'Échap', action: 'Ouvrir le menu' },
];
