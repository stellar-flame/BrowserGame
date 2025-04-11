import { Scene, Physics } from 'phaser';
import { Bullet } from './Bullet';

// Extend Physics.Arcade.Sprite for physics and preUpdate/update capabilities
export class Enemy extends Physics.Arcade.Sprite {
  // Removed redundant body declaration, it's inherited
  id: string; // Store the unique ID
  public bullets: Physics.Arcade.Group;
  protected lastFired: number = 0;
  protected fireRate: number = 2000; // Fire every 2 seconds
  protected canShoot: boolean = false;
  
  // Movement properties
  protected minDistance: number = 150;
  protected maxDistance: number = 350;
  protected moveSpeed: number = 100;
  protected playerX: number = 0;
  protected playerY: number = 0;

  constructor(scene: Scene, x: number, y: number, id: string) {
    // Call Sprite constructor (use __WHITE texture key for tinting)
    super(scene, x, y, '__WHITE');

    this.id = id; // Assign the ID

    // Add to scene and enable physics
    scene.add.existing(this);
    scene.physics.world.enable(this); // Enable physics

    // Setup physics properties
    (this.body as Physics.Arcade.Body).setCollideWorldBounds(true);
    (this.body as Physics.Arcade.Body).setImmovable(false); // Enemies should be movable
    (this.body as Physics.Arcade.Body).setBounce(0); // No bounce
    (this.body as Physics.Arcade.Body).setSize(16, 16); // Match player's hitbox size
    (this.body as Physics.Arcade.Body).setOffset(8, 8); // Center the hitbox
    
    // Initialize bullets group
    this.bullets = scene.physics.add.group({ classType: Bullet, maxSize: 10 });
  }
  
  // Method to initialize animations - call this after the constructor
  public initializeAnimations(): void {
    this.createAnimations(this.scene);
  }
  
  // Protected method to be overridden by subclasses
  protected createAnimations(scene: Scene): void {
    // Base implementation does nothing
    // Subclasses should override this method to create their specific animations
  }

  // Update method to handle movement and shooting logic
  preUpdate(time: number, delta: number) {
    super.preUpdate(time, delta);
    
    // Handle movement
    this.updateMovement();
    
    // Check if it's time to fire
    if (this.canFire() && time - this.lastFired > this.fireRate) {
      this.fire();
      this.lastFired = time;
    }
  }

  // Method to update movement based on distance to player
  protected updateMovement() {
    const enemyBody = this.body as Physics.Arcade.Body;
    if (!enemyBody) return;
    
    const distance = Phaser.Math.Distance.Between(this.x, this.y, this.playerX, this.playerY);
    const angleToPlayer = Phaser.Math.Angle.Between(this.x, this.y, this.playerX, this.playerY);
    
    // Calculate velocities
    let vx = 0;
    let vy = 0;
    
    if (distance < this.minDistance) {
      vx = -Math.cos(angleToPlayer) * this.moveSpeed;
      vy = -Math.sin(angleToPlayer) * this.moveSpeed;
    } else if (distance > this.maxDistance) {
      vx = Math.cos(angleToPlayer) * this.moveSpeed;
      vy = Math.sin(angleToPlayer) * this.moveSpeed;
    }
    
    // Set velocity directly instead of using setVelocity
    enemyBody.setVelocity(vx, vy);
  }
  
  // Helper method to check if enemy is near a wall
  private isNearWall(): boolean {
    const wallDistance = 16; // Distance to check for walls
    
    // Get the tilemap layer from the scene
    const wallsLayer = (this.scene as any).wallsLayer;
    if (!wallsLayer) return false;
    
    // Convert world position to tile position
    const tileX = Math.floor(this.x / 32);
    const tileY = Math.floor(this.y / 32);
    
    // Check surrounding tiles for walls
    for (let x = -1; x <= 1; x++) {
      for (let y = -1; y <= 1; y++) {
        if (x === 0 && y === 0) continue; // Skip center tile
        
        const checkX = tileX + x;
        const checkY = tileY + y;
        
        // Check if the tile exists and is a wall
        if (wallsLayer.hasTileAt(checkX, checkY)) {
          // Calculate distance to wall tile
          const wallCenterX = (checkX * 32) + 16;
          const wallCenterY = (checkY * 32) + 16;
          const distance = Phaser.Math.Distance.Between(this.x, this.y, wallCenterX, wallCenterY);
          
          if (distance < wallDistance) {
            return true;
          }
        }
      }
    }
    
    return false;
  }
  
  protected canFire() {
    const distance = Phaser.Math.Distance.Between(this.x, this.y, this.playerX, this.playerY);
    return distance > this.minDistance && distance < this.maxDistance;
  }
  
  // Method to fire a bullet
  protected fire() {
    const bullet = this.bullets.get() as Bullet;
    if (bullet) {
      const angle = Phaser.Math.Angle.Between(this.x, this.y, this.playerX, this.playerY);
      bullet.fire(this.x, this.y, angle);
    }
  }
  
  
  // Method to update player position
  public updatePlayerPosition(x: number, y: number) {
    this.playerX = x;
    this.playerY = y;
  }
  

  // Example method (not used yet, but shows potential)
  public takeDamage() {
    // Logic for when the enemy is hit
    console.log(`Enemy ${this.id} took damage`);
  }
}
