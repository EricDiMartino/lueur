import Phaser from 'phaser';
import { carte, decors, objet, objets, terrains } from '../content';
import type { Decor } from '../content/schemas';
import { TAILLE_TUILE, construireCarte } from '../engine/carte';
import { calculerVitesse, type Commandes, type Direction } from '../engine/deplacement';
import { ajouter, INVENTAIRE_VIDE, type Inventaire } from '../engine/inventaire';
import { cibleLaPlusProche, type CibleRecolte } from '../engine/recolte';
import { ecrire, lire, serialiser, stockageDuNavigateur, type Stockage } from '../engine/sauvegarde';
import type { InterfaceScene } from '../ui/InterfaceScene';

const VITESSE = 130;
/** Les décors au sol se dessinent juste au-dessus des tuiles, sous tout le reste. */
const PROFONDEUR_SOL = 1;
/** Opacité d'un décor récolté, le temps qu'il repousse. */
const ALPHA_EPUISE = 0.55;
/** Invariant 3 de GAME_DESIGN.md : sauvegarde automatique toutes les 30 s. */
const INTERVALLE_SAUVEGARDE_MS = 30_000;

/** Ordre des rangées dans les planches d'animation LPC. */
const RANGEE: Record<Direction, number> = { haut: 0, gauche: 1, bas: 2, droite: 3 };
const IMAGES_PAR_RANGEE = 9;

interface DecorEnJeu extends CibleRecolte {
  decor: Decor;
  sprite: Phaser.GameObjects.Image;
}

export class MondeScene extends Phaser.Scene {
  private joueuse!: Phaser.Types.Physics.Arcade.SpriteWithDynamicBody;
  private touches!: Record<keyof Commandes, Phaser.Input.Keyboard.Key[]>;
  private toucheRecolte!: Phaser.Input.Keyboard.Key;
  private derniereDirection: Direction = 'bas';

  private recoltables: DecorEnJeu[] = [];
  private inventaire: Inventaire = INVENTAIRE_VIDE;
  private surbrillance!: Phaser.GameObjects.Ellipse;
  private stockage: Stockage = stockageDuNavigateur();

  constructor() {
    super('monde');
  }

  preload(): void {
    this.load.spritesheet('terrain', 'assets/tiles/terrain_atlas.png', {
      frameWidth: TAILLE_TUILE,
      frameHeight: TAILLE_TUILE,
    });
    this.load.spritesheet('princesse', 'assets/sprites/princess.png', {
      frameWidth: 64,
      frameHeight: 64,
    });
    // La liste vient de decors.json : ajouter un décor ne doit jamais demander
    // de toucher au moteur (voir CLAUDE.md, règle d'architecture).
    for (const d of decors) {
      this.load.image(d.sprite, `assets/sprites/${d.sprite}.png`);
      if (d.recolte) {
        this.load.image(d.recolte.spriteEpuise, `assets/sprites/${d.recolte.spriteEpuise}.png`);
      }
    }
    // Les icônes du sac réutilisent ces mêmes sprites. Phaser ignore une clé
    // déjà demandée, donc pas de double chargement.
    for (const o of objets) {
      if (o.icone) this.load.image(o.icone, `assets/sprites/${o.icone}.png`);
    }
  }

