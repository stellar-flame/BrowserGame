import { Scene } from 'phaser';

export class Barrel extends Phaser.Physics.Arcade.Sprite {
  private isDestroyed: boolean = false;
  private isSmashed: boolean = false;
  private smashedFrame: number = 0;

  constructor(scene: Scene, x: number, y: number) {
    super(scene, x, y, 'barrel');
    
    // Add to scene
    scene.add.existing(this);
    
    // Enable physics
    scene.physics.add.existing(this);
    
    // Set up physics body
    if (this.body) {
      this.body.immovable = true;
      if (this.body instanceof Phaser.Physics.Arcade.Body) {
        this.body.setSize(32, 32); // Adjust size as needed
        
        // Set basic physics properties
        this.body.setCollideWorldBounds(true);
        this.body.setBounce(0);
        
        // Enable collision with bullets
        this.body.setCollideWorldBounds(true);
        this.body.setImmovable(true);
        
        // Set collision category and mask
        this.body.collisionCategory = 1; // Category 1 for barrels
        this.body.collisionMask = 3;     // Collide with categories 0 and 1 (walls and bullets)
      }
    }
    
    // Set depth to ensure barrels are drawn above the floor but below other elements
    this.setDepth(0.5);
    
    // Log for debugging
    console.log(`Barrel created at (${x}, ${y}) with physics body:`, this.body);
  }
  
  
  // Method to smash the barrel
  public smash(): void {
    if (!this.isSmashed && this.body) {
      this.isSmashed = true;
      
      // Visual feedback when damaged
      this.scene.tweens.add({
        targets: this,
        alpha: 0.7,
        duration: 100,
        yoyo: true
      });

      // Randomly choose a frame from the smashed-barrel texture (0, 1, or 2)
      this.smashedFrame = Phaser.Math.Between(0, 2);
      this.setTexture('smashed-barrel', this.smashedFrame);
      
      this.body.immovable = false;
      this.setActive(false);
    }
  }
  
  // Method to check if barrel is destroyed
  public isBarrelDestroyed(): boolean {
    return this.isDestroyed;
  }
  
  // Method to check if barrel is smashed
  public isBarrelSmashed(): boolean {
    return this.isSmashed;
  }
  
  // Override destroy method to set flag
  public destroy(fromScene?: boolean): void {
    this.isDestroyed = true;
    super.destroy(fromScene);
  }
} 