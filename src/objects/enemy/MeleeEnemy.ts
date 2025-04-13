import { Scene, Tilemaps } from 'phaser';
import { Enemy } from './Enemy';
import { EnemyConfig } from './EnemyConfigs';
import { WeaponFactory } from '../weapons/WeaponFactory';
import { MainScene } from '../../scenes/MainScene';

export class MeleeEnemy extends Enemy {
  private lastDamageTime: number = 0;
  private damageCooldown: number = 1000; // 1 second cooldown between damage
  
  // Pathfinding properties
  private currentPath: Array<{x: number, y: number}> = [];
  private pathUpdateTimer: number = 0;
  private pathUpdateInterval: number = 1000; // Update path every second
  private pathfindingEnabled: boolean = false;
  protected lastKnownPlayerPosition: { x: number, y: number } | null = null;

  constructor(scene: Scene, x: number, y: number, id: string, config: EnemyConfig) {
    super(scene, x, y, id, config);
    
    // Apply configuration
    this.setTexture(config.sprite);
    this.setScale(config.scale);
    this.moveSpeed = config.moveSpeed;
    this.health = config.maxHealth;
    this.maxHealth = config.maxHealth;
    
    // Initialize weapon if specified in config
    if (config.weaponType) {
      this.weapon = WeaponFactory.createWeapon(scene, config.weaponType);
    }
    // Get the sprite's texture size
    this.setHitBox();
    
    // Initialize animations
    this.createAnimations(scene);
    
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
  
  private findPathToPlayer(): void {
    if (!this.pathfindingEnabled) return;
    
    const mainScene = this.scene as MainScene;
    const player = mainScene.getPlayer();
    if (!player) return;
    
    const pathfindingGrid = mainScene.getPathfindingGrid();
    const easystar = pathfindingGrid.getEasyStar();
    const gridSize = pathfindingGrid.getGridSize();
    
    // Convert world coordinates to tile coordinates
    const startX = Math.floor(this.x / gridSize);
    const startY = Math.floor(this.y / gridSize);
    const endX = Math.floor(player.x / gridSize);
    const endY = Math.floor(player.y / gridSize);
    
    // Check if we already have a path to the player's current position
    const hasPathToCurrentPosition = this.lastKnownPlayerPosition && 
      this.lastKnownPlayerPosition.x === player.x && 
      this.lastKnownPlayerPosition.y === player.y &&
      this.currentPath.length > 0;
    
    // Only recalculate path if:
    // 1. We don't have a path to the player's current position, or
    // 2. The player has moved significantly
    if (!hasPathToCurrentPosition) {
      // Store current player position
      this.lastKnownPlayerPosition = { x: player.x, y: player.y };
      
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
  
  protected updateMovement() {
    // Update path periodically
    this.pathUpdateTimer += this.scene.game.loop.delta;
    if (this.pathUpdateTimer >= this.pathUpdateInterval) {
      this.pathUpdateTimer = 0;
      
      // Always try to find a path if we don't have one
      if (this.currentPath.length === 0) {
        this.findPathToPlayer();
      } else {
        // If we have a path, check if we need to update it
        const mainScene = this.scene as MainScene;
        const player = mainScene.getPlayer();
        
        if (player && this.lastKnownPlayerPosition) {
          const dx = this.lastKnownPlayerPosition.x - player.x;
          const dy = this.lastKnownPlayerPosition.y - player.y;
          const distance = Math.sqrt(dx * dx + dy * dy);
          
          // Update path if player has moved significantly
          const pathfindingGrid = mainScene.getPathfindingGrid();
          if (distance > pathfindingGrid.getGridSize()) {
            this.findPathToPlayer();
          }
        }
      }
    }
    
    // Follow the path if we have one
    if (this.currentPath.length > 0) {
      this.followPath();
    } else {
      // Fall back to default movement if no path
      // Call the base class's updateMovement method
      if (this.player) {
        const dx = this.player.x - this.x;
        const dy = this.player.y - this.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        const angle = Math.atan2(dy, dx);
        const body = this.body as Phaser.Physics.Arcade.Body;
        
        // Use the base class's handleMovement method
        this.handleMovement(distance, angle, body);
      }
    }
  }
  
  private followPath(): void {
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
      if (this.isInAttackRange()) {
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

  protected canAttack(): boolean {
    return this.isInAttackRange();
  }

  protected performAttack(): void {
    const currentTime = this.scene.time.now;
    if (currentTime - this.lastDamageTime > this.damageCooldown) {
      this.lastDamageTime = currentTime;
      
      // Apply damage to player if weapon exists
      if (this.weapon) {
        if (this.player) {
          this.weapon.dealDamage(this, this.player);
        }
      }
    }
  }

  protected handleMovement(distance: number, angle: number, body: Phaser.Physics.Arcade.Body): void {
    // Melee enemies try to get close to the player
    if (distance > (this.weapon?.minDistance || 0)) {
      // Move towards player if not in attack range
      body.setVelocity(
        Math.cos(angle) * this.moveSpeed,
        Math.sin(angle) * this.moveSpeed
      );
    } else {
      // Stop if in attack range
      body.setVelocity(0, 0);
    }
  }
} 