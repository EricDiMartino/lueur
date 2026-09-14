import Phaser from 'phaser';

/**
 * Interface fixe, superposée au monde.
 *
 * Invariant 4 de GAME_DESIGN.md : un seul objectif affiché à la fois, en haut à
 * gauche, en une phrase courte. Cette scène est le seul endroit autorisé à
 * afficher un objectif.
 */
export class InterfaceScene extends Phaser.Scene {
  private objectif!: Phaser.GameObjects.Text;
  private fond!: Phaser.GameObjects.Rectangle;

  constructor() {
    super({ key: 'interface', active: false });
  }

  create(): void {
    this.fond = this.add.rectangle(16, 16, 10, 34, 0x1b2b34, 0.75).setOrigin(0, 0);

    this.objectif = this.add
      .text(28, 24, '', {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '18px',
        color: '#f6e7c1',
      })
      .setOrigin(0, 0);

    this.definirObjectif('Explore la clairière');
  }

  definirObjectif(texte: string): void {
    this.objectif.setText(texte);
    // Le fond suit le texte : une phrase courte ne doit pas traîner une bande vide.
    this.fond.setSize(this.objectif.width + 24, 34);
  }
}
