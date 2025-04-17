import { Scene, GameObjects, Physics, Types, Input } from 'phaser';
import { Bullet } from '../weapons/Bullet'; 
import { HealthBar } from '../HealthBar';
import { Potion } from '../items/Potion';
import { Weapon } from '../weapons/Weapon';
import { WeaponFactory } from '../weapons/WeaponFactory';

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
  public weapon: Weapon;
  public lastFired: number = 0;
  public fireRate: number = 500; // Fire every 0.5 seconds
  
  // Health system
  private maxHealth: number = 50 ;
  private currentHealth: number = 50  ;
  private isInvulnerable: boolean = false;
  private invulnerabilityDuration: number = 1000; // 1 second of invulnerability after being hit
  
  // Auto-targeting system
  private targetCircle: GameObjects.Graphics;
  private targetRadius: number = 20;

  private healthBar: HealthBar;

  constructor(scene: Scene, x: number, y: number) {
    super(scene, x, y, 'player-sprite'); // Use the sprite sheet

    // Add to scene's display list and update list
    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.setDepth(1);
    // Set up physics body
    const body = this.body as Physics.Arcade.Body;
    body.setCollideWorldBounds(true);
    body.setBounce(0);
    body.setDrag(300);
    body.setMaxVelocity(200, 200);

    // Set up input
    this.wasdKeys = (scene.input as Input.InputPlugin).keyboard!.addKeys({
      up: Input.Keyboard.KeyCodes.W,
      down: Input.Keyboard.KeyCodes.S,
      left: Input.Keyboard.KeyCodes.A,
      right: Input.Keyboard.KeyCodes.D,
    }) as {
      up: Input.Keyboard.Key;
      down: Input.Keyboard.Key;
      left: Input.Keyboard.Key;
      right: Input.Keyboard.Key;
    };

    // Initialize weapon with LEVEL_1_GUN configuration
    this.weapon = WeaponFactory.createWeapon(scene, 'LEVEL_1_GUN');
    console.log(this.weapon);
    // Create animations
    this.createAnimations(scene);

    // Create target circle
    this.targetCircle = scene.add.graphics();
    this.targetCircle.setDepth(10); // Ensure it's drawn above other elements

    // Initialize health bar
    this.healthBar = new HealthBar(scene, this, 150, 10, true);
    this.healthBar.setHealth(this.currentHealth, this.maxHealth);

    this.scene.events.on(Potion.COLLECTED_EVENT, (data: {x: number, y: number, healAmount: number}) => {
      this.heal(data.healAmount) 
    });
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
      frameRate: 5,
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
    
    // Visual healing effect
    this.showHealEffect(amount);
  }
  
  // Show a visual healing effect
  private showHealEffect(amount: number): void {
    // Flash green tint
    this.setTint(0x00ff00);
    this.scene.time.delayedCall(200, () => {
      this.clearTint();
    });
    
    // Create healing particles
    const particles = this.scene.add.particles(0, 0, 'particle', {
      x: this.x,
      y: this.y,
      speed: { min: 20, max: 50 },
      scale: { start: 0.5, end: 0 },
      lifespan: 800,
      quantity: 10,
      tint: 0x00ff00,
      alpha: { start: 0.8, end: 0 },
      blendMode: 'ADD',
      gravityY: -50
    });
    
    // Emit particles for a short duration
    particles.explode(20, this.x, this.y);
    
    // Create healing text
    const healText = this.scene.add.text(this.x, this.y - 20, `+${amount}`, {
      fontSize: '16px',
      color: '#00ff00',
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: 3
    });
    
    // Animate the text
    this.scene.tweens.add({
      targets: healText,
      y: this.y - 40,
      alpha: 0,
      duration: 1000,
      ease: 'Power2',
      onComplete: () => {
        healText.destroy();
        particles.destroy();
      }
    });
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

  public shootAtTarget(x: number, y: number) {
    // Check fire rate before firing
    const currentTime = this.scene.time.now;
    if (currentTime - this.lastFired > this.fireRate) {
      // Calculate angle to target
      const angle = Phaser.Math.Angle.Between(this.x, this.y, x, y);
      
      // Get a bullet from the weapon's bullet group
      if (this.weapon.bullets) {
        const bullet = this.weapon.bullets.get() as Bullet;
        if (bullet) {
          // Calculate the center position of the player
          const centerX = this.x;
          const centerY = this.y - 5; // Slight upward offset
          
          // Fire in the direction of the target
          bullet.fire(centerX, centerY, angle);
        }
      }
      
      this.lastFired = currentTime;
    }
  }

  public destroy(): void {
    this.healthBar.destroy();
    this.targetCircle.destroy();
    // Deactivate all bullets when player is destroyed
    if (this.weapon) {
      this.weapon.deactivateAllBullets();
    }
    super.destroy();
  }

  private handleAutoTargeting(): void {
    // Get mouse position
    const mouseX = this.scene.input.activePointer.worldX;
    const mouseY = this.scene.input.activePointer.worldY;
    
    // Get all enemies in the scene
    const targetableObjects = (this.scene as any).anyEnemiesInRoom();
    if (!targetableObjects) {
      // No enemies, don't fire
      return;
    }

    // Calculate angle to mouse position
    this.weapon.fireInDirection(this, mouseX, mouseY);
    
  }
  
}