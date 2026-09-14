import Phaser from 'phaser';
import { objets } from '../content';
import type { Inventaire } from '../engine/inventaire';
import { COEURS_MAX, FAIM_MAX, type Survie } from '../engine/survie';
import { dessinerPanneau, OR } from './panneau';

/**
 * Interface fixe, superposée au monde.
 *
 * Invariant 4 de GAME_DESIGN.md : un seul objectif affiché à la fois, en haut à
 * gauche, en une phrase courte. Cette scène est le seul endroit autorisé à
 * afficher un objectif.
 *
 * Invariant 5 : des icônes et des jauges, jamais de chiffre à déchiffrer pour
 * comprendre son état.
 */

const VERT_PANNEAU = 0x1e3a2f;
const BORD_PANNEAU = 0x3c6552;
const CREME = '#f6e7c1';
const OPACITE_PANNEAU = 0.86;
const MARGE = 16;
const RAYON = 14;

const ROUGE_COEUR = 0xe05561;
const ROUGE_COEUR_VIDE = 0x5a3038;
const JAUNE_FAIM = 0xe8c65a;
const JAUNE_FAIM_VIDE = 0x4d4630;

export class InterfaceScene extends Phaser.Scene {
  private objectif!: Phaser.GameObjects.Text;
  private panneauObjectif!: Phaser.GameObjects.Graphics;

  private jauges!: Phaser.GameObjects.Graphics;
  private temps!: Phaser.GameObjects.Text;
  private panneauTemps!: Phaser.GameObjects.Graphics;
  private balade!: Phaser.GameObjects.Text;

  private sac!: Phaser.GameObjects.Container;
  private lignesSac: { icone: Phaser.GameObjects.Image; compte: Phaser.GameObjects.Text }[] = [];

  private message!: Phaser.GameObjects.Text;
  private panneauMessage!: Phaser.GameObjects.Graphics;

  private indiceFond!: Phaser.GameObjects.Graphics;
  private indiceTouche!: Phaser.GameObjects.Text;
  private indiceAction!: Phaser.GameObjects.Text;
  private indiceCourant: string | null = null;

  /** Le monde peut appeler cette scène avant que Phaser l'ait créée. On retient
   *  alors le dernier état connu et on l'applique à la création. */
  private pret = false;
  private sacEnAttente: Inventaire | null = null;
  private survieEnAttente: Survie | null = null;
  private objectifEnAttente: string | null = null;

  constructor() {
    super({ key: 'interface', active: false });
  }

  /**
   * Une scène relancée réutilise la même instance : ses objets d'affichage ont
   * été détruits par l'extinction précédente, mais pas ses champs. Sans cette
   * remise à zéro, le monde écrit dans des références mortes.
   *
   * Les valeurs « en attente » ne sont volontairement pas effacées : le monde
   * les écrit juste après avoir lancé cette scène, donc avant que ce init ne
   * s'exécute. Les remettre à zéro ici ferait perdre l'état restauré.
   */
  init(): void {
    this.pret = false;
    this.lignesSac = [];
    this.indiceCourant = null;
  }

  create(): void {
    this.events.once('shutdown', () => {
      this.pret = false;
    });

    this.jauges = this.add.graphics();

    this.panneauObjectif = this.add.graphics();
    this.objectif = this.add
      .text(MARGE + 18, MARGE + 61, '', {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '17px',
        color: CREME,
      })
      .setOrigin(0, 0);

    this.panneauTemps = this.add.graphics();
    this.temps = this.add
      .text(0, 0, '', { fontFamily: 'system-ui, sans-serif', fontSize: '16px', color: CREME })
      .setOrigin(1, 0);

    this.balade = this.add
      .text(MARGE, 0, '', { fontFamily: 'system-ui, sans-serif', fontSize: '14px', color: '#a7d3b0' })
      .setOrigin(0, 1)
      .setVisible(false);

    this.construireSac();
    this.construireIndice();

    this.panneauMessage = this.add.graphics().setVisible(false);
    this.message = this.add
      .text(0, 0, '', { fontFamily: 'system-ui, sans-serif', fontSize: '16px', color: '#ffd9a0' })
      .setOrigin(0.5, 0.5)
      .setVisible(false);

    this.pret = true;
    this.definirObjectif(this.objectifEnAttente ?? 'Explore la clairière');
    this.majSac(this.sacEnAttente ?? {});
    this.majSurvie(this.survieEnAttente ?? { coeurs: COEURS_MAX, faim: FAIM_MAX, secondesVentreVide: 0 });
    this.majTemps(1, 'Matin');
  }

  private panneau(g: Phaser.GameObjects.Graphics, x: number, y: number, l: number, h: number): void {
    g.clear();
    g.fillStyle(VERT_PANNEAU, OPACITE_PANNEAU);
    g.fillRoundedRect(x, y, l, h, RAYON);
    g.lineStyle(2, BORD_PANNEAU, 0.9);
    g.strokeRoundedRect(x, y, l, h, RAYON);
  }

  definirObjectif(texte: string): void {
    if (!this.pret) {
      // Le monde connaît l'objectif restauré avant que cette scène existe : sans
      // cette mise en attente, la valeur par défaut l'écraserait.
      this.objectifEnAttente = texte;
      return;
    }
    this.objectif.setText(texte);
    this.panneau(this.panneauObjectif, MARGE, MARGE + 48, this.objectif.width + 36, 42);
  }

