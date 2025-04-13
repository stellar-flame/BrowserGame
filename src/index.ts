import 'phaser';
import { MainScene } from './scenes/MainScene';
import { TestScene } from './scenes/TestScene';

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  width: 800,
  height: 600,
  parent: 'game',
  backgroundColor: '#2d2d2d',
  scene: [TestScene],
  // scene: [MainScene],
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
      width: 800,
      height: 600
    },
    max: {
      width: 1920,
      height: 1080
    }
  },
  pixelArt: true,
  render: {
    pixelArt: true,
    antialias: false
  }
};

new Phaser.Game(config); 