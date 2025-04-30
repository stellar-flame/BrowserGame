import { Scene, Physics } from 'phaser';
import { Enemy } from './Enemy';
import { EnemyConfig } from './EnemyConfigs';
import { EnemyType } from './EnemyFactory';

export class RangedEnemy extends Enemy {
  // Pathfinding properties

  constructor(scene: Scene, x: number, y: number, id: string, enemyType: EnemyType, config: EnemyConfig) {
    super(scene, x, y, id, enemyType, config);
  }


  override performAttack(): void {
    if (!this.weapon || !this.player) return;

    // Use the weapon's fire method
    this.weapon.fireAtTarget(this, this.player);
  }


  // Keep the public fire method for backward compatibility
  public fire(): void {
    this.performAttack();
  }

  override die(): void {
    // Deactivate all bullets in the weapon
    if (this.weapon) {
      this.weapon.deactivateAllBullets();
    }

    super.die();
  }

} 