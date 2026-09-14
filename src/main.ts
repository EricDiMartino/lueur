import Phaser from 'phaser';
import { MondeScene } from './scenes/MondeScene';
import { InterfaceScene } from './ui/InterfaceScene';

const jeu = new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'jeu',
  width: 960,
  height: 540,
  backgroundColor: '#1b2b34',
  pixelArt: true,
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  physics: {
    default: 'arcade',
    arcade: { gravity: { x: 0, y: 0 } },
  },
  scene: [MondeScene, InterfaceScene],
});

// En développement seulement : donne accès au jeu depuis la console du
// navigateur, pour inspecter l'état sans instrumenter le code de jeu.
if (import.meta.env.DEV) {
  (globalThis as unknown as { jeu: Phaser.Game }).jeu = jeu;
}
