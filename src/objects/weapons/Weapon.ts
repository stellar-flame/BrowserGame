import { Scene, Physics, Math } from 'phaser';
import { Player } from '../Player';
import { Enemy } from '../enemy/Enemy';
import { RangedEnemy } from '../enemy/RangedEnemy';
import { Bullet } from '../Bullet';
import { WeaponConfig } from './WeaponConfigs';

export class Weapon {
  public damage: number;
  public range: number;
  public attackSpeed: number;
  public bulletSpeed?: number;
  public bulletSprite?: string;
  public type: 'melee' | 'ranged';
  
  private scene: Scene;
  private config: WeaponConfig;
  private lastFired: number = 0;

  constructor(scene: Scene, config: WeaponConfig) {
    this.scene = scene;
    this.config = config;
    
    // Apply configuration
    this.type = config.type;
    this.damage = config.damage;
    this.range = config.range;
    this.attackSpeed = config.attackSpeed;
    
    // Set bullet properties for ranged weapons
    if (this.type === 'ranged') {
      this.bulletSpeed = config.bulletSpeed || 300;
      this.bulletSprite = config.bulletSprite || 'arrow';
    }
  }

  // Deal damage method for melee weapons
  public dealDamage(attacker: Player | Enemy, target: Player | Enemy): void {
    if (this.type !== 'melee') return;
    
    // Check attack speed cooldown
    const currentTime = this.scene.time.now;
    if (currentTime - this.lastFired < 1000 / this.attackSpeed) return;
    
    // Calculate distance to target
    const distance = Phaser.Math.Distance.Between(
      attacker.x, attacker.y,
      target.x, target.y
    );
    
    // Only attack if in range
    if (distance <= this.range) {
      // Apply damage to target
      target.takeDamage(this.damage);
      this.lastFired = currentTime;
    }
  }

  // Fire method for ranged weapons
  public fire(shooter: RangedEnemy, target: Player | Math.Vector2): void {
    if (this.type !== 'ranged') return;
    
    // Check attack speed cooldown
    const currentTime = this.scene.time.now;
    if (currentTime - this.lastFired < 1000 / this.attackSpeed) return;
    
    // Get target position
    const targetX = target instanceof Player ? target.x : target.x;
    const targetY = target instanceof Player ? target.y : target.y;
    
    // Calculate angle to target
    const angle = Phaser.Math.Angle.Between(
      shooter.x,
      shooter.y,
      targetX,
      targetY
    );

    // Get a bullet from the enemy's bullet group
    const bullet = shooter.bullets.get() as Bullet;
    if (bullet) {
      // Set the bullet texture if specified
      if (this.bulletSprite) {
        bullet.setTexture(this.bulletSprite);
      }
      
      bullet.fire(shooter.x, shooter.y, angle);
      bullet.setDamage(this.damage);
    }
     
    this.lastFired = currentTime;
  }
} 