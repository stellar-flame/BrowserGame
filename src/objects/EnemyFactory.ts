import { Scene, Physics } from 'phaser';
import { Enemy } from './Enemy';
import { RangedEnemy } from './RangedEnemy';

export enum EnemyType {
  BASIC = 'BASIC',
  RANGED = 'RANGED'
}

export class EnemyFactory {
  private scene: Scene;

  constructor(scene: Scene) {
    this.scene = scene;
  }

  createEnemy(type: EnemyType, x: number, y: number, id: string): Enemy {
    switch (type) {
      case EnemyType.BASIC:
        return new Enemy(this.scene, x, y, id);
      case EnemyType.RANGED:
        return new RangedEnemy(this.scene, x, y, id);
      default:
        console.warn(`Unknown enemy type: ${type}, defaulting to basic enemy`);
        return new Enemy(this.scene, x, y, id);
    }
  }
} 