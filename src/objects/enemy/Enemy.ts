import { Scene, Physics } from 'phaser';
import { HealthBar } from '../HealthBar';
import { RangedEnemy } from './RangedEnemy';
import { Weapon } from '../weapons/Weapon';
import { EnemyConfig } from './EnemyConfigs';

// Extend Physics.Arcade.Sprite for physics and preUpdate/update capabilities
export abstract class Enemy extends Physics.Arcade.Sprite {
  id: string; // Store the unique ID
  
  // Movement properties
  protected minDistance: number = 150;
  protected maxDistance: number = 350;
  protected moveSpeed: number = 100;
  protected playerX: number = 0;
  protected playerY: number = 0;
  
  // Health properties
  protected health: number = 3;
  protected maxHealth: number = 3;
  protected isDead: boolean = false;
  protected healthBar: HealthBar;
  public weapon: Weapon | null = null;

  constructor(scene: Scene, x: number, y: number, id: string, config?: EnemyConfig) {
    // Call Sprite constructor (use __WHITE texture key for tinting)
    super(scene, x, y, '__WHITE');

    this.id = id; // Assign the ID

    // Add to scene and enable physics
    scene.add.existing(this);
    scene.physics.world.enable(this); // Enable physics

    // Set a smaller hitbox for the enemy
    const enemyBody = this.body as Phaser.Physics.Arcade.Body;
    enemyBody.setSize(32, 32); // Make hitbox smaller than sprite
    enemyBody.setOffset(16, 16); // Center the hitbox

    // Apply config if provided
    if (config) {
      this.health = config.health || this.health;
      this.maxHealth = config.maxHealth || this.maxHealth;
      this.moveSpeed = config.moveSpeed || this.moveSpeed;
      this.minDistance = config.minDistance || this.minDistance;
      this.maxDistance = config.maxDistance || this.maxDistance;
    }

    // Create health bar
    this.healthBar = new HealthBar(scene, this, 20, 2, false);
    this.healthBar.setHealth(this.health, this.maxHealth);
  }

  // Protected method to be overridden by subclasses
  protected abstract createAnimations(scene: Scene): void;

  // Update method to handle movement and shooting logic
  preUpdate(time: number, delta: number) {
    super.preUpdate(time, delta);
    
    // Handle movement
    this.updateMovement();
    
    // Check if it's time to attack
    if (this.canAttack()) {
      this.performAttack();
    }

    // Update health bar position
    this.healthBar.update();
  }

  // Type guard to check if this is a RangedEnemy
  protected isRangedEnemy(): this is RangedEnemy {
    return false;
  }

  // Method to update enemy movement
  protected updateMovement() {
    if (!this.body) return;
    
    const distance = Phaser.Math.Distance.Between(this.x, this.y, this.playerX, this.playerY);
    const body = this.body as Phaser.Physics.Arcade.Body;
    
    // If too far, move closer
    if (distance > this.maxDistance) {
      const angle = Phaser.Math.Angle.Between(this.x, this.y, this.playerX, this.playerY);
      body.setVelocity(
        Math.cos(angle) * this.moveSpeed,
        Math.sin(angle) * this.moveSpeed
      );
    }
    // If too close, move away
    else if (distance < this.minDistance) {
      const angle = Phaser.Math.Angle.Between(this.playerX, this.playerY, this.x, this.y);
      body.setVelocity(
        Math.cos(angle) * this.moveSpeed,
        Math.sin(angle) * this.moveSpeed
      );
    }
    // If at good distance, stop moving
    else {
      body.setVelocity(0, 0);
    }
  }

  // Method to update player position for targeting
  public updatePlayerPosition(x: number, y: number): void {
    this.playerX = x;
    this.playerY = y;
  }

  // Method to take damage
  public takeDamage(amount: number): void {
    if (this.isDead) return;
    
    this.health -= amount;
    this.healthBar.setHealth(this.health, this.maxHealth);
    
    // Visual feedback
    this.setTint(0xff0000);
    this.scene.time.delayedCall(100, () => {
      this.clearTint();
    });
    
    if (this.health <= 0) {
      this.die();
    }
  }

  // Method to handle enemy death
  public die(): void {
    this.isDead = true;
    
    // Destroy the health bar if it exists
    if (this.healthBar) {
      this.healthBar.destroy();
    }
    
    // Destroy the enemy sprite
    this.destroy();
  }

  // Method to check if enemy is dead
  public isEnemyDead(): boolean {
    return this.health <= 0;
  }

  // These methods are meant to be overridden by subclasses
  protected canAttack(): boolean {
    return false;
  }
  
  protected performAttack(): void {
    // Default implementation does nothing
  }
}
