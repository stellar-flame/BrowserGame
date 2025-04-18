import { Scene } from 'phaser';

export class Barrel extends Phaser.Physics.Arcade.Sprite {
  private isDestroyed: boolean = false;
  private isSmashed: boolean = false;
  private smashedFrame: number = 0;
  private isHovered: boolean = false;
  private originalTint: number = 0xffffff;
  private hoverTint: number = 0xffff00; // Yellow tint when hovered
  private spawnPotion: boolean = false;

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
    // this.setSize(32, 32);

    // Set depth to ensure barrels are drawn below the Player and enemies
    this.setDepth(0.1);
    
    // Set up interactive properties
    this.setInteractive();
    
    // Add hover effects
    this.on('pointerover', this.onMouseOver, this);
    this.on('pointerout', this.onMouseOut, this);
  }
  
  // Method to handle mouse over event
  private onMouseOver(): void {
    if (!this.isSmashed && !this.isDestroyed) {
      this.isHovered = true;
      this.setTint(this.hoverTint);
      
      // Add a subtle scale effect
      this.scene.tweens.add({
        targets: this,
        scaleX: 1.1,
        scaleY: 1.1,
        duration: 100,
        ease: 'Power2'
      });

      this.scene.time.delayedCall(100, () => {
        const scene = this.scene as any;
        const player = scene.getPlayer();
        if (player) {
          player.shootAtTarget(this.x, this.y);
        }
      });
    }
  }
  
  // Method to handle mouse out event
  private onMouseOut(): void {
    if (!this.isSmashed && !this.isDestroyed) {
      this.isHovered = false;
      this.clearTint();
      
      // Reset scale
      this.scene.tweens.add({
        targets: this,
        scaleX: 1,
        scaleY: 1,
        duration: 100,
        ease: 'Power2'
      });
    }
  }
  
  // Method to smash the barrel
  public smash(): void {
    console.log('smash barrel');
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
        
        // Disable interactive properties
        this.disableInteractive();
        // Disable active state to prevent further interactions
        this.setActive(false); 
        
      // Emit the smashed event with the barrel's position and reference
     this.scene.events.emit(Barrel.SMASHED_EVENT, {
        x: this.x,
        y: this.y,
        barrel: this,
        spawnPotion: this.spawnPotion
      });

    }
  }

  public addPotion(): void {    
    this.spawnPotion = true;
  }

  // Method to check if barrel is destroyed
  public isBarrelDestroyed(): boolean {
    return this.isDestroyed;
  }
  
  // Method to check if barrel is smashed
  public isBarrelSmashed(): boolean {
    return this.isSmashed;
  }
  
  // Method to check if barrel is being hovered
  public isBarrelHovered(): boolean {
    return this.isHovered;
  }
  
  // Override destroy method to set flag
  public destroy(fromScene?: boolean): void {
    this.isDestroyed = true;
    super.destroy(fromScene);
  }
} 