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

  // Steering behavior properties
  protected seekWeight: number = 1.0;
  protected avoidWeight: number = 1.5;
  protected separationWeight: number = 0.8;
  protected maxSteeringForce: number = 0.5;
  protected wallAvoidanceForce: number = 50;
  protected separationRadius: number = 50;

  // Add new property for path finding
  protected lastKnownPlayerPosition: { x: number, y: number } | null = null;
  protected stuckTimer: number = 0;
  protected isStuck: boolean = false;
  protected alternativeDirection: { x: number, y: number } | null = null;

  constructor(scene: Scene, x: number, y: number, id: string, config?: EnemyConfig) {
    // Call Sprite constructor (use __WHITE texture key for tinting)
    super(scene, x, y, '__WHITE');

    this.id = id; // Assign the ID
    this.config = config || null;

    // Add to scene and enable physics
    scene.add.existing(this);
    scene.physics.world.enable(this); // Enable physics
    
    // Get the physics body
    const enemyBody = this.body as Phaser.Physics.Arcade.Body;
    
    // Ensure the enemy can collide with walls
    enemyBody.setCollideWorldBounds(true);
  //  enemyBody.setBounce(0); // No bounce when hitting walls
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

  protected setHitBox() {
    if (!this.body) return;
    
    const enemyBody = this.body as Phaser.Physics.Arcade.Body;
   
    // Get the frame dimensions instead of texture dimensions
    const frameWidth = this.frame.width;
    const frameHeight = this.frame.height;
    const midWidth = frameWidth / 2;
    const midHeight = frameHeight / 2;

    // Set hitbox size to match frame size
    enemyBody.setSize(midWidth  , midHeight );
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
    if (!this.body || !this.player) return;
    
    const body = this.body as Phaser.Physics.Arcade.Body;
    const distance = Phaser.Math.Distance.Between(this.x, this.y, this.player.x, this.player.y);
    const angle = Phaser.Math.Angle.Between(this.x, this.y, this.player.x, this.player.y);
    
    // Calculate steering forces
    const steering = this.calculateSteering(body);
  
    
    // Apply steering to velocity
    body.setVelocity(
      body.velocity.x + steering.x,
      body.velocity.y + steering.y
    );
    
    // Limit speed to moveSpeed
    const currentSpeed = Math.sqrt(body.velocity.x * body.velocity.x + body.velocity.y * body.velocity.y);
    if (currentSpeed > this.moveSpeed) {
      body.setVelocity(
        (body.velocity.x / currentSpeed) * this.moveSpeed,
        (body.velocity.y / currentSpeed) * this.moveSpeed
      );
    }
    
    // Let subclasses handle any specific movement behavior
    this.handleMovement(distance, angle, body);
  }
  
  private calculateSteering(body: Phaser.Physics.Arcade.Body): { x: number, y: number } {
    const steering = { x: 0, y: 0 };
    
    // Add seeking force toward player
    const seekForce = this.calculateSeekForce();
    steering.x += seekForce.x * this.seekWeight;
    steering.y += seekForce.y * this.seekWeight;
    
    // Add wall avoidance force if near walls
    if (body.blocked.left || body.blocked.right || body.blocked.up || body.blocked.down) {
      const avoidForce = this.calculateWallAvoidanceForce(body);
      steering.x += avoidForce.x * this.avoidWeight;
      steering.y += avoidForce.y * this.avoidWeight;
    }
    
    // Add separation force from other enemies
    const separationForce = this.calculateSeparationForce();
    steering.x += separationForce.x * this.separationWeight;
    steering.y += separationForce.y * this.separationWeight;
    
    // Limit maximum steering force
    const steeringMagnitude = Math.sqrt(steering.x * steering.x + steering.y * steering.y);
    if (steeringMagnitude > this.maxSteeringForce) {
      steering.x = (steering.x / steeringMagnitude) * this.maxSteeringForce;
      steering.y = (steering.y / steeringMagnitude) * this.maxSteeringForce;
    }
    
    return steering;
  }
  
  private calculateSeekForce(): { x: number, y: number } {
    if (!this.player) return { x: 0, y: 0 };
    
    // Calculate desired velocity (normalized direction to player * moveSpeed)
    const dx = this.player.x - this.x;
    const dy = this.player.y - this.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    if (distance === 0) return { x: 0, y: 0 };
    
    return {
      x: (dx / distance) * this.moveSpeed,
      y: (dy / distance) * this.moveSpeed
    };
  }
  
  private calculateWallAvoidanceForce(body: Phaser.Physics.Arcade.Body): { x: number, y: number } {
    const wallNormal = this.getWallNormal(body);
    
    // Calculate direction to player
    if (!this.player) return { x: 0, y: 0 };
    const dx = this.player.x - this.x;
    const dy = this.player.y - this.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    if (distance === 0) return { x: 0, y: 0 };
    
    // Calculate the dot product between wall normal and direction to player
    const dotProduct = (wallNormal.x * dx + wallNormal.y * dy) / distance;
    
    // Check if we're stuck against a wall
    const isBlockedByWall = body.blocked.left || body.blocked.right || body.blocked.up || body.blocked.down;
    if (isBlockedByWall) {
      this.stuckTimer += 1;
      if (this.stuckTimer > 60) { // After about 1 second of being stuck
        this.isStuck = true;
        // Store last known player position
        this.lastKnownPlayerPosition = { x: this.player.x, y: this.player.y };
        // Generate alternative direction
        this.generateAlternativeDirection(wallNormal);
      }
    } else {
      this.stuckTimer = 0;
      this.isStuck = false;
      this.alternativeDirection = null;
    }
    
    // If stuck, use alternative direction
    if (this.isStuck && this.alternativeDirection) {
      return {
        x: this.alternativeDirection.x * this.moveSpeed,
        y: this.alternativeDirection.y * this.moveSpeed
      };
    }
    
    // Normal wall avoidance behavior
    const avoidanceMultiplier = dotProduct < 0 ? 2.0 : 1.0;
    const slideDirection = {
      x: -wallNormal.y,
      y: wallNormal.x
    };
    
    return {
      x: (wallNormal.x * this.wallAvoidanceForce * avoidanceMultiplier + slideDirection.x * this.moveSpeed) * 0.5,
      y: (wallNormal.y * this.wallAvoidanceForce * avoidanceMultiplier + slideDirection.y * this.moveSpeed) * 0.5
    };
  }
  
  private generateAlternativeDirection(wallNormal: { x: number, y: number }): void {
    // Try to find a direction that's not blocked by the wall
    const possibleDirections = [
      { x: -wallNormal.y, y: wallNormal.x },  // Perpendicular clockwise
      { x: wallNormal.y, y: -wallNormal.x },  // Perpendicular counter-clockwise
      { x: wallNormal.x, y: wallNormal.y },   // Along wall
      { x: -wallNormal.x, y: -wallNormal.y }  // Opposite to wall
    ];
    
    // Choose the direction that's most towards the player's last known position
    if (this.lastKnownPlayerPosition) {
      let bestDirection = possibleDirections[0];
      let bestDotProduct = -Infinity;
      
      for (const dir of possibleDirections) {
        const dx = this.lastKnownPlayerPosition.x - this.x;
        const dy = this.lastKnownPlayerPosition.y - this.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance === 0) continue;
        
        const dotProduct = (dir.x * dx + dir.y * dy) / distance;
        if (dotProduct > bestDotProduct) {
          bestDotProduct = dotProduct;
          bestDirection = dir;
        }
      }
      
      this.alternativeDirection = bestDirection;
    } else {
      // If no last known position, just pick a random perpendicular direction
      this.alternativeDirection = possibleDirections[Math.floor(Math.random() * 2)];
    }
  }
  
  private calculateSeparationForce(): { x: number, y: number } {
    const separation = { x: 0, y: 0 };
    let count = 0;
    
    // Get all enemies in the scene
    const enemies = (this.scene as any).enemies;
    if (!enemies) return separation;
    
    // Check each enemy
    enemies.getChildren().forEach((enemy: any) => {
      if (enemy === this) return;
      
      const distance = Phaser.Math.Distance.Between(this.x, this.y, enemy.x, enemy.y);
      
      // If within separation radius, add separation force
      if (distance < this.separationRadius) {
        const dx = this.x - enemy.x;
        const dy = this.y - enemy.y;
        
        // Normalize and scale by distance (closer = stronger)
        const force = (this.separationRadius - distance) / this.separationRadius;
        
        separation.x += (dx / distance) * force;
        separation.y += (dy / distance) * force;
        count++;
      }
    });
    
    // Average the separation force
    if (count > 0) {
      separation.x /= count;
      separation.y /= count;
    }
    
    return separation;
  }
  
  // Helper method to determine the normal vector of the wall being hit
  private getWallNormal(body: Phaser.Physics.Arcade.Body): { x: number, y: number } {
    if (body.blocked.left) return { x: 1, y: 0 };
    if (body.blocked.right) return { x: -1, y: 0 };
    if (body.blocked.up) return { x: 0, y: 1 };
    if (body.blocked.down) return { x: 0, y: -1 };
    return { x: 0, y: 0 };
  }

  // Method to set player reference
  public setPlayer(player: Player): void {
    this.player = player;
  }

  // Method to take damage
  public takeDamage(amount: number): void {
    console.log('takeDamage', amount);
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

  // Abstract method to be implemented by subclasses for specific movement behavior
  protected abstract handleMovement(distance: number, angle: number, body: Phaser.Physics.Arcade.Body): void;
}
