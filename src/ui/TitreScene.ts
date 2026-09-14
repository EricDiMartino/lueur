import Phaser from 'phaser';
import { lire, stockageDuNavigateur } from '../engine/sauvegarde';
import { COMMANDES, creerBouton, CREME, dessinerPanneau, OR, type Bouton } from './panneau';

/**
 * Écran d'accueil.
 *
 * Il existe pour une raison précise : sans lui, personne ne sait quelles touches
 * utiliser. On ne peut pas demander à une enfant de deviner. Les commandes sont
 * donc affichées avant même de commencer.
 */
export class TitreScene extends Phaser.Scene {
  private boutons: Bouton[] = [];
  private selection = 0;

  constructor() {
    super('titre');
  }

  preload(): void {
    this.load.image('princesse-titre', 'assets/sprites/princess.png');
  }

  create(): void {
    this.boutons = [];
    this.selection = 0;
    const { width } = this.scale;
    const cx = width / 2;
    this.cameras.main.setBackgroundColor('#16241d');

    this.add
      .text(cx, 66, 'Lueur', {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '58px',
        color: OR,
      })
      .setOrigin(0.5);

    this.add
      .text(cx, 108, 'Une forêt à explorer', {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '17px',
        color: '#9fb3bd',
      })
      .setOrigin(0.5);

    const partieEnCours = lire(stockageDuNavigateur()) !== null;

    const actions: { libelle: string; action: () => void }[] = [
      { libelle: partieEnCours ? 'Continuer' : 'Jouer', action: () => this.commencer(false) },
      { libelle: 'Mode balade', action: () => this.commencer(true) },
    ];
    if (partieEnCours) {
      actions.push({ libelle: 'Recommencer une partie', action: () => this.recommencer() });
    }

    actions.forEach((a, i) => {
      this.boutons.push(creerBouton(this, cx, 162 + i * 58, 320, a.libelle, a.action, 46));
    });
    this.majSelection();

    this.afficherLesCommandes(cx, 162 + actions.length * 58 + 26);
    this.brancherLeClavier();
  }

  /** Les commandes, visibles dès l'accueil. C'est le point de départ de tout. */
  private afficherLesCommandes(cx: number, haut: number): void {
    const LARGEUR = 680;
    const HAUTEUR_LIGNE = 28;
    const rangees = Math.ceil(COMMANDES.length / 2);
    const hauteur = 46 + rangees * HAUTEUR_LIGNE;

    const fond = this.add.graphics().setDepth(-1);
    dessinerPanneau(fond, cx - LARGEUR / 2, haut, LARGEUR, hauteur);

    this.add
      .text(cx, haut + 20, 'Comment jouer', {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '16px',
        color: OR,
      })
      .setOrigin(0.5);

    COMMANDES.forEach((c, i) => {
      const colonne = i % 2;
      const rangee = Math.floor(i / 2);
      // Deux colonnes larges : la colonne de gauche débordait sur celle de droite.
      const xTouche = cx - LARGEUR / 2 + 28 + colonne * (LARGEUR / 2 - 10);
      const y = haut + 44 + rangee * HAUTEUR_LIGNE + HAUTEUR_LIGNE / 2;

      this.add
        .text(xTouche, y, c.touche, { fontFamily: 'system-ui, sans-serif', fontSize: '15px', color: OR })
        .setOrigin(0, 0.5);
      this.add
        .text(xTouche + 96, y, c.action, { fontFamily: 'system-ui, sans-serif', fontSize: '15px', color: CREME })
        .setOrigin(0, 0.5);
    });
  }

  private brancherLeClavier(): void {
    const clavier = this.input.keyboard;
    if (!clavier) return;
    const T = Phaser.Input.Keyboard.KeyCodes;

    clavier.on('keydown', (evenement: KeyboardEvent) => {
      if (evenement.keyCode === T.DOWN || evenement.keyCode === T.S) {
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

  private commencer(modeBalade: boolean): void {
    this.scene.start('monde', { modeBalade });
  }

  private recommencer(): void {
    this.scene.start('monde', { modeBalade: false, nouvellePartie: true });
  }
}
