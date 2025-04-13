import { Scene } from 'phaser';
import { Enemy } from './Enemy';
import { EnemyConfig } from './EnemyConfigs';
import { WeaponFactory } from '../weapons/WeaponFactory';

export class MeleeEnemy extends Enemy {
  private lastDamageTime: number = 0;
  private damageCooldown: number = 1000; // 1 second cooldown between damage

  constructor(scene: Scene, x: number, y: number, id: string, config: EnemyConfig) {
    super(scene, x, y, id, config);
    
    // Apply configuration
    this.setTexture(config.sprite);
    this.setScale(config.scale);
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

  protected canAttack(): boolean {
    return this.isInAttackRange();
  }

  protected performAttack(): void {
    const currentTime = this.scene.time.now;
    if (currentTime - this.lastDamageTime > this.damageCooldown) {
      this.lastDamageTime = currentTime;
      
      // Apply damage to player if weapon exists
      if (this.weapon) {
        if (this.player) {
          this.weapon.dealDamage(this, this.player);
        }
      }
    }
  }

  protected handleMovement(distance: number, angle: number, body: Phaser.Physics.Arcade.Body): void {
    // Melee enemies try to get close to the player
    if (distance > (this.weapon?.minDistance || 0)) {
      // Move towards player if not in attack range
      body.setVelocity(
        Math.cos(angle) * this.moveSpeed,
        Math.sin(angle) * this.moveSpeed
      );
    } else {
      // Stop if in attack range
      body.setVelocity(0, 0);
    }
  }
} 