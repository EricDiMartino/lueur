import Phaser from 'phaser';
import { carte, decors, ennemis, missions, objet, objets, recettes, terrains } from '../content';
import type { Decor } from '../content/schemas';
import { TAILLE_TUILE, construireCarte } from '../engine/carte';
import { calculerVitesse, type Commandes, type Direction } from '../engine/deplacement';
import { ajouter, INVENTAIRE_VIDE, quantite, retirer, type Inventaire } from '../engine/inventaire';
import { cibleLaPlusProche, type CibleRecolte } from '../engine/recolte';
import { ecrire, lire, serialiser, stockageDuNavigateur, type Stockage } from '../engine/sauvegarde';
import {
  avancer as avancerSurvie,
  blesser,
  facteurDeVitesse,
  manger,
  reveil,
  SURVIE_NEUVE,
  type Survie,
} from '../engine/survie';
import { momentDeLaJournee, numeroDuJour, obscurite, phase } from '../engine/tempsDuJeu';
import { evaluer, fabriquer, type Recette } from '../engine/craft';
import { estDansLArc, MS_ENTRE_DEUX_COUPS, MS_INVULNERABILITE } from '../engine/combat';
import {
  MISSIONS_NEUVES,
  missionCourante,
  noterFabrication,
  noterJour,
  noterRamassage,
  noterRepas,
  noterVictoire,
  reevaluer,
  type EtatMissions,
} from '../engine/missions';
import { CreatureEnJeu, IMAGES_PAR_DIRECTION, RANGEE_MONSTRE } from './ennemis';
import type { InterfaceScene } from '../ui/InterfaceScene';

