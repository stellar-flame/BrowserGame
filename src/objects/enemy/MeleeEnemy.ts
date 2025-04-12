import { Scene } from 'phaser';
import { Enemy } from './Enemy';
import { EnemyConfig } from './EnemyConfigs';
import { WeaponFactory } from '../weapons/WeaponFactory';

export class MeleeEnemy extends Enemy {
  private static animationsCreated: Map<string, boolean> = new Map();
  private config: EnemyConfig;
  private lastDamageTime: number = 0;
  private damageCooldown: number = 1000; // 1 second cooldown between damage
  private attackRange: number = 50; // Default attack range for melee enemies

  constructor(scene: Scene, x: number, y: number, id: string, config: EnemyConfig) {
    super(scene, x, y, id, config);
    this.config = config;
    
    // Apply configuration
    this.setTexture(config.sprite);
    this.setScale(config.scale);
    this.minDistance = config.minDistance;
    this.maxDistance = config.maxDistance;
    this.moveSpeed = config.moveSpeed;
    this.health = config.health;
    this.maxHealth = config.maxHealth;
    this.attackRange = config.attackRange || 50; // Use config value or default
    
    // Initialize weapon if specified in config
    if (config.weaponType) {
      this.weapon = WeaponFactory.createWeapon(scene, config.weaponType);
    }
    
    // Initialize animations
    this.createAnimations(scene);
  }

  protected isInAttackRange(): boolean {
    const distance = Phaser.Math.Distance.Between(
      this.x, this.y,
      this.playerPosition.x, this.playerPosition.y
    );
    
    return distance <= this.attackRange;
  }

  protected canAttack(): boolean {
    return this.isInAttackRange();
  }

  protected performAttack(): void {
    const currentTime = this.scene.time.now;
    if (currentTime - this.lastDamageTime > this.damageCooldown) {
      this.lastDamageTime = currentTime;
    }
  }

  protected createAnimations(scene: Scene): void {
    const animationKey = this.config.animationKey;
    if (MeleeEnemy.animationsCreated.get(animationKey)) return;
    
    if (!scene.anims.exists(animationKey)) {
      scene.anims.create({
        key: animationKey,
        frames: scene.anims.generateFrameNumbers(this.config.sprite, { start: 0, end: 7 }),
        frameRate: 10,
        repeat: -1
      });
    }
    
    MeleeEnemy.animationsCreated.set(animationKey, true);
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