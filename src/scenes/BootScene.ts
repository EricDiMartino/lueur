import Phaser from 'phaser';
import { objets } from '../content';

/**
 * Palier 0 : pas encore de jeu, seulement la preuve que la chaîne complète
 * fonctionne — build, validation du contenu, déploiement, affichage.
 */
export class BootScene extends Phaser.Scene {
  constructor() {
    super('boot');
  }

  create(): void {
    const { width, height } = this.scale;

    this.cameras.main.setBackgroundColor('#1b2b34');

    this.add
      .text(width / 2, height / 2 - 60, 'Lueur', {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '64px',
        color: '#f2c14e',
      })
      .setOrigin(0.5);

    this.add
      .text(width / 2, height / 2 + 10, 'Palier 0 — les fondations tiennent', {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '20px',
        color: '#9fb3bd',
      })
      .setOrigin(0.5);

    this.add
      .text(width / 2, height / 2 + 60, `${objets.length} objets chargés et validés`, {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '16px',
        color: '#6b8592',
      })
      .setOrigin(0.5);
  }
}
