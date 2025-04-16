import { Scene, Physics } from 'phaser';
import { HealthBar } from '../HealthBar';
import { RangedEnemy } from './RangedEnemy';
import { Weapon } from '../weapons/Weapon';
import { EnemyConfig } from './EnemyConfigs';
import { Player } from '../Player';
import { MainScene } from '../../scenes/MainScene';


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

  protected pathfindingEnabled: boolean = false;
  protected currentPath: Array<{x: number, y: number}> = [];
  protected pathUpdateTimer: number = 0;
  protected pathUpdateInterval: number = 1000; // Update path every second

 
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


    // Initialize pathfinding
    this.initializePathfinding();
  }


  private initializePathfinding(): void {
    // Get the pathfinding grid from the scene
    const mainScene = this.scene as MainScene;
    const pathfindingGrid = mainScene.getPathfindingGrid();
    
    if (pathfindingGrid) {
      // Enable pathfinding
      this.pathfindingEnabled = true;
    }
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

  protected findPathToPlayer(): void {
    if (!this.pathfindingEnabled) return;
    
    const mainScene = this.scene as MainScene;
    if (!this.player) return;
    
    const pathfindingGrid = mainScene.getPathfindingGrid();
    const easystar = pathfindingGrid.getEasyStar();
    const gridSize = pathfindingGrid.getGridSize();
    
    // Convert world coordinates to tile coordinates
    const startX = Math.floor(this.x / gridSize);
    const startY = Math.floor(this.y / gridSize);
    const endX = Math.floor(this.player.x / gridSize);
    const endY = Math.floor(this.player.y / gridSize);
    

    // Check if we already have a path to the player's current position
    const hasPathToCurrentPosition = this.lastKnownPlayerPosition && 
      this.lastKnownPlayerPosition.x === this.player.x && 
      this.lastKnownPlayerPosition.y === this.player.y &&
      this.currentPath.length > 0;
    
    // Only recalculate path if:
    // 1. We don't have a path to the player's current position, or
    // 2. The player has moved significantly
    if (!hasPathToCurrentPosition) {
      // Store current player position
      this.lastKnownPlayerPosition = { x: this.player.x, y: this.player.y };
      
      // Find path to player
      easystar.findPath(startX, startY, endX, endY, (path) => {
        if (path) {
          // Convert tile coordinates to world coordinates
          this.currentPath = path.map(point => ({
            x: point.x * gridSize + gridSize / 2,
            y: point.y * gridSize + gridSize / 2
          }));
          
          // Remove the first point if it's too close to the enemy
          if (this.currentPath.length > 0) {
            const firstPoint = this.currentPath[0];
            const dx = firstPoint.x - this.x;
            const dy = firstPoint.y - this.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            if (distance < 5) {
              this.currentPath.shift();
            }
          }
        } else {
          // If no path found, try to find a path to a point closer to the player
          console.log("No path found to player, trying alternative path");
          this.findAlternativePath(startX, startY, endX, endY);
        }
      });
      easystar.calculate();
    }
  }

  private findAlternativePath(startX: number, startY: number, endX: number, endY: number): void {
    const mainScene = this.scene as MainScene;
    const pathfindingGrid = mainScene.getPathfindingGrid();
    const easystar = pathfindingGrid.getEasyStar();
    const gridSize = pathfindingGrid.getGridSize();
    
    // Try to find a path to a point closer to the player
    // This helps when there's no direct path but we can get closer
    
    // Calculate direction vector from start to end
    const dx = endX - startX;
    const dy = endY - startY;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    // Normalize direction vector
    const dirX = dx / distance;
    const dirY = dy / distance;
    
    // Try points at increasing distances along the direction vector
    const maxAttempts = 5;
    let attempt = 0;
    
    const tryPath = () => {
      if (attempt >= maxAttempts) {
        console.log("Failed to find any path after multiple attempts");
        return;
      }
      
      // Calculate a point at increasing distance
      const attemptDistance = Math.min(distance * 0.5, (attempt + 1) * 5);
      const targetX = Math.floor(startX + dirX * attemptDistance);
      const targetY = Math.floor(startY + dirY * attemptDistance);
      
      // Ensure target is within map bounds
      const map = (this.scene as MainScene).getTilemap();
      if (!map) return;
      
      const boundedX = Math.max(0, Math.min(targetX, map.width - 1));
      const boundedY = Math.max(0, Math.min(targetY, map.height - 1));
      
      console.log(`Trying alternative path to (${boundedX}, ${boundedY})`);
      
      easystar.findPath(startX, startY, boundedX, boundedY, (path) => {
        if (path) {
          // Convert tile coordinates to world coordinates
          this.currentPath = path.map(point => ({
            x: point.x * gridSize + gridSize / 2,
            y: point.y * gridSize + gridSize / 2
          }));
          
          console.log(`Found alternative path with ${this.currentPath.length} waypoints`);
        } else {
          // Try next attempt
          attempt++;
          tryPath();
        }
      });
      easystar.calculate();
    };
    
    tryPath();
  }
  
  protected followPath(): void {
    if (this.currentPath.length === 0) return;
    // Get the next waypoint
    const nextWaypoint = this.currentPath[0];
    
    // Calculate direction to the waypoint
    const dx = nextWaypoint.x - this.x;
    const dy = nextWaypoint.y - this.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    // If we're close enough to the waypoint, move to the next one
    if (distance < 5) {
      this.currentPath.shift();
      return;
    }
    
    // Check if we're in attack range of the player
    if (this.player) {
      
      // If we're in attack range, stop moving
      if (this.stopFollowingPath()) {
        const body = this.body as Phaser.Physics.Arcade.Body;
        body.setVelocity(0, 0);
        return;
      }
    }
    
    // Move towards the waypoint
    const angle = Math.atan2(dy, dx);
    const body = this.body as Phaser.Physics.Arcade.Body;
    
    // Apply velocity with some smoothing for more natural movement
    const targetVx = Math.cos(angle) * this.moveSpeed;
    const targetVy = Math.sin(angle) * this.moveSpeed;
    
    // Smooth the velocity change
    const smoothingFactor = 0.1;
    const currentVx = body.velocity.x;
    const currentVy = body.velocity.y;
    
    const newVx = currentVx + (targetVx - currentVx) * smoothingFactor;
    const newVy = currentVy + (targetVy - currentVy) * smoothingFactor;
    
    body.setVelocity(newVx, newVy);
  }

  protected stopFollowingPath(): boolean {
    return false;
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
  protected abstract updateMovement(): void;

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

  // Abstract method to be implemented by subclasses for specific movement behavior
  protected abstract handleMovement(distance: number, angle: number, body: Phaser.Physics.Arcade.Body): void;
}