const VITESSE = 130;
/** Les décors au sol se dessinent juste au-dessus des tuiles, sous tout le reste. */
const PROFONDEUR_SOL = 1;
/** Opacité d'un décor récolté, le temps qu'il repousse. */
const ALPHA_EPUISE = 0.55;
/** Invariant 3 de GAME_DESIGN.md : sauvegarde automatique toutes les 30 s. */
const INTERVALLE_SAUVEGARDE_MS = 30_000;
/** Rayon du campement : zone sûre, station de fabrication, point de réveil. */
const RAYON_DU_CAMP = 96;
/** Nombre maximal de créatures présentes en même temps. */
const CREATURES_MAX = 6;
/** Distance minimale d'apparition d'une créature, pour ne jamais surgir dessus. */
const DISTANCE_APPARITION_MIN = 200;

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
  private toucheAttaque!: Phaser.Input.Keyboard.Key;
  private toucheManger!: Phaser.Input.Keyboard.Key;
  private toucheFabriquer!: Phaser.Input.Keyboard.Key;
  private toucheBalade!: Phaser.Input.Keyboard.Key;
  private derniereDirection: Direction = 'bas';

  private recoltables: DecorEnJeu[] = [];
  private inventaire: Inventaire = INVENTAIRE_VIDE;
  private survie: Survie = SURVIE_NEUVE;
  private etatMissions: EtatMissions = MISSIONS_NEUVES;

  private secondesEcoulees = 0;
  private jourAffiche = 1;
  private voileDeNuit!: Phaser.GameObjects.Rectangle;
  private lueurDuCamp!: Phaser.GameObjects.Ellipse;

  private camp = { x: 0, y: 0 };
  private creatures: CreatureEnJeu[] = [];
  private groupeCreatures!: Phaser.Physics.Arcade.Group;

  private msDepuisDernierCoup = MS_ENTRE_DEUX_COUPS;
  private msInvulnerable = 0;
  private modeBalade = false;
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
    for (const e of ennemis) {
      this.load.spritesheet(e.sprite, `assets/sprites/monstres/${e.sprite}.png`, {
        frameWidth: 32,
        frameHeight: 32,
      });
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

      if (decor.id === 'feu_de_camp') {
        this.camp = { x, y: piedY - 8 };
        // Le feu scintille : un décor parfaitement fixe ne se lit pas comme du feu.
        this.tweens.add({
          targets: sprite,
          scaleY: 1.06,
          duration: 420,
          yoyo: true,
          repeat: -1,
          ease: 'Sine.easeInOut',
        });
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

    // Lueur du campement : elle perce le voile de nuit, c'est ce qui fait du
    // feu un refuge visible de loin plutôt qu'un simple décor.
    this.lueurDuCamp = this.add
      .ellipse(this.camp.x, this.camp.y, RAYON_DU_CAMP * 2.4, RAYON_DU_CAMP * 1.7, 0xffc46b, 0)
      .setDepth(900_000);

    this.voileDeNuit = this.add
      .rectangle(0, 0, largeurMonde, hauteurMonde, 0x0b1b2a, 0)
      .setOrigin(0, 0)
      .setDepth(900_001);

    this.groupeCreatures = this.physics.add.group();
    this.physics.add.collider(this.groupeCreatures, couche);
    this.physics.add.collider(this.groupeCreatures, obstacles);

    this.cameras.main.setBounds(0, 0, largeurMonde, hauteurMonde);
    this.cameras.main.startFollow(this.joueuse, true, 0.1, 0.1);

    this.touches = this.lireTouches();
    this.restaurerLaPartie();
    this.scene.launch('interface');
    // L'interface n'est pas encore construite : elle retient cet état et
    // l'applique à sa création. Sans ça, un sac restauré s'afficherait vide.
    this.interface.majSac(this.inventaire);
    this.interface.majSurvie(this.survie);
    this.interface.majModeBalade(this.modeBalade);
    this.afficherMissionCourante();

    this.time.addEvent({
      delay: INTERVALLE_SAUVEGARDE_MS,
      loop: true,
      callback: () => this.sauvegarder(),
    });

    // Les créatures arrivent au compte-gouttes : en faire surgir plusieurs
    // d'un coup à la tombée de la nuit serait effrayant, pas stimulant.
    this.time.addEvent({
      delay: 4_000,
      loop: true,
      callback: () => this.tenterUneApparition(),
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
      serialiser({ x: this.joueuse.x, y: this.joueuse.y }, this.inventaire, epuises, {
        survie: this.survie,
        secondesEcoulees: this.secondesEcoulees,
        missions: this.etatMissions,
        modeBalade: this.modeBalade,
      }),
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
    this.survie = partie.survie;
    this.secondesEcoulees = partie.secondesEcoulees;
    this.jourAffiche = numeroDuJour(partie.secondesEcoulees);
    this.etatMissions = partie.missions;
    this.modeBalade = partie.modeBalade;

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
    for (const e of ennemis) {
      for (const rangee of Object.values(RANGEE_MONSTRE)) {
        this.anims.create({
          key: `${e.sprite}-${rangee}`,
          frames: this.anims.generateFrameNumbers(e.sprite, {
            start: rangee * IMAGES_PAR_DIRECTION,
            end: rangee * IMAGES_PAR_DIRECTION + IMAGES_PAR_DIRECTION - 1,
          }),
          frameRate: 6,
          repeat: -1,
        });
      }
    }

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
    this.toucheAttaque = clavier.addKey(T.SPACE);
    this.toucheManger = clavier.addKey(T.A);
    this.toucheFabriquer = clavier.addKey(T.C);
    this.toucheBalade = clavier.addKey(T.B);
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

    this.etatMissions = {
      ...this.etatMissions,
      compteurs: noterRamassage(this.etatMissions.compteurs, recolte.objet, resultat.ajoute),
    };

    this.interface.majSac(this.inventaire);
    this.gainFlottant(cible.x, cible.y - 20, `+${resultat.ajoute} ${definition.nom}`);
    this.programmerRepousse(cible);
    this.majMissions();
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


  // ─── Missions ──────────────────────────────────────────────────────────────

  private majMissions(): void {
    const { etat, validees } = reevaluer(missions, this.etatMissions);
    this.etatMissions = etat;

    for (const mission of validees) {
      this.interface.missionValidee(mission.texte);
    }
    this.afficherMissionCourante();
  }

  private afficherMissionCourante(): void {
    const mission = missionCourante(missions, this.etatMissions);
    this.interface.definirObjectif(mission ? mission.texte : 'Explore comme tu veux');
  }

  // ─── Manger ────────────────────────────────────────────────────────────────

  /** Mange l'aliment le plus nourrissant du sac. Choisir serait un menu de trop. */
  private mangerUnAliment(): void {
    const aliments = objets
      .filter((o) => o.satiete && quantite(this.inventaire, o.id) > 0)
      .sort((a, b) => (b.satiete ?? 0) - (a.satiete ?? 0));

    const aliment = aliments[0];
    if (!aliment || !aliment.satiete) {
      this.interface.messagePassager("Tu n'as rien à manger");
      return;
    }

    this.inventaire = retirer(this.inventaire, aliment.id, 1);
    this.survie = manger(this.survie, aliment.satiete);
    this.etatMissions = { ...this.etatMissions, compteurs: noterRepas(this.etatMissions.compteurs) };

    this.interface.majSac(this.inventaire);
    this.gainFlottant(this.joueuse.x, this.joueuse.y - 30, `${aliment.nom} 🍽`);
    this.majMissions();
    this.sauvegarder();
  }

  // ─── Fabrication ───────────────────────────────────────────────────────────

  private get estAuCampement(): boolean {
    return Phaser.Math.Distance.Between(this.joueuse.x, this.joueuse.y, this.camp.x, this.camp.y) <= RAYON_DU_CAMP;
  }

  /**
   * Fabrique la première recette réalisable. Pas de menu à parcourir : à 9 ans,
   * une touche qui fabrique ce qui est possible vaut mieux qu'une liste.
   * Quand rien n'est possible, on dit précisément ce qui manque.
   */
  private tenterDeFabriquer(): void {
    const pres = this.estAuCampement;
    let premierRefus: { recette: Recette; message: string } | null = null;

    for (const r of recettes) {
      const definition = objet(r.resultat);
      const bilan = evaluer(this.inventaire, r, definition.pileMax, pres);

      if (bilan.possible) {
        this.inventaire = fabriquer(this.inventaire, r, definition.pileMax, pres).inventaire;
        this.etatMissions = {
          ...this.etatMissions,
          compteurs: noterFabrication(this.etatMissions.compteurs, r.resultat, r.quantite),
        };
        this.interface.majSac(this.inventaire);
        this.gainFlottant(this.joueuse.x, this.joueuse.y - 30, `${definition.nom} fabriqué`);
        this.majMissions();
        this.sauvegarder();
        return;
      }

      if (!premierRefus) {
        const manque = bilan.manquants
          .map((m) => `${m.quantite} ${objet(m.objet).nom.toLowerCase()}`)
          .join(' et ');
        premierRefus = {
          recette: r,
          message:
            bilan.raison === 'loin-du-feu'
              ? 'Va au feu de camp pour fabriquer'
              : bilan.raison === 'sac-plein'
                ? `Tu as déjà ${definition.nom.toLowerCase()}`
                : `Il te manque ${manque}`,
        };
      }
    }

    this.interface.messagePassager(premierRefus?.message ?? 'Rien à fabriquer');
  }

  // ─── Combat ────────────────────────────────────────────────────────────────

  private get aUneEpee(): boolean {
    return quantite(this.inventaire, 'epee_bois') > 0;
  }

  private frapper(): void {
    if (!this.aUneEpee) {
      this.interface.messagePassager('Fabrique une épée pour te défendre');
      return;
    }

    this.msDepuisDernierCoup = 0;
    const regard = { haut: [0, -1], bas: [0, 1], gauche: [-1, 0], droite: [1, 0] }[this.derniereDirection];
    const [rx, ry] = regard as [number, number];

    // Arc visible : sans retour à l'écran, on ne sait pas si le coup est parti.
    const arc = this.add
      .ellipse(this.joueuse.x + rx * 26, this.joueuse.y + 10 + ry * 22, 44, 26, 0xfff3cd, 0.5)
      .setDepth(this.joueuse.y + 1);
    this.tweens.add({ targets: arc, alpha: 0, duration: 180, onComplete: () => arc.destroy() });

    for (const creature of [...this.creatures]) {
      if (!creature.sprite.active) continue;
      if (!estDansLArc(this.joueuse.x, this.joueuse.y + 10, rx, ry, creature.sprite.x, creature.sprite.y)) continue;
      if (!creature.blesser(1)) continue;

      this.gainFlottant(creature.sprite.x, creature.sprite.y - 10, creature.definition.nom + ' écartée');
      this.retirerCreature(creature);
      this.etatMissions = {
        ...this.etatMissions,
        compteurs: noterVictoire(this.etatMissions.compteurs),
      };
      this.majMissions();
    }
  }

  private retirerCreature(creature: CreatureEnJeu): void {
    this.creatures = this.creatures.filter((c) => c !== creature);
    this.groupeCreatures.remove(creature.sprite);
    creature.detruire();
  }

  private subirDegats(degats: number): void {
    if (this.msInvulnerable > 0) return;

    this.msInvulnerable = MS_INVULNERABILITE;
    const evolution = blesser(this.survie, degats);
    this.survie = evolution.survie;
    this.interface.majSurvie(this.survie);
    this.cameras.main.shake(140, 0.006);

    this.tweens.add({ targets: this.joueuse, alpha: 0.3, duration: 120, yoyo: true, repeat: 3 });

    if (evolution.vientDeTomber) this.reveilAuCampement();
  }

  /**
   * Invariant 1 : pas d'écran de game over, on se réveille au campement.
   * Invariant 2 : la moitié des ressources brutes seulement, jamais les outils,
   * l'équipement ni les objets de quête.
   */
  private reveilAuCampement(): void {
    let apres = this.inventaire;
    for (const o of objets) {
      if (o.categorie !== 'ressource') continue;
      const possede = quantite(apres, o.id);
      if (possede > 0) apres = retirer(apres, o.id, Math.floor(possede / 2));
    }

    this.inventaire = apres;
    this.survie = reveil();
    this.joueuse.body.reset(this.camp.x, this.camp.y - 30);

    for (const creature of [...this.creatures]) this.retirerCreature(creature);

    this.interface.majSac(this.inventaire);
    this.interface.majSurvie(this.survie);
    this.interface.messagePassager('Tu te réveilles au campement');
    this.cameras.main.flash(400, 255, 240, 210);
    this.sauvegarder();
  }

  // ─── Créatures ─────────────────────────────────────────────────────────────

  /**
   * Fait apparaître une créature la nuit, loin de la joueuse et hors du
   * campement. Le campement doit rester un refuge sans condition.
   */
  private tenterUneApparition(): void {
    if (this.modeBalade) return;
    if (phase(this.secondesEcoulees) !== 'nuit') return;
    if (this.creatures.length >= CREATURES_MAX) return;

    const definition = ennemis[Math.floor(Math.random() * ennemis.length)];
    if (!definition) return;

    const bornes = this.physics.world.bounds;
    for (let essai = 0; essai < 20; essai++) {
      const x = Phaser.Math.Between(60, bornes.width - 60);
      const y = Phaser.Math.Between(60, bornes.height - 60);
      if (Phaser.Math.Distance.Between(x, y, this.joueuse.x, this.joueuse.y) < DISTANCE_APPARITION_MIN) continue;
      if (Phaser.Math.Distance.Between(x, y, this.camp.x, this.camp.y) < RAYON_DU_CAMP * 1.5) continue;

      const creature = new CreatureEnJeu(definition, this, x, y);
      this.groupeCreatures.add(creature.sprite);
      this.creatures.push(creature);
      return;
    }
  }

  private avancerLesCreatures(ms: number): void {
    const auCamp = this.estAuCampement;

    for (const creature of [...this.creatures]) {
      // Une créature peut disparaître pendant cette boucle : subir un coup peut
      // déclencher le réveil au campement, qui les efface toutes d'un coup.
      if (!creature.sprite.active || !creature.sprite.body) continue;

      // Le jour venu, les créatures s'effacent plutôt que d'être tuées d'office.
      if (phase(this.secondesEcoulees) === 'jour' || this.modeBalade) {
        this.tweens.add({
          targets: creature.sprite,
          alpha: 0,
          duration: 500,
          onComplete: () => this.retirerCreature(creature),
        });
        continue;
      }

      const { frappe } = creature.avancer(ms, this.joueuse.x, this.joueuse.y + 10);
      if (frappe && !auCamp) this.subirDegats(creature.definition.degats);
    }
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

  update(_temps: number, delta: number): void {
    const secondes = delta / 1000;
    this.secondesEcoulees += secondes;
    this.msInvulnerable = Math.max(0, this.msInvulnerable - delta);
    this.msDepuisDernierCoup += delta;

    this.avancerLeTemps(secondes);
    this.deplacer();
    this.gererLesActions();
    this.avancerLesCreatures(delta);
    this.majSurbrillance();
  }

  /** Faim, cycle jour/nuit, apparitions : tout ce qui avance tout seul. */
  private avancerLeTemps(secondes: number): void {
    const evolution = avancerSurvie(this.survie, secondes, this.modeBalade);
    const changement = evolution.survie !== this.survie;
    this.survie = evolution.survie;
    if (changement) this.interface.majSurvie(this.survie);
    if (evolution.vientDeTomber) this.reveilAuCampement();

    const noirceur = this.modeBalade ? 0 : obscurite(this.secondesEcoulees);
    this.voileDeNuit.setFillStyle(0x0b1b2a, noirceur);
    this.lueurDuCamp.setFillStyle(0xffc46b, noirceur * 0.5);

    const jour = numeroDuJour(this.secondesEcoulees);
    this.interface.majTemps(jour, momentDeLaJournee(this.secondesEcoulees));
    if (jour !== this.jourAffiche) {
      this.jourAffiche = jour;
      this.etatMissions = {
        ...this.etatMissions,
        compteurs: noterJour(this.etatMissions.compteurs, jour),
      };
      this.majMissions();
      this.sauvegarder();
    }
  }

  private deplacer(): void {
    const enfonce = (touches: Phaser.Input.Keyboard.Key[]) => touches.some((t) => t.isDown);
    const commandes: Commandes = {
      haut: enfonce(this.touches.haut),
      bas: enfonce(this.touches.bas),
      gauche: enfonce(this.touches.gauche),
      droite: enfonce(this.touches.droite),
    };

    // Le ventre vide ralentit : ça se sent avant que ça fasse mal.
    const { vx, vy, direction } = calculerVitesse(commandes, VITESSE * facteurDeVitesse(this.survie));
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

  private gererLesActions(): void {
    const J = Phaser.Input.Keyboard.JustDown;

    if (J(this.toucheManger)) this.mangerUnAliment();
    if (J(this.toucheFabriquer)) this.tenterDeFabriquer();
    if (J(this.toucheAttaque) && this.msDepuisDernierCoup >= MS_ENTRE_DEUX_COUPS) this.frapper();

    if (J(this.toucheBalade)) {
      this.modeBalade = !this.modeBalade;
      this.interface.majModeBalade(this.modeBalade);
      this.interface.messagePassager(
        this.modeBalade ? 'Mode balade : plus de faim ni de créatures' : 'Mode balade arrêté',
      );
    }
  }

  private majSurbrillance(): void {
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
