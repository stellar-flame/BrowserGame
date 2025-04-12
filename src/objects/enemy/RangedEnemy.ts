import { Scene, Physics } from 'phaser';
import { Enemy } from './Enemy';
import { Bullet } from '../Bullet';
import { EnemyConfig } from './EnemyConfigs';
import { WeaponFactory } from '../weapons/WeaponFactory';

export class RangedEnemy extends Enemy {
  private static animationsCreated: Map<string, boolean> = new Map();
  private config: EnemyConfig;
  protected minDistance: number;
  protected maxDistance: number;

  constructor(scene: Scene, x: number, y: number, id: string, config: EnemyConfig) {
    super(scene, x, y, id, config);
    this.config = config;
    
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

  protected isInAttackRange(): boolean {
    // Use the base Enemy class's playerPosition
    const distance = Phaser.Math.Distance.Between(
      this.x, this.y,
      this.playerPosition.x, this.playerPosition.y
    );
    
    return distance >= this.minDistance && distance <= this.maxDistance;
  }

  protected canAttack(): boolean {
    return this.isInAttackRange();
  }

  protected performAttack(): void {
    if (!this.weapon) return;
    
    // Use the weapon's fire method
    this.weapon.fire(this, this.playerPosition);
  }

  // Keep the public fire method for backward compatibility
  public fire(): void {
    this.performAttack();
  }

  protected createAnimations(scene: Scene): void {
    const animationKey = this.config.animationKey;
    if (RangedEnemy.animationsCreated.get(animationKey)) return;
    
    if (!scene.anims.exists(animationKey)) {
      scene.anims.create({
        key: animationKey,
        frames: scene.anims.generateFrameNumbers(this.config.sprite, { start: 0, end: 7 }),
        frameRate: 10,
        repeat: -1
      });
    }
    
    RangedEnemy.animationsCreated.set(animationKey, true);
  }

  public die(): void {
    // Deactivate all bullets in the weapon
    if (this.weapon) {
      this.weapon.deactivateAllBullets();
    }
    
    super.die();
  }

  preUpdate(time: number, delta: number) {
    super.preUpdate(time, delta);
    if (!this.body) return;
    
    // Play the walk animation
    this.play(this.config.animationKey, true);
    
    // Flip the sprite based on movement direction
    if (this.body.velocity.x < 0) {
      this.flipX = true;
    } else if (this.body.velocity.x > 0) {
      this.flipX = false;
    }
  }
} 