import { Scene, GameObjects, Physics, Types } from 'phaser';
import { Bullet } from './Bullet';

// Extend Physics.Arcade.Sprite for physics and preUpdate
export class Player extends Physics.Arcade.Sprite {
  // Removed redundant body declaration, it's inherited

  private currentCursors: Types.Input.Keyboard.CursorKeys;
  private isTeleporting: boolean = false;
  public bullets: Physics.Arcade.Group;
  private lastFired: number = 0;
  private fireRate: number = 500; // Fire every 0.5 seconds

  constructor(scene: Scene, x: number, y: number, cursors: Types.Input.Keyboard.CursorKeys) {
    super(scene, x, y, 'player-sprite'); // Use the sprite sheet

    this.currentCursors = cursors;

    // Set a larger display size for the sprite
    this.setScale(2);

    // Add to scene and enable physics
    scene.add.existing(this);
    scene.physics.world.enable(this); // Enable physics

    // Setup physics properties (cast body to Arcade.Body)
    (this.body as Physics.Arcade.Body).setCollideWorldBounds(true);
    
    // Initialize bullets group
    this.bullets = scene.physics.add.group({ classType: Bullet, maxSize: 30, runChildUpdate: true });

    // Create animations
    this.createAnimations(scene);
  }

  private createAnimations(scene: Scene) {
    scene.anims.create({
      key: 'player-idle',
      frames: scene.anims.generateFrameNumbers('player-sprite', { start: 0, end: 0 }),
      frameRate: 10,
      repeat: -1
    });

    scene.anims.create({
      key: 'player-walk',
      frames: scene.anims.generateFrameNumbers('player-sprite', { start: 1, end: 4 }),
      frameRate: 10,
      repeat: -1
    });
  }

  // Pre-update is valid for Sprites
  preUpdate(time: number, delta: number) {
    super.preUpdate(time, delta);
    
    // Skip movement if teleporting
    if (this.isTeleporting) {
      return;
    }

    // Cast body to Arcade.Body to access physics methods
    const body = this.body as Physics.Arcade.Body;

    body.setVelocity(0);

    if (this.currentCursors.left.isDown) {
      body.setVelocityX(-160);
      this.anims.play('player-walk', true);
      this.flipX = true; // Flip the sprite horizontally
    } else if (this.currentCursors.right.isDown) {
      body.setVelocityX(160);
      this.anims.play('player-walk', true);
      this.flipX = false; // Flip the sprite horizontally
    } else if (this.currentCursors.up.isDown) {
      body.setVelocityY(-160);
      this.anims.play('player-walk', true);
    } else if (this.currentCursors.down.isDown) {
      body.setVelocityY(160);
      this.anims.play('player-walk', true);
    } else {
      this.anims.play('player-idle', true);
      this.anims.stop();
    }
    
    // Check for firing
    if (this.currentCursors.space.isDown && time - this.lastFired > this.fireRate) {
      this.fire();
      this.lastFired = time;
    }
  }

  // Method to fire a bullet
  private fire() {
    const bullet = this.bullets.get() as Bullet;
    if (bullet) {
      // Determine firing direction based on player's facing direction
      let angle = 0;
      
      if (this.flipX) {
        angle = Math.PI; // Left
      } else if (this.anims.currentAnim?.key === 'walk-up') {
        angle = -Math.PI / 2; // Up
      } else if (this.anims.currentAnim?.key === 'walk-down') {
        angle = Math.PI / 2; // Down
      }
      
      bullet.fire(this.x, this.y, angle);
    }
  }

  public teleport(x: number, y: number) {
    const body = this.body as Physics.Arcade.Body;
    body.stop(); // Stop any velocity
    body.reset(x, y); // Reset body AND display position
    
    
    // Set teleporting flag
    this.isTeleporting = true;
    
    // Reset teleporting flag after delay
    this.scene.time.delayedCall(1000, () => {
      this.isTeleporting = false;
    });
  }
  
  public isCurrentlyTeleporting(): boolean {
    return this.isTeleporting;
  }
}