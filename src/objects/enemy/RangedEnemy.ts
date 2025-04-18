import { Scene, Physics } from 'phaser';
import { Enemy } from './Enemy';
import { EnemyConfig } from './EnemyConfigs';
import { MainScene } from '../../scenes/MainScene';

export class RangedEnemy extends Enemy {
  // Pathfinding properties
  private shotsBlocked: boolean = false;
  private shotsBlockedTimer: number = 0;
  private shotsBlockedThreshold: number = 2000; // 2 seconds of blocked shots before moving
  private debugGraphics: Phaser.GameObjects.Graphics | null = null;

  constructor(scene: Scene, x: number, y: number, id: string, config: EnemyConfig) {
    super(scene, x, y, id, config);
  }


  protected isRangedEnemy(): this is RangedEnemy {
    return true;
  }

  protected canAttack(): boolean {
    return this.isInAttackRange();
  }

  protected performAttack(): void {
    if (!this.weapon || !this.player) return;
    
    
    // Use the weapon's fire method
    this.weapon.fireAtTarget(this, this.player);
  }
  
  private checkIfShotsBlocked(): void {
    if (!this.player || !this.weapon) return;
    
    // Get the walls layer from the scene
    const mainScene = this.scene as MainScene;
    const wallsLayer = mainScene.getWallsLayer();
    
    if (!wallsLayer) return;

    const enemyPos = new Phaser.Math.Vector2(this.x, this.y);
    const playerPos = new Phaser.Math.Vector2(this.player.x, this.player.y);

    // Example: A simple narrow trapezoid in front of the enemy toward the player
    const direction = playerPos.clone().subtract(enemyPos).normalize();
    const perp = direction.clone().rotate(Math.PI / 2).scale(32); // Width of the trapezoid
    
    // Start the trapezoid a bit in front of the enemy
    const startOffset = 16; // Start 16 pixels in front of the enemy
    const startPos = enemyPos.clone().add(direction.clone().scale(startOffset));
    
    // Calculate the four corners of the trapezoid
    const p1 = startPos.clone().add(perp); // Top left
    const p2 = startPos.clone().subtract(perp); // Bottom left
    const p3 = playerPos.clone().subtract(perp.scale(0.5)); // Bottom right (narrower at player end)
    const p4 = playerPos.clone().add(perp.scale(0.5)); // Top right (narrower at player end)
    
    // Create a polygon with the four points
    const polygon = new Phaser.Geom.Polygon([p1.x, p1.y, p2.x, p2.y, p3.x, p3.y, p4.x, p4.y]);
    let hasBlockingTiles = false;
    wallsLayer.forEachTile(tile => {
    if (tile.collides) {

      const tileWorldX = tile.getLeft(); // or tile.pixelX
      const tileWorldY = tile.getTop();  // or tile.pixelY
      const tileWidth = tile.width;
      const tileHeight = tile.height;

      const corners = {
        topLeft:     { x: tileWorldX,               y: tileWorldY },
        topRight:    { x: tileWorldX + tileWidth,   y: tileWorldY },
        bottomRight: { x: tileWorldX + tileWidth,   y: tileWorldY + tileHeight },
        bottomLeft:  { x: tileWorldX,               y: tileWorldY + tileHeight }
      };
      
      //const point = new Phaser.Geom.Point(tileCenterX, tileCenterY);
      
      if (Phaser.Geom.Polygon.Contains(polygon, corners.topLeft.x, corners.topLeft.y) ||
          Phaser.Geom.Polygon.Contains(polygon, corners.topRight.x, corners.topRight.y) ||
          Phaser.Geom.Polygon.Contains(polygon, corners.bottomRight.x, corners.bottomRight.y) ||
          Phaser.Geom.Polygon.Contains(polygon, corners.bottomLeft.x, corners.bottomLeft.y)) {
          hasBlockingTiles = true;
          
          // Draw a rectangle around the colliding tile
          const tileBounds = tile.getBounds() as Phaser.Geom.Rectangle;
          if (tileBounds && this.debugGraphics) {
            this.debugGraphics.strokeRect(tileBounds.x, tileBounds.y, tileBounds.width, tileBounds.height);
            this.debugGraphics.fillRect(tileBounds.x, tileBounds.y, tileBounds.width, tileBounds.height);
          }
          
          return;
        }
      }
    });
    
    
    // Only update the timer when the blocked state changes from unblocked to blocked
    if (hasBlockingTiles && !this.shotsBlocked) {
      this.shotsBlocked = true;
      this.shotsBlockedTimer = this.scene.time.now;
    } else if (!hasBlockingTiles) {
      this.shotsBlocked = false;
    }
  }
  

  // Keep the public fire method for backward compatibility
  public fire(): void {
    this.performAttack();
  }

  public die(): void {
    // Deactivate all bullets in the weapon
    if (this.weapon) {
      this.weapon.deactivateAllBullets();
    }
    
    super.die();
  }

  protected updateMovement(): void {

    // Check if shots are being blocked
    this.checkIfShotsBlocked();

    // Update path periodically
    this.pathUpdateTimer += this.scene.game.loop.delta;
    if (this.shotsBlocked && 
      this.scene.time.now - this.shotsBlockedTimer > this.shotsBlockedThreshold) {
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
    if (this.shotsBlocked && this.currentPath.length > 0) {
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
    // Only stop following path when shots are no longer blocked
    // This is the opposite of what we want - we want to keep following the path
    // until we find a position where shots are not blocked
    return this.shotsBlocked === false;
  }
  
  protected handleMovement(distance: number, angle: number, body: Phaser.Physics.Arcade.Body): void {
    // Ranged enemies try to maintain optimal shooting distance
    let minDistance = this.weapon?.minDistance || 100;
    let maxDistance = this.weapon?.maxDistance || 300;
    const optimalDistance = (minDistance + maxDistance) / 2;
    
    if (distance > maxDistance) {
      // Move towards player if too far
      body.setVelocity(
        Math.cos(angle) * this.moveSpeed,
        Math.sin(angle) * this.moveSpeed
      );
    } else if (distance < minDistance) {
      // Move away from player if too close
      body.setVelocity(
        Math.cos(angle + Math.PI) * this.moveSpeed,
        Math.sin(angle + Math.PI) * this.moveSpeed
      );
    } else {
      // If within range, try to maintain optimal distance
      const distanceDiff = distance - optimalDistance;
      if (Math.abs(distanceDiff) > 20) { // Only move if significantly off optimal distance
        const moveAngle = distanceDiff > 0 ? angle : angle + Math.PI;
        body.setVelocity(
          Math.cos(moveAngle) * this.moveSpeed * 0.5, // Slower movement when adjusting position
          Math.sin(moveAngle) * this.moveSpeed * 0.5
        );
      } else {
        // Stop if at good distance
        body.setVelocity(0, 0);
      }
    }
  }
} 