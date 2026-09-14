import Phaser from 'phaser';
import { carte, decors, terrains } from '../content';
import { TAILLE_TUILE, construireCarte } from '../engine/carte';
import { calculerVitesse, type Commandes, type Direction } from '../engine/deplacement';

const VITESSE = 130;
/** Les décors au sol se dessinent juste au-dessus des tuiles, sous tout le reste. */
const PROFONDEUR_SOL = 1;

/** Ordre des rangées dans les planches d'animation LPC. */
const RANGEE: Record<Direction, number> = { haut: 0, gauche: 1, bas: 2, droite: 3 };
const IMAGES_PAR_RANGEE = 9;

export class MondeScene extends Phaser.Scene {
  private joueuse!: Phaser.Types.Physics.Arcade.SpriteWithDynamicBody;
  private touches!: Record<keyof Commandes, Phaser.Input.Keyboard.Key[]>;
  private derniereDirection: Direction = 'bas';

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

    const obstacles = this.physics.add.staticGroup();
    for (const { decor, caseX, caseY } of monde.decorsPoses) {
      const x = caseX * TAILLE_TUILE + TAILLE_TUILE / 2;
      const piedY = caseY * TAILLE_TUILE + TAILLE_TUILE;

      // Origine au pied : un décor se range en profondeur par sa base, pas par son sommet.
      const sprite = this.add.image(x, piedY, decor.sprite).setOrigin(0.5, 1);
      // Un décor au sol reste sous les personnages ; un décor dressé se trie par son pied.
      sprite.setDepth(decor.auSol ? PROFONDEUR_SOL : piedY);

      if (decor.solide) {
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
    this.scene.launch('interface');
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
    // Flèches, ZQSD et WASD actifs en même temps : voir GAME_DESIGN.md § 5.
    return {
      haut: k(T.UP, T.Z, T.W),
      bas: k(T.DOWN, T.S),
      gauche: k(T.LEFT, T.Q, T.A),
      droite: k(T.RIGHT, T.D),
    };
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
  }
}
