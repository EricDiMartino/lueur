import Phaser from 'phaser';
import type { Ennemi } from '../content/schemas';
import {
  avancerCreature,
  blesserCreature,
  estVaincue,
  MS_AVANT_DE_FRAPPER,
  type Creature,
} from '../engine/combat';

/**
 * Une créature à l'écran : son état de combat et son sprite.
 *
 * Les planches de monstres LPC font 3 images par direction, dans le même ordre
 * de rangées que les personnages.
 */
export const IMAGES_PAR_DIRECTION = 3;
export const RANGEE_MONSTRE = { haut: 0, gauche: 1, bas: 2, droite: 3 } as const;

export class CreatureEnJeu {
  etat: Creature;
  readonly sprite: Phaser.Types.Physics.Arcade.SpriteWithDynamicBody;

  constructor(
    readonly definition: Ennemi,
    scene: Phaser.Scene,
    x: number,
    y: number,
  ) {
    this.etat = { pointsDeVie: definition.pointsDeVie, etat: 'approche', msDansLEtat: 0 };
    this.sprite = scene.physics.add.sprite(x, y, definition.sprite, RANGEE_MONSTRE.bas * IMAGES_PAR_DIRECTION);
    this.sprite.body.setSize(20, 14);
    this.sprite.body.setOffset(6, 16);
    this.sprite.setCollideWorldBounds(true);
  }

  /**
   * Fait avancer la créature d'un pas de temps.
   *
   * Elle poursuit la joueuse quand elle l'a remarquée, s'immobilise pour
   * annoncer son coup, puis recule. Le clignotement pendant l'annonce est ce
   * qui rend le combat lisible : sans lui, se faire toucher paraît arbitraire.
   */
  avancer(ms: number, joueuseX: number, joueuseY: number): { frappe: boolean } {
    const dx = joueuseX - this.sprite.x;
    const dy = joueuseY - this.sprite.y;
    const distance = Math.hypot(dx, dy);

    const aPortee = distance <= this.definition.porteeAttaque;
    const { creature, frappeMaintenant } = avancerCreature(this.etat, ms, aPortee);
    this.etat = creature;

    if (creature.etat === 'annonce') {
      this.sprite.setVelocity(0, 0);
      // Clignotement : deux allers-retours sur la durée de l'annonce.
      const phase = Math.floor((creature.msDansLEtat / MS_AVANT_DE_FRAPPER) * 6) % 2;
      // Phaser 4 : la teinte pleine se règle par le mode, plus par setTintFill.
      this.sprite.setTint(phase === 0 ? 0xffffff : 0xff6b6b);
      this.sprite.setTintMode(Phaser.TintModes.FILL);
    } else {
      this.sprite.clearTint();

      if (creature.etat === 'recul') {
        this.sprite.setVelocity((-dx / distance) * 60, (-dy / distance) * 60);
      } else if (distance <= this.definition.distanceDeReveil && distance > 1) {
        const v = this.definition.vitesse;
        this.sprite.setVelocity((dx / distance) * v, (dy / distance) * v);
        this.orienter(dx, dy);
      } else {
        this.sprite.setVelocity(0, 0);
      }
    }

    this.sprite.setDepth(this.sprite.y);
    return { frappe: frappeMaintenant };
  }

  private orienter(dx: number, dy: number): void {
    const rangee =
      Math.abs(dx) > Math.abs(dy)
        ? dx > 0
          ? RANGEE_MONSTRE.droite
          : RANGEE_MONSTRE.gauche
        : dy > 0
          ? RANGEE_MONSTRE.bas
          : RANGEE_MONSTRE.haut;
    this.sprite.anims.play(`${this.definition.sprite}-${rangee}`, true);
  }

  blesser(degats: number): boolean {
    this.etat = blesserCreature(this.etat, degats);
    return estVaincue(this.etat);
  }

  detruire(): void {
    this.sprite.destroy();
  }
}
