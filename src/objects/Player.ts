import { Scene, GameObjects, Physics, Types, Input } from 'phaser';
import { Bullet } from './Bullet';

// Extend Physics.Arcade.Sprite for physics and preUpdate
export class Player extends Physics.Arcade.Sprite {
  // Removed redundant body declaration, it's inherited

  private wasdKeys: {
    up: Input.Keyboard.Key;
    down: Input.Keyboard.Key;
    left: Input.Keyboard.Key;
    right: Input.Keyboard.Key;
  };
  private isTeleporting: boolean = false;
  public bullets: Physics.Arcade.Group;
  public lastFired: number = 0;
  public fireRate: number = 500; // Fire every 0.5 seconds
  
  // Health system
  private maxHealth: number = 100;
  private currentHealth: number = 100;
  private isInvulnerable: boolean = false;
  private invulnerabilityDuration: number = 1000; // 1 second of invulnerability after being hit
  
  // Targeting system
  private targetPoint: Phaser.GameObjects.Graphics;
  private targetX: number = 0;
  private targetY: number = 0;
  private isTargeting: boolean = false;
  private targetRadius: number = 30; // Radius of the target area

  constructor(scene: Scene, x: number, y: number) {
    super(scene, x, y, 'player-sprite'); // Use the sprite sheet

    // Create WASD keys
    if (scene.input && scene.input.keyboard) {
      this.wasdKeys = scene.input.keyboard.addKeys({
        up: 'W',
        down: 'S',
        left: 'A',
        right: 'D'
      }) as {
        up: Input.Keyboard.Key;
        down: Input.Keyboard.Key;
        left: Input.Keyboard.Key;
        right: Input.Keyboard.Key;
      };
    } else {
      throw new Error('Keyboard input not available');
    }

    // Set a larger display size for the sprite
    this.setScale(1);

    // Add to scene and enable physics
    scene.add.existing(this);
    scene.physics.world.enable(this); // Enable physics

    // Setup physics properties (cast body to Arcade.Body)
    (this.body as Physics.Arcade.Body).setCollideWorldBounds(true);
    
    // Initialize bullets group with custom appearance
    this.bullets = scene.physics.add.group({ 
      classType: Bullet, 
      maxSize: 30, 
      runChildUpdate: true,
      createCallback: (item: Phaser.GameObjects.GameObject) => {
        const bullet = item as Bullet;
        // Set the bullet texture and appearance
        bullet.setTexture('__WHITE'); // Use the default white texture
        bullet.setTint(0x00ffff); // Light blue tint for player bullets
        bullet.setDisplaySize(3, 6); // Make it a small circle
        bullet.setAlpha(1); // Ensure full opacity
        bullet.setDepth(1); // Ensure bullets are drawn above the background
      }
    });

    // Create animations
    this.createAnimations(scene);
    
    // Initialize targeting system
    this.targetPoint = scene.add.graphics();
    this.targetPoint.setDepth(10); // Ensure it's drawn above other elements
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
      frames: scene.anims.generateFrameNumbers('player-sprite', { start: 1, end: 6 }),
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

    // Track if the player is moving
    let isMoving = false;

    if (this.wasdKeys.left.isDown) {
      body.setVelocityX(-160);
      this.flipX = true; // Flip the sprite horizontally
      isMoving = true;
    } else if (this.wasdKeys.right.isDown) {
      body.setVelocityX(160);
      this.flipX = false; // Flip the sprite horizontally
      isMoving = true;
    } else if (this.wasdKeys.up.isDown) {
      body.setVelocityY(-160);
      isMoving = true;
    } else if (this.wasdKeys.down.isDown) {
      body.setVelocityY(160);
      isMoving = true;
    }
    
    // Play the appropriate animation based on movement
    if (isMoving) {
      this.anims.play('player-walk', true);
    } else {
      this.anims.play('player-idle', true);
    }
    
    // Handle targeting
    this.updateTargeting();
  }
  
  // Update the targeting system
  private updateTargeting(): void {
    // Clear previous target graphics
    this.targetPoint.clear();
    
    // If not targeting, don't show anything
    if (!this.isTargeting) {
      return;
    }
    
    // Draw target circle
    this.targetPoint.lineStyle(2, 0xff0000, 0.8);
    this.targetPoint.strokeCircle(this.targetX, this.targetY, this.targetRadius);
    
    // Draw crosshair
    this.targetPoint.lineStyle(1, 0xff0000, 0.8);
    this.targetPoint.moveTo(this.targetX - 10, this.targetY);
    this.targetPoint.lineTo(this.targetX + 10, this.targetY);
    this.targetPoint.moveTo(this.targetX, this.targetY - 10);
    this.targetPoint.lineTo(this.targetX, this.targetY + 10);
  }
  
  // Start targeting at a specific point
  public startTargeting(x: number, y: number): void {
    this.targetX = x;
    this.targetY = y;
    this.isTargeting = true;
  }
  
  // Stop targeting
  public stopTargeting(): void {
    this.isTargeting = false;
  }
  
  // Get the current target position
  public getTargetPosition(): { x: number, y: number } {
    return { x: this.targetX, y: this.targetY };
  }
  
  // Check if targeting is active
  public isCurrentlyTargeting(): boolean {
    return this.isTargeting;
  }

  // Method to fire a bullet
  public fire() {
    const bullet = this.bullets.get() as Bullet;
    if (bullet) {
      // Calculate the center position of the player
      // Add a small offset to make it look like it's coming from the center of the sprite
      const centerX = this.x;
      const centerY = this.y - 5; // Slight upward offset to make it look like it's coming from the center
      
      if (this.isTargeting) {
        // Fire at the target point
        const angle = Phaser.Math.Angle.Between(centerX, centerY, this.targetX, this.targetY);
        bullet.fire(centerX, centerY, angle);
      } else {
        // Default firing direction based on player's facing direction
        let angle = 0;
        
        if (this.flipX) {
          angle = Math.PI; // Left
        } else {
          angle = 0; // Right
        }
        
        bullet.fire(centerX, centerY, angle);
      }
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

  // Method to take damage
  public takeDamage(amount: number = 10): void {
    // If invulnerable, don't take damage
    if (this.isInvulnerable) {
      return;
    }
    
    // Reduce health
    this.currentHealth = Math.max(0, this.currentHealth - amount);
    
    // Make player invulnerable for a short time
    this.isInvulnerable = true;
    
    // Visual feedback - flash the player
    this.setTint(0xff0000);
    
    // Reset tint and invulnerability after delay
    this.scene.time.delayedCall(this.invulnerabilityDuration, () => {
      this.clearTint();
      this.isInvulnerable = false;
    });
    console.log(this.currentHealth);
    // Check if player is dead
    if (this.currentHealth <= 0) {
      this.die();
    }
  }
  
  // Method to heal the player
  public heal(amount: number = 10): void {
    this.currentHealth = Math.min(this.maxHealth, this.currentHealth + amount);
  }
  
  // Method to handle player death
  private die(): void {
    // Disable player controls
    this.setActive(false);
    this.setVisible(false);
    
    // Emit an event that the scene can listen for
    this.scene.events.emit('playerDied');
  }
  
  // Method to check if player is dead
  public isDead(): boolean {
    return this.currentHealth <= 0;
  }
  
  // Method to get current health
  public getHealth(): number {
    return this.currentHealth;
  }
  
  // Method to get max health
  public getMaxHealth(): number {
    return this.maxHealth;
  }
  
  // Method to check if player is invulnerable
  public isCurrentlyInvulnerable(): boolean {
    return this.isInvulnerable;
  }
}