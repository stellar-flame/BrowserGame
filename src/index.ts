import 'phaser';
import { MainScene } from './scenes/MainScene';

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  parent: 'game',
  backgroundColor: '#2d2d2d',
  scene: [MainScene],
  // scene: [EnemyTestScene],
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { x: 0, y: 0 },
      debug: false
    }
  },
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width: 800,
    height: 600,
    min: {
      width: 400,
      height: 300
    },
    max: {
      width: 1920,
      height: 1080
    },
    fullscreenTarget: 'game'
  },
  pixelArt: true,
  render: {
    pixelArt: true,
    antialias: false,
    roundPixels: true
  },
};

new Phaser.Game(config); 