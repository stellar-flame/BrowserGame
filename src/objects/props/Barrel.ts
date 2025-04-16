import { Scene } from 'phaser';

export class Barrel extends Phaser.Physics.Arcade.Sprite {
  private isDestroyed: boolean = false;
  private isSmashed: boolean = false;
  private smashedFrame: number = 0;

  public static readonly SMASHED_EVENT = 'barrel-smashed';

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
        this.body.setBounce(0);
        
        // Enable collision with bullets
        this.body.immovable = true;
      }
    }
    
    // Set depth to ensure barrels are drawn below the Player and enemies
    this.setDepth(0.1);
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
      
      // Disable physics and collisions
      if (this.body) {
        this.body.enable = false;
        this.body.immovable = false;
      }
      
      // Emit the smashed event with the barrel's position and reference
      this.scene.events.emit(Barrel.SMASHED_EVENT, {
        x: this.x,
        y: this.y,
        barrel: this
      });
      
      // Disable active state to prevent further interactions
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