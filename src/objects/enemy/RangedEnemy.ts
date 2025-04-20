import { Scene, Physics } from 'phaser';
import { Enemy } from './Enemy';
import { EnemyConfig } from './EnemyConfigs';

export class RangedEnemy extends Enemy {
  // Pathfinding properties

  constructor(scene: Scene, x: number, y: number, id: string, config: EnemyConfig) {
    super(scene, x, y, id, config);
  }


  protected performAttack(): void {
    if (!this.weapon || !this.player) return;

    // Use the weapon's fire method
    this.weapon.fireAtTarget(this, this.player);
  }


  // Keep the public fire method for backward compatibility
  public fire(): void {
    this.performAttack();
  }

  public die(): void {
    // Deactivate all bullets in the weapon
    if (this.weapon) {
      this.weapon.deactivateAllBullets();
    }

    super.die();
  }

} 