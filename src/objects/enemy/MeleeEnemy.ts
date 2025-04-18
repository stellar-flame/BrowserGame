import { Scene } from 'phaser';
import { Enemy } from './Enemy';
import { EnemyConfig } from './EnemyConfigs';
import { MainScene } from '../../scenes/MainScene';

export class MeleeEnemy extends Enemy {
  private lastDamageTime: number = 0;
  private damageCooldown: number = 1000; // 1 second cooldown between damage
  
  // Pathfinding properties
 
  constructor(scene: Scene, x: number, y: number, id: string, config: EnemyConfig) {
    super(scene, x, y, id, config);
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
  
  protected stopFollowingPath(): boolean {
    return this.isInAttackRange();
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