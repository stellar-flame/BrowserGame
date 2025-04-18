import { Scene } from 'phaser';
import { Enemy } from './Enemy';
import { RangedEnemy } from './RangedEnemy';
import { MeleeEnemy } from './MeleeEnemy';
import { ENEMY_CONFIGS } from './EnemyConfigs';

export type EnemyType = keyof typeof ENEMY_CONFIGS;

 
export class EnemyFactory {
  static createEnemy(
    scene: Scene, 
    type: EnemyType, 
    x: number, 
    y: number, 
    id: string,
  ): Enemy {
    const config = ENEMY_CONFIGS[type];
    
    const offsetForX = Math.random() * 50;
    const offsetForY = Math.random() * 50;
    const newX = x + offsetForX;
    const newY = y + offsetForY;
 
    if (config.type === 'melee') {
      return new MeleeEnemy(scene, newX, newY, id, config);
    } else {
      return new RangedEnemy(scene, newX, newY, id, config);
    }
  }


} 