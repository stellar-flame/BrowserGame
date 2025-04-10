import { Scene, Physics } from 'phaser';
import { Enemy } from './Enemy';

export class RangedEnemy extends Enemy {
  // Static flag to track if animations have been created
  private static animationsCreated: boolean = false;
  
  constructor(scene: Scene, x: number, y: number, id: string) {
    super(scene, x, y, id);
    this.setTexture('ranged-enemy-sprite'); // Use a specific sprite for this enemy type
    this.setScale(2);
    
    // Ranged enemies have a shorter fire rate
    this.fireRate = 1500; // Fire every 1.5 seconds
    
    // Ranged enemies prefer to keep more distance
    this.minDistance = 200; // Increased minimum distance
    this.maxDistance = 400; // Increased maximum distance
    this.moveSpeed = 80; // Slightly slower movement
    
    // Initialize animations after the object is fully constructed
    this.initializeAnimations();
  }

  preUpdate(time: number, delta: number) {
    super.preUpdate(time, delta);
    if (!this.body) return;
    
    // Play the walk animation
    this.play('ranged-walk', true);
    
    // Flip the sprite based on movement direction
    if (this.body.velocity.x < 0) {
      this.flipX = true;
    } else if (this.body.velocity.x > 0) {
      this.flipX = false;
    }
  }

  // Override the updateShootingCapability method to customize shooting behavior
  protected canFire() {
    const distance = Phaser.Math.Distance.Between(this.x, this.y, this.playerX, this.playerY);
    // Ranged enemies can shoot from further away
    return distance > this.minDistance && distance < this.maxDistance * 1.2;
  }
  
  // Override the createAnimations method to create ranged enemy animations
  protected createAnimations(scene: Scene): void {
    // Only create animations once for all instances of this class
    if (RangedEnemy.animationsCreated) return;
    
    // Create a single animation for ranged enemies
    if (!scene.anims.exists('ranged-walk')) {
      scene.anims.create({
        key: 'ranged-walk',
        frames: scene.anims.generateFrameNumbers('ranged-enemy-sprite', { start: 0, end: 7 }),
        frameRate: 10,
        repeat: -1
      });
    }
    
    // Mark animations as created
    RangedEnemy.animationsCreated = true;
  }
} 