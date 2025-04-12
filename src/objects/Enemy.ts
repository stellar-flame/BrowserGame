import { Scene, Physics, GameObjects } from 'phaser';
import { Bullet } from './Bullet';
import { HealthBar } from './HealthBar';

// Extend Physics.Arcade.Sprite for physics and preUpdate/update capabilities
export class Enemy extends Physics.Arcade.Sprite {
  id: string; // Store the unique ID
  public bullets: Physics.Arcade.Group;
  protected lastFired: number = 0;
  protected fireRate: number = 2000; // Fire every 2 seconds
  
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

  constructor(scene: Scene, x: number, y: number, id: string) {
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
    
    // Initialize bullets group using the protected method
    this.bullets = this.createBulletGroup(scene);

    // Create health bar
    this.healthBar = new HealthBar(scene, this, 15 , 2, false);
    this.healthBar.setHealth(this.health, 3);
  }
  
  // Protected method to create the bullet group - can be overridden by subclasses
  protected createBulletGroup(scene: Scene): Physics.Arcade.Group {
    return scene.physics.add.group({ 
      classType: Bullet, 
      maxSize: 10 
    });
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
  
  
  protected canFire() {
    const distance = Phaser.Math.Distance.Between(this.x, this.y, this.playerX, this.playerY);
    return distance > this.minDistance && distance < this.maxDistance;
  }
  
  // Method to fire a bullet
  protected fire() {
    const bullet = this.bullets.get() as Bullet;
    if (bullet) {
      // Calculate angle to player
      const angle = Phaser.Math.Angle.Between(this.x, this.y, this.playerX, this.playerY);
      
      // Fire the bullet at the player
      bullet.fire(this.x, this.y, angle);
      
      // Visual feedback - flash when firing
      this.setTint(0x00ff00);
      this.scene.time.delayedCall(100, () => {
        this.clearTint();
      });
    }
  }
  
  // Method to update player position
  public updatePlayerPosition(x: number, y: number) {
    this.playerX = x;
    this.playerY = y;
  }
  
  // Method to take damage
  public takeDamage(amount: number): void {
    if (this.isDead) return;
    
    this.health = Math.max(0, this.health - amount);
    this.healthBar.setHealth(this.health, 3);
    
    // Visual feedback - flash red
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
    // Deactivate all bullets
    if (this.bullets) {
      this.bullets.getChildren().forEach((bullet) => {
        (bullet as Bullet).deactivate();
      });
    }
    
    // Destroy the health bar if it exists
    if (this.healthBar) {
      this.healthBar.destroy();
    }
    
    // Destroy the enemy sprite
    this.destroy();
  }

  public isEnemyDead(): boolean {
    return this.health <= 0;
  }

  // Update method to keep health bar positioned above the enemy
  public update(): void {
    // Update health bar position
    if (this.healthBar) {
      this.healthBar.update();
    }
    
    // Check if we can fire at the player
    const currentTime = this.scene.time.now;
    if (this.canFire() && currentTime - this.lastFired > this.fireRate) {
      this.fire();
      this.lastFired = currentTime;
    }
  }
}
