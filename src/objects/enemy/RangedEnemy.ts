import { Scene, Physics } from 'phaser';
import { Enemy } from './Enemy';
import { Bullet } from '../Bullet';
import { EnemyConfig } from './EnemyConfigs';
import { WeaponFactory } from '../weapons/WeaponFactory';

export class RangedEnemy extends Enemy {
  private static animationsCreated: Map<string, boolean> = new Map();
  private config: EnemyConfig;
  public bullets: Physics.Arcade.Group;
  protected minDistance: number;
  protected maxDistance: number;
  protected playerPosition: Phaser.Math.Vector2 | null = null;

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
    
    // Initialize bullets group
    this.bullets = this.createBulletGroup(scene);
    
    // Initialize animations
    this.createAnimations(scene);
  }

  private createBulletGroup(scene: Scene): Physics.Arcade.Group {
    return scene.physics.add.group({ 
      classType: Bullet, 
      maxSize: 10,
      createCallback: (item: Phaser.GameObjects.GameObject) => {
        const bullet = item as Bullet;
        bullet.setTexture(this.weapon?.bulletSprite || 'arrow');
        bullet.setDisplaySize(32, 16);
        bullet.setOrigin(0.5, 0.5);
        bullet.setDamage(this.weapon?.damage || 10);
      }
    });
  }

  public updatePlayerPosition(x: number, y: number): void {
    this.playerPosition = new Phaser.Math.Vector2(x, y);
  }

  protected isRangedEnemy(): this is RangedEnemy {
    return true;
  }

  protected isInAttackRange(): boolean {
    if (!this.playerPosition) return false;
    
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
    if (!this.weapon || !this.playerPosition) return;
    
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
    // Deactivate all bullets
    if (this.bullets) {
      this.bullets.getChildren().forEach((bullet) => {
        (bullet as Bullet).deactivate();
      });
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