import { Scene } from 'phaser';
import { Enemy } from './Enemy';
import { MeleeEnemy } from './MeleeEnemy';
import { RangedEnemy } from './RangedEnemy';
import { ENEMY_CONFIGS } from './EnemyConfigs';

export type EnemyType = keyof typeof ENEMY_CONFIGS;

export class EnemyFactory {
  static createEnemy(scene: Scene, type: EnemyType, x: number, y: number, id: string): Enemy {
    const config = ENEMY_CONFIGS[type];
    
    if (config.type === 'melee') {
      return new MeleeEnemy(scene, x, y, id, config);
    } else {
      return new RangedEnemy(scene, x, y, id, config);
    }
  }
} 