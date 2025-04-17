import { Scene, Physics, Math } from 'phaser';
import { Player } from '../Player';
import { Enemy } from '../enemy/Enemy';
import { RangedEnemy } from '../enemy/RangedEnemy';
import { Bullet } from './Bullet';
import { WeaponConfig } from './WeaponConfigs';

export class Weapon {
  public damage: number;
  public attackSpeed: number;
  public attackRate: number;
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
    this.attackSpeed = config.attackSpeed;
    this.attackRate = config.attackRate || 1000 / this.attackSpeed; // Default to calculated from attackSpeed if not provided
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
        
        // Set a smaller hit area for the bullet
        const body = bullet.body as Phaser.Physics.Arcade.Body;
        if (body) {
          // Make hit area 50% of the display size
          const hitWidth = 8;
          const hitHeight = 8;
          body.setSize(hitWidth, hitHeight);
        }
      }
    });
  }

  // Deal damage method for melee weapons
  public dealDamage(attacker: Player | Enemy, target: Player | Enemy): void {
    if (this.type !== 'melee') return;
    
    // Check attack rate cooldown
    const currentTime = this.scene.time.now;
    if (currentTime - this.lastFired < this.attackRate) return;
    
    // Calculate distance to target
    const distance = Phaser.Math.Distance.Between(
      attacker.x, attacker.y,
      target.x, target.y
    );
    // Only attack if in range
    if (distance <= this.maxDistance) {
      // Apply damage to target
      target.takeDamage(this.damage);
      this.lastFired = currentTime;
    }
  }

  // Fire method for ranged weapons
  public fire(shooter: RangedEnemy, target: Player): void {
    if (this.type !== 'ranged' || !this.bullets) return;
    
    // Check attack rate cooldown
    const currentTime = this.scene.time.now;
    if (currentTime - this.lastFired < this.attackRate) return;
    
    // Get target position
    const targetX = target.x;
    const targetY = target.y;
    
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