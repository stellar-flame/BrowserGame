import { Scene, Physics } from 'phaser';
import { HealthBar } from '../HealthBar';
import { RangedEnemy } from './RangedEnemy';
import { Weapon } from '../weapons/Weapon';
import { EnemyConfig } from './EnemyConfigs';
import { Player } from '../Player';

// Extend Physics.Arcade.Sprite for physics and preUpdate/update capabilities
export abstract class Enemy extends Physics.Arcade.Sprite {
  id: string; // Store the unique ID
  
  // Movement properties
  protected moveSpeed: number = 100;
  protected player: Player | null = null;
  
  // Health properties
  protected health: number = 3;
  protected maxHealth: number = 3;
  protected isDead: boolean = false;
  protected healthBar: HealthBar;
  public weapon: Weapon | null = null;
  
  // Static map to track created animations
  private static animationsCreated: Map<string, boolean> = new Map();
  protected config: EnemyConfig | null = null;

  constructor(scene: Scene, x: number, y: number, id: string, config?: EnemyConfig) {
    // Call Sprite constructor (use __WHITE texture key for tinting)
    super(scene, x, y, '__WHITE');

    this.id = id; // Assign the ID
    this.config = config || null;

    // Add to scene and enable physics
    scene.add.existing(this);
    scene.physics.world.enable(this); // Enable physics

    // Set a smaller hitbox for the enemy
    const enemyBody = this.body as Phaser.Physics.Arcade.Body;
    enemyBody.setSize(32, 32); // Make hitbox smaller than sprite
    enemyBody.setOffset(16, 16); // Center the hitbox
    
    // Ensure the enemy can collide with walls
    enemyBody.setCollideWorldBounds(true);
    enemyBody.setBounce(0); // No bounce when hitting walls
    enemyBody.setDrag(0); // No drag to ensure they can move freely

    // Apply config if provided
    if (config) {
      this.health = config.health || this.health;
      this.maxHealth = config.maxHealth || this.maxHealth;
      this.moveSpeed = config.moveSpeed || this.moveSpeed;
    }

    // Create health bar
    this.healthBar = new HealthBar(scene, this, 20, 2, false);
    this.healthBar.setHealth(this.health, this.maxHealth);
  }

  // Create animations method moved from subclasses
  protected createAnimations(scene: Scene): void {
    if (!this.config) return;
    
    const animationKey = this.config.animationKey;
    if (Enemy.animationsCreated.get(animationKey)) return;
    
    // Only create animation if animationConfig is provided
    if (this.config.animationConfig && !scene.anims.exists(animationKey)) {
      const animConfig = this.config.animationConfig;
      
      scene.anims.create({
        key: animationKey,
        frames: scene.anims.generateFrameNumbers(this.config.sprite, { 
          start: animConfig.startFrame, 
          end: animConfig.endFrame 
        }),
        frameRate: animConfig.frameRate,
        repeat: animConfig.repeat
      });
      
      Enemy.animationsCreated.set(animationKey, true);
    }
  }

  // Update method to handle movement and shooting logic
  preUpdate(time: number, delta: number) {
    super.preUpdate(time, delta);
    if (!this.body) return;
    
    // Play the walk animation only if animation config exists
    if (this.shouldPlayAnimation()) {
      this.play(this.config!.animationKey, true);
    }
    
    // Flip the sprite based on movement direction
    if (this.body.velocity.x < 0) {
      this.flipX = true;
    } else if (this.body.velocity.x > 0) {
      this.flipX = false;
    }
    
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
    console.log('updateMovement', this.player);
    if (!this.body || !this.player) return;
    
    const distance = Phaser.Math.Distance.Between(this.x, this.y, this.player.x, this.player.y);
    const body = this.body as Phaser.Physics.Arcade.Body;
    
    // Calculate angle to player
    const angle = Phaser.Math.Angle.Between(this.x, this.y, this.player.x, this.player.y);
    
    // Let subclasses handle specific movement behavior
    this.handleMovement(distance, angle, body);
    
    // Handle wall collisions
    if (body.blocked.left || body.blocked.right || body.blocked.up || body.blocked.down) {
      // If we're blocked by a wall, try to find an alternative path
      const currentAngle = Math.atan2(body.velocity.y, body.velocity.x);
      const alternativeAngle = currentAngle + (Math.PI / 2) * (Math.random() > 0.5 ? 1 : -1);
      
      // Try moving in the alternative direction
      body.setVelocity(
        Math.cos(alternativeAngle) * this.moveSpeed,
        Math.sin(alternativeAngle) * this.moveSpeed
      );
      
      // After a short delay, try moving towards the player again
      this.scene.time.delayedCall(200, () => {
        if (this.body && !this.isDead) {
          this.updateMovement();
        }
      });
    }
  }

  // Abstract method to be implemented by subclasses for specific movement behavior
  protected abstract handleMovement(distance: number, angle: number, body: Phaser.Physics.Arcade.Body): void;

  

  // Method to set player reference
  public setPlayer(player: Player): void {
    this.player = player;
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

  // Override the destroy method to ensure health bar is destroyed
  public destroy(fromScene?: boolean): void {
    // Destroy the health bar if it exists
    if (this.healthBar) {
      this.healthBar.destroy();
    }
    
    // Call the parent destroy method
    super.destroy(fromScene);
  }

  // Method to check if enemy is dead
  public isEnemyDead(): boolean {
    return this.isDead;
  }

  // Method to check if animations should be played
  protected shouldPlayAnimation(): boolean {
    return this.config !== null && this.config.animationKey !== undefined;
  }

  // Public method to destroy health bar
  public destroyHealthBar(): void {
    if (this.healthBar) {
      this.healthBar.destroy();
    }
  }

  // These methods are meant to be overridden by subclasses
  protected canAttack(): boolean {
    return false;
  }
  
  protected performAttack(): void {
    // Default implementation does nothing
  }

  // Method to check if enemy is in attack range
  protected isInAttackRange(): boolean {
    if (!this.weapon || !this.player) return false;
    
    const distance = Phaser.Math.Distance.Between(
      this.x, this.y,
      this.player.x, this.player.y
    );
    
    return distance >= this.weapon.minDistance && distance <= this.weapon.maxDistance;
  }
}
