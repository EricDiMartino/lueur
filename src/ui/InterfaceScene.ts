import Phaser from 'phaser';
import { objets } from '../content';
import type { Inventaire } from '../engine/inventaire';

/**
 * Interface fixe, superposée au monde.
 *
 * Invariant 4 de GAME_DESIGN.md : un seul objectif affiché à la fois, en haut à
 * gauche, en une phrase courte. Cette scène est le seul endroit autorisé à
 * afficher un objectif.
 */

const VERT_PANNEAU = 0x1e3a2f;
const CREME = '#f6e7c1';
const OPACITE_PANNEAU = 0.86;
const MARGE = 16;
const RAYON = 14;

export class InterfaceScene extends Phaser.Scene {
  private objectif!: Phaser.GameObjects.Text;
  private panneauObjectif!: Phaser.GameObjects.Graphics;

  private sac!: Phaser.GameObjects.Container;
  private lignesSac: { icone: Phaser.GameObjects.Image; compte: Phaser.GameObjects.Text }[] = [];

  private message!: Phaser.GameObjects.Text;
  private panneauMessage!: Phaser.GameObjects.Graphics;

  /** Le monde peut appeler cette scène avant que Phaser l'ait créée. On retient
   *  alors le dernier état connu et on l'applique à la création. */
  private pret = false;
  private sacEnAttente: Inventaire | null = null;

  constructor() {
    super({ key: 'interface', active: false });
  }

  create(): void {
    this.panneauObjectif = this.add.graphics();
    this.objectif = this.add
      .text(MARGE + 18, MARGE + 13, '', {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '17px',
        color: CREME,
      })
      .setOrigin(0, 0);

    this.construireSac();

    this.panneauMessage = this.add.graphics().setVisible(false);
    this.message = this.add
      .text(0, 0, '', {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '16px',
        color: '#ffd9a0',
      })
      .setOrigin(0.5, 0.5)
      .setVisible(false);

    this.pret = true;
    this.definirObjectif('Ramasse du bois et des baies');
    this.majSac(this.sacEnAttente ?? {});
  }

  private panneau(g: Phaser.GameObjects.Graphics, x: number, y: number, l: number, h: number): void {
    g.clear();
    g.fillStyle(VERT_PANNEAU, OPACITE_PANNEAU);
    g.fillRoundedRect(x, y, l, h, RAYON);
    g.lineStyle(2, 0x3c6552, 0.9);
    g.strokeRoundedRect(x, y, l, h, RAYON);
  }

  definirObjectif(texte: string): void {
    this.objectif.setText(texte);
    this.panneau(this.panneauObjectif, MARGE, MARGE, this.objectif.width + 36, 42);
  }

  /**
   * Le sac n'affiche que ce que la joueuse possède. Une ligne apparaît au
   * premier ramassage : montrer des cases vides d'avance n'apprend rien et
   * encombre l'écran.
   */
  private construireSac(): void {
    this.sac = this.add.container(0, 0);
    const fond = this.add.graphics();
    this.sac.add(fond);
    this.sac.setData('fond', fond);

    for (const definition of objets) {
      if (!definition.icone) continue;
      const icone = this.add.image(0, 0, definition.icone).setVisible(false);
      // Les sprites sources n'ont pas la même taille : on les ramène à 30 px de haut.
      icone.setScale(30 / icone.height);
      icone.setOrigin(0.5, 0.5);

      const compte = this.add
        .text(0, 0, '0', {
          fontFamily: 'system-ui, sans-serif',
          fontSize: '17px',
          color: CREME,
        })
        .setOrigin(0, 0.5)
        .setVisible(false);

      this.sac.add([icone, compte]);
      this.lignesSac.push({ icone, compte });
      this.sac.setData(definition.id, this.lignesSac.length - 1);
    }
  }

  majSac(inventaire: Inventaire): void {
    if (!this.pret) {
      this.sacEnAttente = inventaire;
      return;
    }
    const presents = objets.filter((o) => o.icone && (inventaire[o.id] ?? 0) > 0);
    const fond = this.sac.getData('fond') as Phaser.GameObjects.Graphics;

    for (const ligne of this.lignesSac) {
      ligne.icone.setVisible(false);
      ligne.compte.setVisible(false);
    }

    if (presents.length === 0) {
      fond.clear();
      return;
    }

    const LARGEUR_LIGNE = 84;
    const hauteur = 48;
    const largeur = presents.length * LARGEUR_LIGNE + 24;
    const x = (this.scale.width - largeur) / 2;
    const y = this.scale.height - hauteur - MARGE;

    this.panneau(fond, x, y, largeur, hauteur);

    presents.forEach((definition, i) => {
      const index = this.sac.getData(definition.id) as number;
      const ligne = this.lignesSac[index];
      if (!ligne) return;
      const cx = x + 24 + i * LARGEUR_LIGNE;
      ligne.icone.setPosition(cx, y + hauteur / 2).setVisible(true);
      ligne.compte
        .setText(String(inventaire[definition.id] ?? 0))
        .setPosition(cx + 20, y + hauteur / 2)
        .setVisible(true);
    });
  }

  /** Message court et centré, qui s'efface seul. Sert à dire « sac plein ». */
  messagePassager(texte: string): void {
    // Un message fugace perdu pendant le tout premier dixième de seconde n'a
    // aucune conséquence : on l'abandonne plutôt que de le différer.
    if (!this.pret) return;
    this.message.setText(texte).setVisible(true).setAlpha(1);
    this.message.setPosition(this.scale.width / 2, this.scale.height - 110);

    const l = this.message.width + 36;
    const h = 40;
    this.panneau(this.panneauMessage, this.message.x - l / 2, this.message.y - h / 2, l, h);
    this.panneauMessage.setVisible(true).setAlpha(1);

    this.tweens.killTweensOf([this.message, this.panneauMessage]);
    this.tweens.add({
      targets: [this.message, this.panneauMessage],
      alpha: 0,
      delay: 1400,
      duration: 400,
      onComplete: () => {
        this.message.setVisible(false);
        this.panneauMessage.setVisible(false);
      },
    });
  }
}