  create(): void {
    const monde = construireCarte(carte('foret'));

    const tilemap = this.make.tilemap({
      data: monde.grilleTuiles,
      tileWidth: TAILLE_TUILE,
      tileHeight: TAILLE_TUILE,
    });
    const jeuDeTuiles = tilemap.addTilesetImage('terrain');
    if (!jeuDeTuiles) throw new Error('Atlas « terrain » introuvable.');
    const couche = tilemap.createLayer(0, jeuDeTuiles, 0, 0);
    if (!couche) throw new Error('Impossible de créer la couche de sol.');

    // Les terrains non traversables sont déclarés dans terrains.json, jamais ici.
    couche.setCollision(terrains.filter((t) => !t.traversable).map((t) => t.tuile));

    const largeurMonde = monde.largeur * TAILLE_TUILE;
    const hauteurMonde = monde.hauteur * TAILLE_TUILE;
    this.physics.world.setBounds(0, 0, largeurMonde, hauteurMonde);

    // Le halo qui signale ce qu'on peut ramasser. Sous les décors, au-dessus du sol.
    this.surbrillance = this.add
      .ellipse(0, 0, 34, 18, 0xffe9a8, 0.45)
      .setStrokeStyle(2, 0xfff3cd, 0.9)
      .setDepth(PROFONDEUR_SOL + 1)
      .setVisible(false);

    const obstacles = this.physics.add.staticGroup();
    let prochainId = 0;

    for (const { decor, caseX, caseY } of monde.decorsPoses) {
      const x = caseX * TAILLE_TUILE + TAILLE_TUILE / 2;
      const piedY = caseY * TAILLE_TUILE + TAILLE_TUILE;

      // Origine au pied : un décor se range en profondeur par sa base, pas par son sommet.
      const sprite = this.add.image(x, piedY, decor.sprite).setOrigin(0.5, 1);
      // Un décor au sol reste sous les personnages ; un décor dressé se trie par son pied.
      sprite.setDepth(decor.auSol ? PROFONDEUR_SOL : piedY);

      if (decor.solide && decor.largeurObstacle && decor.hauteurObstacle) {
        // La zone de blocage ne couvre que le pied : on doit pouvoir marcher
        // derrière un arbre sans se cogner à son feuillage.
        const centreY = decor.centreObstacleY ?? decor.hauteurObstacle / 2;
        const zone = this.add.rectangle(
          x,
          piedY - centreY,
          decor.largeurObstacle,
          decor.hauteurObstacle,
        );
        this.physics.add.existing(zone, true);
        obstacles.add(zone);
      }

      if (decor.recolte) {
        this.recoltables.push({
          id: prochainId++,
          // On vise le pied du décor : c'est là qu'on se tient pour le ramasser.
          x,
          y: piedY - 8,
          disponible: true,
          decor,
          sprite,
        });
      }
    }

    const depart = monde.departJoueur;
    this.joueuse = this.physics.add.sprite(
      depart.x * TAILLE_TUILE + TAILLE_TUILE / 2,
      depart.y * TAILLE_TUILE + TAILLE_TUILE / 2,
      'princesse',
      RANGEE.bas * IMAGES_PAR_RANGEE,
    );
    this.joueuse.setCollideWorldBounds(true);
    // Le corps physique tient aux pieds du sprite : le buste ne doit pas cogner.
    this.joueuse.body.setSize(22, 14);
    this.joueuse.body.setOffset(21, 48);

    this.creerAnimations();
    this.physics.add.collider(this.joueuse, couche);
    this.physics.add.collider(this.joueuse, obstacles);

    this.cameras.main.setBounds(0, 0, largeurMonde, hauteurMonde);
    this.cameras.main.startFollow(this.joueuse, true, 0.1, 0.1);

    this.touches = this.lireTouches();
    this.restaurerLaPartie();
    this.scene.launch('interface');
    // L'interface n'est pas encore construite : elle retient cet état et
    // l'applique à sa création. Sans ça, un sac restauré s'afficherait vide.
    this.interface.majSac(this.inventaire);

    this.time.addEvent({
      delay: INTERVALLE_SAUVEGARDE_MS,
      loop: true,
      callback: () => this.sauvegarder(),
    });

    // Fermer l'onglet ne doit rien coûter : on sauve aussi au dernier moment.
    const sauverAvantDeQuitter = () => this.sauvegarder();
    window.addEventListener('pagehide', sauverAvantDeQuitter);
    this.events.once('shutdown', () => window.removeEventListener('pagehide', sauverAvantDeQuitter));
  }

  private sauvegarder(): void {
    const epuises = this.recoltables.filter((r) => !r.disponible).map((r) => r.id);
    ecrire(
      this.stockage,
      serialiser({ x: this.joueuse.x, y: this.joueuse.y }, this.inventaire, epuises),
    );
  }

  /**
   * Recharge la partie précédente si elle est lisible.
   *
   * Les décors récoltés sont restaurés dans leur état épuisé, mais leur
   * repousse est relancée à l'ouverture : il n'y a aucun intérêt à faire
   * attendre quelqu'un qui vient de revenir.
   */
  private restaurerLaPartie(): void {
    const partie = lire(this.stockage);
    if (!partie) return;

    this.joueuse.setPosition(partie.position.x, partie.position.y);
    this.inventaire = partie.inventaire;

    const epuises = new Set(partie.decorsEpuises);
    for (const recoltable of this.recoltables) {
      if (!epuises.has(recoltable.id) || !recoltable.decor.recolte) continue;
      recoltable.disponible = false;
      recoltable.sprite.setTexture(recoltable.decor.recolte.spriteEpuise);
      recoltable.sprite.setAlpha(ALPHA_EPUISE);
      this.programmerRepousse(recoltable);
    }
  }

