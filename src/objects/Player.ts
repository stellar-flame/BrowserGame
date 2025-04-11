import { Scene, GameObjects, Physics, Types, Input } from 'phaser';
import { Bullet } from './Bullet';
import { HealthBar } from './HealthBar';

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
  
  // Auto-targeting system
  private targetX: number = 0;
  private targetY: number = 0;
  private isTargeting: boolean = false;
  private targetCircle: GameObjects.Graphics;
  private targetRadius: number = 20;

  private healthBar: HealthBar;

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
        bullet.setTint(0xff0000); // Red tint for player bullets
        bullet.setDisplaySize(6, 6); // Make it a small circle
        bullet.setAlpha(1); // Ensure full opacity
        bullet.setDepth(1); // Ensure bullets are drawn above the background
      }
    });

    // Create animations
    this.createAnimations(scene);

    // Create target circle
    this.targetCircle = scene.add.graphics();
    this.targetCircle.setDepth(10); // Ensure it's drawn above other elements

    // Initialize health bar
    this.healthBar = new HealthBar(scene, this, 150, 10, true);
    this.healthBar.setHealth(this.currentHealth, this.maxHealth);
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
      frames: scene.anims.generateFrameNumbers('player-sprite', { start: 1, end: 2 }),
      frameRate: 15,
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
    
    // Update target circle position
    this.updateTargetCircle();
    
    // Handle auto-targeting
    this.handleAutoTargeting();
  }
  
  // Update the target circle position
  private updateTargetCircle(): void {
    // Clear previous target graphics
    this.targetCircle.clear();
    
    // Get mouse position in world coordinates
    const mouseX = this.scene.input.activePointer.worldX;
    const mouseY = this.scene.input.activePointer.worldY;
    
    // Draw target circle
    this.targetCircle.lineStyle(2, 0xff0000, 0.8);
    this.targetCircle.strokeCircle(mouseX, mouseY, this.targetRadius);
    
    // Draw crosshair
    this.targetCircle.lineStyle(1, 0xff0000, 0.8);
    this.targetCircle.moveTo(mouseX - 10, mouseY);
    this.targetCircle.lineTo(mouseX + 10, mouseY);
    this.targetCircle.moveTo(mouseX, mouseY - 10);
    this.targetCircle.lineTo(mouseX, mouseY + 10);
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
    if (this.isInvulnerable) return;
    
    this.currentHealth = Math.max(0, this.currentHealth - amount);
    this.healthBar.setHealth(this.currentHealth, this.maxHealth);
    
    // Visual feedback - flash red
    this.setTint(0xff0000);
    this.scene.time.delayedCall(100, () => {
      this.clearTint();
    });
    
    // Set invulnerability
    this.isInvulnerable = true;
    this.scene.time.delayedCall(this.invulnerabilityDuration, () => {
      this.isInvulnerable = false;
    });
    
    // Check if player is dead
    if (this.currentHealth <= 0) {
      this.die();
    }
  }
  
  // Method to heal the player
  public heal(amount: number = 10): void {
    this.currentHealth = Math.min(this.maxHealth, this.currentHealth + amount);
    this.healthBar.setHealth(this.currentHealth, this.maxHealth);
  }
  
  // Method to handle player death
  private die(): void {
    // Disable player controls
    this.setActive(false);
    this.setVisible(false);
    
    // Hide health bar
    this.healthBar.setVisible(false);
    
    // Hide target circle
    this.targetCircle.setVisible(false);
    
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

  public destroy(): void {
    this.healthBar.destroy();
    this.targetCircle.destroy();
    super.destroy();
  }

  private handleAutoTargeting(): void {
    // Get all enemies in the scene
    // The enemies group is a property of the scene, not a named child
    const enemies = (this.scene as any).enemies;
    if (!enemies) {
      console.log('No enemies group found in scene');
      return;
    }
    
    // Check if mouse is over any enemy
    const mouseX = this.scene.input.activePointer.worldX;
    const mouseY = this.scene.input.activePointer.worldY;
    
    let isOverEnemy = false;
    let targetEnemy: any = null;
    
    // Check if mouse is over any enemy
    enemies.getChildren().forEach((enemy: any) => {
      if (enemy.active && this.isPointerOverSprite(mouseX, mouseY, enemy)) {
        isOverEnemy = true;
        targetEnemy = enemy;
      }
    });
    
    // If over an enemy, target and shoot
    if (isOverEnemy && targetEnemy) {
      // Target the enemy under the cursor
      this.targetX = targetEnemy.x;
      this.targetY = targetEnemy.y;
      this.isTargeting = true;
      
      // Check fire rate before firing
      const currentTime = this.scene.time.now;
      if (currentTime - this.lastFired > this.fireRate) {
        this.fire();
        this.lastFired = currentTime;
      }
    } else {
      // If not over an enemy, stop targeting
      this.isTargeting = false;
    }
  }
  
  private isPointerOverSprite(pointerX: number, pointerY: number, sprite: Phaser.GameObjects.Sprite): boolean {
    const bounds = sprite.getBounds();
    console.log('Pointer X:', pointerX, 'Pointer Y:', pointerY);
    return (
      pointerX >= bounds.x &&
      pointerX <= bounds.x + bounds.width &&
      pointerY >= bounds.y &&
      pointerY <= bounds.y + bounds.height
    );
  }
}