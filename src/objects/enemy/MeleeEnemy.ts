import { Scene } from 'phaser';
import { Enemy } from './Enemy';
import { EnemyConfig } from './EnemyConfigs';

export class MeleeEnemy extends Enemy {

  // Pathfinding properties

  constructor(scene: Scene, x: number, y: number, id: string, config: EnemyConfig) {
    super(scene, x, y, id, config);
  }

  protected performAttack(): void {
    // Apply damage to player if weapon exists
    if (this.weapon) {
      if (this.player) {
        this.weapon.dealDamage(this, this.player);
      }
    }
  }
} 