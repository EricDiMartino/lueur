import Phaser from 'phaser';
import { BootScene } from './scenes/BootScene';

new Phaser.Game({
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
  scene: [BootScene],
});