  /**
   * Cœurs et jauge de faim, dessinés côte à côte en haut à gauche.
   * Des formes, pas des nombres : elle a 9 ans.
   */
  majSurvie(survie: Survie): void {
    if (!this.pret) {
      this.survieEnAttente = survie;
      return;
    }

    const g = this.jauges;
    g.clear();
    this.panneau(g, MARGE, MARGE, 196, 40);

    const cx = MARGE + 18;
    const cy = MARGE + 20;
    for (let i = 0; i < COEURS_MAX; i++) {
      g.fillStyle(i < survie.coeurs ? ROUGE_COEUR : ROUGE_COEUR_VIDE, 1);
      g.fillCircle(cx + i * 22 - 4, cy - 3, 5);
      g.fillCircle(cx + i * 22 + 4, cy - 3, 5);
      g.fillTriangle(cx + i * 22 - 9, cy - 1, cx + i * 22 + 9, cy - 1, cx + i * 22, cy + 9);
    }

    const xFaim = MARGE + 92;
    const largeur = 86;
    g.fillStyle(JAUNE_FAIM_VIDE, 1);
    g.fillRoundedRect(xFaim, cy - 6, largeur, 12, 6);
    const part = Math.max(0, Math.min(1, survie.faim / FAIM_MAX));
    if (part > 0) {
      g.fillStyle(JAUNE_FAIM, 1);
      g.fillRoundedRect(xFaim, cy - 6, Math.max(12, largeur * part), 12, 6);
    }
  }

  majTemps(jour: number, moment: string): void {
    if (!this.pret) return;
    this.temps.setText(`Jour ${jour} · ${moment}`);
    const l = this.temps.width + 32;
    this.temps.setPosition(this.scale.width - MARGE - 16, MARGE + 12);
    this.panneau(this.panneauTemps, this.scale.width - MARGE - l, MARGE, l, 40);
  }

  majModeBalade(actif: boolean): void {
    if (!this.pret) return;
    this.balade.setText(actif ? 'Mode balade' : '').setVisible(actif);
    this.balade.setPosition(MARGE, this.scale.height - MARGE - 60);
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
        .text(0, 0, '0', { fontFamily: 'system-ui, sans-serif', fontSize: '17px', color: CREME })
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

  /**
   * Bulle d'aide contextuelle, juste au-dessus du sac.
   *
   * C'est la réponse au vrai problème : personne ne devine les touches. Plutôt
   * qu'un manuel à mémoriser, on affiche la touche au moment exact où elle
   * sert, à côté de la chose qu'elle concerne.
   */
  private construireIndice(): void {
    this.indiceFond = this.add.graphics().setVisible(false);
    this.indiceTouche = this.add
      .text(0, 0, '', { fontFamily: 'system-ui, sans-serif', fontSize: '18px', color: OR })
      .setOrigin(0, 0.5)
      .setVisible(false);
    this.indiceAction = this.add
      .text(0, 0, '', { fontFamily: 'system-ui, sans-serif', fontSize: '17px', color: CREME })
      .setOrigin(0, 0.5)
      .setVisible(false);
  }

  majIndice(touche: string | null, action = ''): void {
    if (!this.pret) return;

    const cle = touche === null ? null : `${touche}|${action}`;
    if (cle === this.indiceCourant) return;
    this.indiceCourant = cle;

    if (touche === null) {
      this.indiceFond.setVisible(false);
      this.indiceTouche.setVisible(false);
      this.indiceAction.setVisible(false);
      return;
    }

    this.indiceTouche.setText(touche);
    this.indiceAction.setText(action);

    const largeur = this.indiceTouche.width + this.indiceAction.width + 52;
    const hauteur = 42;
    const x = (this.scale.width - largeur) / 2;
    const y = this.scale.height - 128;

    dessinerPanneau(this.indiceFond, x, y, largeur, hauteur);
    this.indiceTouche.setPosition(x + 18, y + hauteur / 2).setVisible(true);
    this.indiceAction
      .setPosition(x + 18 + this.indiceTouche.width + 16, y + hauteur / 2)
      .setVisible(true);
    this.indiceFond.setVisible(true);
  }

  /** Message court et centré, qui s'efface seul. */
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

  /** Mission accomplie : une bannière brève et franche, au centre de l'écran. */
  missionValidee(texte: string): void {
    if (!this.pret) return;

    const fond = this.add.graphics().setDepth(10);
    const titre = this.add
      .text(this.scale.width / 2, this.scale.height / 2 - 52, 'Bravo !', {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '26px',
        color: '#ffe9a8',
      })
      .setOrigin(0.5)
      .setDepth(11);
    const detail = this.add
      .text(this.scale.width / 2, this.scale.height / 2 - 22, texte, {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '17px',
        color: CREME,
      })
      .setOrigin(0.5)
      .setDepth(11);

    const l = Math.max(titre.width, detail.width) + 56;
    this.panneau(fond, this.scale.width / 2 - l / 2, this.scale.height / 2 - 76, l, 76);

    this.tweens.add({
      targets: [fond, titre, detail],
      alpha: 0,
      delay: 1800,
      duration: 500,
      onComplete: () => {
        fond.destroy();
        titre.destroy();
        detail.destroy();
      },
    });
  }
}