  private creerAnimations(): void {
    for (const [direction, rangee] of Object.entries(RANGEE) as [Direction, number][]) {
      this.anims.create({
        key: `marche-${direction}`,
        // L'image 0 de chaque rangée est la pose d'arrêt : la marche va de 1 à 8.
        frames: this.anims.generateFrameNumbers('princesse', {
          start: rangee * IMAGES_PAR_RANGEE + 1,
          end: rangee * IMAGES_PAR_RANGEE + 8,
        }),
        frameRate: 10,
        repeat: -1,
      });
    }
  }

  private lireTouches(): Record<keyof Commandes, Phaser.Input.Keyboard.Key[]> {
    const clavier = this.input.keyboard;
    if (!clavier) throw new Error('Clavier indisponible.');
    const k = (...codes: number[]) => codes.map((c) => clavier.addKey(c));
    const T = Phaser.Input.Keyboard.KeyCodes;
    this.toucheRecolte = clavier.addKey(T.E);
    // Flèches, ZQSD et WASD actifs en même temps : voir GAME_DESIGN.md § 5.
    return {
      haut: k(T.UP, T.Z, T.W),
      bas: k(T.DOWN, T.S),
      gauche: k(T.LEFT, T.Q, T.A),
      droite: k(T.RIGHT, T.D),
    };
  }

  private get interface(): InterfaceScene {
    return this.scene.get('interface') as InterfaceScene;
  }

  private recolter(cible: DecorEnJeu): void {
    const recolte = cible.decor.recolte;
    if (!recolte) return;

    const definition = objet(recolte.objet);
    const resultat = ajouter(this.inventaire, recolte.objet, recolte.quantite, definition.pileMax);

    if (resultat.ajoute === 0) {
      this.interface.messagePassager(`Ton sac est plein de ${definition.nom.toLowerCase()}`);
      return;
    }

    this.inventaire = resultat.inventaire;
    cible.disponible = false;
    cible.sprite.setTexture(recolte.spriteEpuise);
    // Un arbre récolté garde le même sprite : sans cet éclaircissement, rien ne
    // distingue un arbre en repousse d'un arbre intact.
    cible.sprite.setAlpha(ALPHA_EPUISE);

    this.interface.majSac(this.inventaire);
    this.gainFlottant(cible.x, cible.y - 20, `+${resultat.ajoute} ${definition.nom}`);
    this.programmerRepousse(cible);
    this.sauvegarder();
  }

  /** Rien n'est définitivement perdu : la ressource revient toujours. */
  private programmerRepousse(cible: DecorEnJeu): void {
    const recolte = cible.decor.recolte;
    if (!recolte) return;
    this.time.delayedCall(recolte.repousseSecondes * 1000, () => {
      cible.disponible = true;
      cible.sprite.setTexture(cible.decor.sprite);
      cible.sprite.setAlpha(1);
    });
  }

  /** Le petit « +2 Bûche » qui monte et s'efface : la seule façon de rendre la récolte lisible. */
  private gainFlottant(x: number, y: number, texte: string): void {
    const etiquette = this.add
      .text(x, y, texte, {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '15px',
        color: '#fff3cd',
        stroke: '#1b2b34',
        strokeThickness: 4,
      })
      .setOrigin(0.5, 1)
      .setDepth(100000);

    this.tweens.add({
      targets: etiquette,
      y: y - 26,
      alpha: 0,
      duration: 900,
      ease: 'Cubic.easeOut',
      onComplete: () => etiquette.destroy(),
    });
  }

  update(): void {
    const enfonce = (touches: Phaser.Input.Keyboard.Key[]) => touches.some((t) => t.isDown);
    const commandes: Commandes = {
      haut: enfonce(this.touches.haut),
      bas: enfonce(this.touches.bas),
      gauche: enfonce(this.touches.gauche),
      droite: enfonce(this.touches.droite),
    };

    const { vx, vy, direction } = calculerVitesse(commandes, VITESSE);
    this.joueuse.setVelocity(vx, vy);
    this.joueuse.setDepth(this.joueuse.y);

    if (direction) {
      this.derniereDirection = direction;
      this.joueuse.anims.play(`marche-${direction}`, true);
    } else {
      this.joueuse.anims.stop();
      this.joueuse.setFrame(RANGEE[this.derniereDirection] * IMAGES_PAR_RANGEE);
    }

    // On vise depuis les pieds : c'est de là qu'on tend le bras.
    const cible = cibleLaPlusProche(
      this.joueuse.x,
      this.joueuse.y + 20,
      this.recoltables,
    ) as DecorEnJeu | null;

    if (cible) {
      this.surbrillance.setPosition(cible.x, cible.y + 6).setVisible(true);
    } else {
      this.surbrillance.setVisible(false);
    }

    if (cible && Phaser.Input.Keyboard.JustDown(this.toucheRecolte)) {
      this.recolter(cible);
    }
  }
}
