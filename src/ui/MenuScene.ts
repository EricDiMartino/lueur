import Phaser from 'phaser';
import { COMMANDES, creerBouton, CREME, dessinerPanneau, OR, type Bouton } from './panneau';

export interface OptionsMenu {
  modeBalade: boolean;
  surReprendre: () => void;
  surModeBalade: (actif: boolean) => void;
  surRecommencer: () => void;
}

/**
 * Menu de pause, ouvert avec Échap.
 *
 * Il met le monde en pause, rappelle les commandes et donne accès au mode
 * balade sans avoir à connaître un raccourci. Tout est cliquable : à 9 ans,
 * on tend la main vers la souris avant de chercher une touche.
 */
export class MenuScene extends Phaser.Scene {
  private boutons: Bouton[] = [];
  private selection = 0;
  private options!: OptionsMenu;

  constructor() {
    super({ key: 'menu', active: false });
  }

  create(options: OptionsMenu): void {
    // Même raison que pour l'interface : la liste survivrait à la fermeture.
    this.boutons = [];
    this.selection = 0;
    this.options = options;
    const { width, height } = this.scale;

    this.add.rectangle(0, 0, width, height, 0x0b1b2a, 0.72).setOrigin(0, 0);

    const fond = this.add.graphics();
    dessinerPanneau(fond, width / 2 - 250, height / 2 - 232, 500, 472);

    this.add
      .text(width / 2, height / 2 - 198, 'Pause', {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '30px',
        color: OR,
      })
      .setOrigin(0.5);

    const actions = [
      { libelle: 'Reprendre', action: () => this.fermer() },
      {
        libelle: options.modeBalade ? 'Arrêter le mode balade' : 'Mode balade',
        action: () => {
          this.options.surModeBalade(!this.options.modeBalade);
          this.fermer();
        },
      },
      { libelle: 'Recommencer une partie', action: () => this.options.surRecommencer() },
    ];

    actions.forEach((a, i) => {
      this.boutons.push(creerBouton(this, width / 2, height / 2 - 134 + i * 60, 330, a.libelle, a.action));
    });
    this.majSelection();

    this.afficherLesCommandes(width / 2, height / 2 + 74);
    this.brancherLeClavier();
  }

  private afficherLesCommandes(cx: number, y: number): void {
    this.add
      .text(cx, y - 8, 'Commandes', {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '16px',
        color: OR,
      })
      .setOrigin(0.5);

    COMMANDES.forEach((c, i) => {
      const ly = y + 20 + i * 22;
      this.add
        .text(cx - 200, ly, c.touche, { fontFamily: 'system-ui, sans-serif', fontSize: '15px', color: OR })
        .setOrigin(0, 0.5);
      this.add
        .text(cx - 100, ly, c.action, { fontFamily: 'system-ui, sans-serif', fontSize: '15px', color: CREME })
        .setOrigin(0, 0.5);
    });
  }

  private brancherLeClavier(): void {
    const clavier = this.input.keyboard;
    if (!clavier) return;
    const T = Phaser.Input.Keyboard.KeyCodes;

    clavier.on('keydown', (evenement: KeyboardEvent) => {
      if (evenement.keyCode === T.ESC) this.fermer();
      else if (evenement.keyCode === T.DOWN || evenement.keyCode === T.S) {
        this.selection = (this.selection + 1) % this.boutons.length;
        this.majSelection();
      } else if (evenement.keyCode === T.UP || evenement.keyCode === T.Z || evenement.keyCode === T.W) {
        this.selection = (this.selection + this.boutons.length - 1) % this.boutons.length;
        this.majSelection();
      } else if (evenement.keyCode === T.ENTER || evenement.keyCode === T.SPACE) {
        this.boutons[this.selection]?.activer();
      }
    });
  }

  private majSelection(): void {
    this.boutons.forEach((b, i) => b.survoler(i === this.selection));
  }

  private fermer(): void {
    this.options.surReprendre();
    this.scene.stop();
  }
}
