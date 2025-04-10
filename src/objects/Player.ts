import { Scene, GameObjects, Physics, Types } from 'phaser';

// Extend Physics.Arcade.Sprite for physics and preUpdate
export class Player extends Physics.Arcade.Sprite {
  // Removed redundant body declaration, it's inherited

  private currentCursors: Types.Input.Keyboard.CursorKeys;
  private isTeleporting: boolean = false;

  constructor(scene: Scene, x: number, y: number, cursors: Types.Input.Keyboard.CursorKeys) {
    // Call Sprite constructor (use __WHITE texture key for tinting)
    super(scene, x, y, '__WHITE');

    this.currentCursors = cursors;

    // Add to scene and enable physics
    scene.add.existing(this);
    scene.physics.world.enable(this); // Enable physics

    // Make it look like the old rectangle
    this.setDisplaySize(32, 32);
    this.setTint(0x00ff00); // Green tint
    this.setOrigin(0.5, 0.5); // Center the origin like a Rectangle

    // Setup physics properties (cast body to Arcade.Body)
    (this.body as Physics.Arcade.Body).setCollideWorldBounds(false);
  }

  // Pre-update is valid for Sprites
  preUpdate(time: number, delta: number) {
    super.preUpdate(time, delta);
    
    // Skip movement if teleporting
    if (this.isTeleporting) {
      console.log('Player is teleporting, movement disabled', this.body?.x, this.body?.y);
      return;
    }

    // Cast body to Arcade.Body to access physics methods
    const body = this.body as Physics.Arcade.Body;

    body.setVelocity(0);

    if (this.currentCursors.left.isDown) {
      body.setVelocityX(-160);
    } else if (this.currentCursors.right.isDown) {
      body.setVelocityX(160);
    }

    if (this.currentCursors.up.isDown) {
      body.setVelocityY(-160);
    } else if (this.currentCursors.down.isDown) {
      body.setVelocityY(160);
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