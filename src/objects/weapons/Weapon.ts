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
  public bulletWidth?: number;
  public bulletHeight?: number;
  public bulletSpinSpeed?: number;
  public type: 'melee' | 'ranged';
  public bullets?: Physics.Arcade.Group;
  public minDistance: number = 50;
  public maxDistance: number = 200;
  
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
    this.minDistance = config.minDistance || this.minDistance;
    this.maxDistance = config.maxDistance || this.maxDistance;
    
    // Set bullet properties for ranged weapons
    if (this.type === 'ranged') {
      this.bulletSpeed = config.bulletSpeed || 300;
      this.bulletSprite = config.bulletSprite || 'arrow';
      this.bulletWidth = config.bulletWidth || 32;
      this.bulletHeight = config.bulletHeight || 16;
      this.bulletSpinSpeed = config.bulletSpinSpeed || 0;
      
      // Create bullet group for ranged weapons
      this.bullets = this.createBulletGroup(scene);
    }
  }
  
  private createBulletGroup(scene: Scene): Physics.Arcade.Group {
    return scene.physics.add.group({ 
      classType: Bullet, 
      maxSize: 10,
      createCallback: (item: Phaser.GameObjects.GameObject) => {
        const bullet = item as Bullet;
        bullet.setTexture(this.bulletSprite || 'arrow');
        bullet.setDisplaySize(this.bulletWidth || 32, this.bulletHeight || 16);
        bullet.setOrigin(0.5, 0.5);
        bullet.setDamage(this.damage);
      }
    });
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
  public fire(shooter: RangedEnemy, target: Player): void {
    if (this.type !== 'ranged' || !this.bullets) return;
    
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

    // Get a bullet from the weapon's bullet group
    const bullet = this.bullets.get() as Bullet;
    if (bullet) {
      bullet.fire(shooter.x, shooter.y, angle);
      
      // Apply spinning animation if specified
      if (this.bulletSpinSpeed !== undefined && this.bulletSpinSpeed !== 0) {
        // Add a tween to continuously rotate the bullet
        this.scene.tweens.add({
          targets: bullet,
          angle: 360,
          duration: 1000 / this.bulletSpinSpeed, // Duration based on spin speed
          repeat: -1, // Infinite repeat
          ease: 'Linear' // Linear easing for smooth rotation
        });
      }
    }
     
    this.lastFired = currentTime;
  }
  
  // Method to deactivate all bullets (used when enemy dies)
  public deactivateAllBullets(): void {
    if (this.bullets) {
      this.bullets.getChildren().forEach((bullet) => {
        (bullet as Bullet).deactivate();
      });
    }
  }
} 