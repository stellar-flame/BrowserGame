import { Scene, Physics } from 'phaser';
import { Enemy } from './Enemy';
import { Bullet } from '../Bullet';
import { EnemyConfig } from './EnemyConfigs';
import { WeaponFactory } from '../weapons/WeaponFactory';

export class RangedEnemy extends Enemy {
  protected minDistance: number;
  protected maxDistance: number;

  constructor(scene: Scene, x: number, y: number, id: string, config: EnemyConfig) {
    super(scene, x, y, id, config);
    
    // Apply configuration
    this.setTexture(config.sprite);
    this.setScale(config.scale);
    this.minDistance = config.minDistance || 100;
    this.maxDistance = config.maxDistance || 300;
    this.moveSpeed = config.moveSpeed;
    this.health = config.health;
    this.maxHealth = config.maxHealth;
    
    // Initialize weapon if specified in config
    if (config.weaponType) {
      this.weapon = WeaponFactory.createWeapon(scene, config.weaponType);
    }
    
    // Initialize animations
    this.createAnimations(scene);
  }

  protected isRangedEnemy(): this is RangedEnemy {
    return true;
  }

  protected canAttack(): boolean {
    return this.isInAttackRange();
  }

  protected performAttack(): void {
    if (!this.weapon || !this.player) return;
    
    // Use the weapon's fire method
    this.weapon.fire(this, this.player);
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

  protected handleMovement(distance: number, angle: number, body: Phaser.Physics.Arcade.Body): void {
    // Ranged enemies try to maintain optimal shooting distance
    const optimalDistance = (this.minDistance + this.maxDistance) / 2;
    
    if (distance > this.maxDistance) {
      // Move towards player if too far
      body.setVelocity(
        Math.cos(angle) * this.moveSpeed,
        Math.sin(angle) * this.moveSpeed
      );
    } else if (distance < this.minDistance) {
      // Move away from player if too close
      body.setVelocity(
        Math.cos(angle + Math.PI) * this.moveSpeed,
        Math.sin(angle + Math.PI) * this.moveSpeed
      );
    } else {
      // If within range, try to maintain optimal distance
      const distanceDiff = distance - optimalDistance;
      if (Math.abs(distanceDiff) > 20) { // Only move if significantly off optimal distance
        const moveAngle = distanceDiff > 0 ? angle : angle + Math.PI;
        body.setVelocity(
          Math.cos(moveAngle) * this.moveSpeed * 0.5, // Slower movement when adjusting position
          Math.sin(moveAngle) * this.moveSpeed * 0.5
        );
      } else {
        // Stop if at good distance
        body.setVelocity(0, 0);
      }
    }
  }
} 