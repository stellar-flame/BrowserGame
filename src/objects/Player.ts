import { Scene, GameObjects, Physics, Types } from 'phaser';

// Extend Physics.Arcade.Sprite for physics and preUpdate
export class Player extends Physics.Arcade.Sprite {
  // Removed redundant body declaration, it's inherited

  private currentCursors: Types.Input.Keyboard.CursorKeys;
  private isTeleporting: boolean = false;

  constructor(scene: Scene, x: number, y: number, cursors: Types.Input.Keyboard.CursorKeys) {
    super(scene, x, y, 'player-sprite'); // Use the sprite sheet

    this.currentCursors = cursors;

    // Set a larger display size for the sprite
    this.setScale(1.5);

    // Add to scene and enable physics
    scene.add.existing(this);
    scene.physics.world.enable(this); // Enable physics

    // Setup physics properties (cast body to Arcade.Body)
    (this.body as Physics.Arcade.Body).setCollideWorldBounds(true);

    // Create animations
    this.createAnimations(scene);
  }

  private createAnimations(scene: Scene) {
    scene.anims.create({
      key: 'walk-left',
      frames: scene.anims.generateFrameNumbers('player-sprite', { start: 0, end: 7 }),
      frameRate: 10,
      repeat: -1
    });

    scene.anims.create({
      key: 'walk-right',
      frames: scene.anims.generateFrameNumbers('player-sprite', { start: 0, end: 7 }),
      frameRate: 10,
      repeat: -1
    });

    scene.anims.create({
      key: 'walk-up',
      frames: scene.anims.generateFrameNumbers('player-sprite', { start: 0, end: 7 }),
      frameRate: 10,
      repeat: -1
    });

    scene.anims.create({
      key: 'walk-down',
      frames: scene.anims.generateFrameNumbers('player-sprite', { start: 0, end: 7 }),
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
      this.anims.play('walk-left', true);
      this.flipX = true; // Flip the sprite horizontally
    } else if (this.currentCursors.right.isDown) {
      body.setVelocityX(160);
      this.anims.play('walk-right', true);
      this.flipX = false; // Flip the sprite horizontally
    } else if (this.currentCursors.up.isDown) {
      body.setVelocityY(-160);
      this.anims.play('walk-up', true);
    } else if (this.currentCursors.down.isDown) {
      body.setVelocityY(160);
      this.anims.play('walk-down', true);
    } else {
      this.anims.stop();
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