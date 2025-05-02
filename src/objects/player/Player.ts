import { Scene, GameObjects, Physics, Types, Input } from 'phaser';
import { Bullet } from '../weapons/Bullet';
import { HealthBar } from '../HealthBar';
import { Potion } from '../items/Potion';
import { Weapon } from '../weapons/Weapon';
import { WeaponFactory } from '../weapons/WeaponFactory';
import { WeaponOverlay } from '../weapons/WeaponOverlay';
import { Powerup } from '../items/Powerup';
import { RoomState } from '../rooms/Room';
import { Room } from '../rooms/Room';
import { DeployableWeapon } from '../weapons/DeployableWeapon';
import { Canon } from '../items/Canon';
import { MainScene } from '../../scenes/MainScene';

// Extend Physics.Arcade.Sprite for physics and preUpdate
export class Player extends Physics.Arcade.Sprite {
  // Removed redundant body declaration, it's inherited

  private wasdKeys: {
    up: Input.Keyboard.Key;
    down: Input.Keyboard.Key;
    left: Input.Keyboard.Key;
    right: Input.Keyboard.Key;
  };

  private weapon: Weapon;
  private deployableWeapon: DeployableWeapon | null = null;

  public lastFired: number = 0;
  public fireRate: number = 500; // Fire every 0.5 seconds

  // Health system
  private maxHealth: number = 50;
  private currentHealth: number = 50;
  private isInvulnerable: boolean = false;
  private invulnerabilityDuration: number = 1000; // 1 second of invulnerability after being hit

  // Auto-targeting system
  private targetCircle: GameObjects.Graphics;
  private targetRadius: number = 20;

  private healthBar: HealthBar;
  private weaponOverlay: WeaponOverlay;
  private speedBoostTimer: Phaser.Time.TimerEvent | null = null;
  private speedBoostTrail: Phaser.GameObjects.Particles.ParticleEmitter | null = null;
  private floatingImage: Phaser.GameObjects.Image | null = null;

  public moveSpeed: number = 160; // Base movement speed
  public isSpeedBoosted: boolean = false;

  private touchPosition: { x: number; y: number } | null = null;

  constructor(scene: Scene, x: number, y: number) {
    super(scene, x, y, 'player-sprite');

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

    // Set up touch input
    scene.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      this.touchPosition = { x: pointer.worldX, y: pointer.worldY };
    });

    scene.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      if (pointer.isDown) {
        this.touchPosition = { x: pointer.worldX, y: pointer.worldY };
      }
    });

    scene.input.on('pointerup', () => {
      this.touchPosition = null;
    });

    // Initialize weapon with LEVEL_1_GUN configuration
    this.weapon = WeaponFactory.createPlayerWeapon(scene, 'BOLTSPITTER');

    // Create target circle
    this.targetCircle = scene.add.graphics();
    this.targetCircle.setDepth(10);

    // Initialize health bar
    this.healthBar = new HealthBar(scene, this, 150, 10, true);
    this.healthBar.setHealth(this.currentHealth, this.maxHealth);

    // Initialize weapon overlay
    this.weaponOverlay = new WeaponOverlay(scene);
    this.weaponOverlay.updateWeapon(this.weapon);

    this.scene.events.on(Potion.COLLECTED_EVENT, (data: { x: number, y: number, healAmount: number }) => {
      this.heal(data.healAmount);
      this.showFloatingImage('potion');
    });

    this.scene.events.on(Powerup.COLLECTED_EVENT, (data: { x: number, y: number, speedBoost: number }) => {
      this.applySpeedBoost(data.speedBoost);
      this.showFloatingImage('powerup');
    });

    this.scene.events.on(Room.ROOM_STATE_CHANGED, (room: Room, state: RoomState) => {
      if (state === RoomState.TRIGGERED) {
        this.deployableWeapon?.deploy(this, room);
      }
    });

    this.createAnimations(scene);
  }

  private createAnimations(scene: Scene) {
    // Remove existing animations if they exist
    if (scene.anims.exists('player-idle')) {
      scene.anims.remove('player-idle');
    }
    if (scene.anims.exists('player-walk')) {
      scene.anims.remove('player-walk');
    }

    // Create new animations with the provided sprite
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

    const body = this.body as Physics.Arcade.Body;
    body.setVelocity(0);

    if (this.touchPosition) {
      // Calculate angle to touch position
      const angle = Phaser.Math.Angle.Between(this.x, this.y, this.touchPosition.x, this.touchPosition.y);

      // Calculate velocity based on angle
      const velocityX = Math.cos(angle) * this.moveSpeed;
      const velocityY = Math.sin(angle) * this.moveSpeed;

      body.setVelocity(velocityX, velocityY);

      // Update animation based on movement
      this.anims.play('player-walk', true);

      // Update sprite direction
      this.flipX = velocityX < 0;
    } else {
      // Stop animation when not moving
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

  public getWeapon(): Weapon {
    return this.weapon;
  }

  public getDeployableWeapon(): Weapon | null {
    return this.deployableWeapon;
  }

  public hasDeployableWeapon(): boolean {
    return this.deployableWeapon !== null;
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
  public heal(amount: number): void {
    if (this.currentHealth >= this.maxHealth) return;

    this.currentHealth = Math.min(this.currentHealth + amount, this.maxHealth);
    this.healthBar.setHealth(this.currentHealth, this.maxHealth);

    // Create healing particles
    if (this.scene.textures.exists('particle')) {
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
  }

  private applySpeedBoost(boostAmount: number): void {
    this.moveSpeed *= boostAmount;
    this.isSpeedBoosted = true;
    // Add visual effects
    this.setTint(0x00ffff); // Cyan tint
    this.createSpeedBoostTrail();

    // Clear any existing timer
    if (this.speedBoostTimer) {
      this.speedBoostTimer.destroy();
    }

    this.speedBoostTimer = this.scene.time.addEvent({
      delay: 5000,
      callback: () => {
        this.moveSpeed -= boostAmount;
        this.isSpeedBoosted = false;
        this.clearTint();
        if (this.speedBoostTrail) {
          this.speedBoostTrail.destroy();
          this.speedBoostTrail = null;
        }
      }
    });
  }

  private createSpeedBoostTrail(): void {
    if (this.speedBoostTrail) {
      this.speedBoostTrail.destroy();
    }

    this.speedBoostTrail = this.scene.add.particles(0, 0, 'particle', {
      follow: this,
      scale: { start: 0.8, end: 0 },  // Increased start scale
      alpha: { start: 0.8, end: 0 },  // Increased start alpha
      speed: 0,
      lifespan: 800,  // Increased lifespan
      quantity: 2,    // Increased quantity
      frequency: 25,  // Decreased frequency for more particles
      blendMode: 'ADD',
      emitting: true,
      gravityY: 0,
      tint: 0x00ffff //cyan
    });

    // Set depth to be behind player but above background
    this.speedBoostTrail.setDepth(this.depth - 0.1);

    // Start emitting immediately
    this.speedBoostTrail.start();
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

  public swapWeapon(newWeapon: Weapon): void {
    if (newWeapon.isDeployable()) {
      this.deployableWeapon = newWeapon as DeployableWeapon;
    } else {
      this.weapon = newWeapon;
    }
    this.weaponOverlay.updateWeapon(this.weapon, this.deployableWeapon);
  }


  private handleAutoTargeting(): void {
    // Get the enemy manager from the scene
    const scene = this.scene as MainScene;
    const enemyManager = scene.getEnemyManager();
    const enemies = enemyManager.getEnemies();

    if (enemies.length === 0) return;

    // Find the nearest enemy
    let nearestEnemy = enemies[0];
    let nearestDistance = Phaser.Math.Distance.Between(
      this.x, this.y,
      nearestEnemy.x, nearestEnemy.y
    );

    for (let i = 1; i < enemies.length; i++) {
      const enemy = enemies[i];
      const distance = Phaser.Math.Distance.Between(
        this.x, this.y,
        enemy.x, enemy.y
      );

      if (distance < nearestDistance) {
        nearestEnemy = enemy;
        nearestDistance = distance;
      }
    }

    // Fire at the nearest enemy
    this.weapon.fireInDirection(this, nearestEnemy.x, nearestEnemy.y);
  }

  private showFloatingImage(texture: string): void {
    // Remove any existing floating image
    if (this.floatingImage) {
      this.floatingImage.destroy();
      this.floatingImage = null;
    }

    // Create a new floating image above the player
    this.floatingImage = this.scene.add.image(this.x, this.y - 30, texture);
    this.floatingImage.setScale(0.8);
    this.floatingImage.setDepth(this.depth + 1); // Ensure it's above the player

    // Add a floating animation
    this.scene.tweens.add({
      targets: this.floatingImage,
      y: this.y - 50,
      alpha: 0,
      duration: 1500,
      ease: 'Power2',
      onComplete: () => {
        if (this.floatingImage) {
          this.floatingImage.destroy();
          this.floatingImage = null;
        }
      }
    });
  }

  public destroy(): void {
    if (this.scene) {
      this.scene.events.off(Canon.CANON_EXPLODE);
      this.scene.events.off(Potion.COLLECTED_EVENT);
      this.scene.events.off(Powerup.COLLECTED_EVENT);
      this.scene.events.off(Room.ROOM_STATE_CHANGED);


      if (this.wasdKeys) {
        this.scene.input.keyboard.removeKey(this.wasdKeys.up);
        this.scene.input.keyboard.removeKey(this.wasdKeys.down);
        this.scene.input.keyboard.removeKey(this.wasdKeys.left);
        this.scene.input.keyboard.removeKey(this.wasdKeys.right);
      }
    }
    this.weapon?.destroy?.();
    this.deployableWeapon?.destroy?.();
    this.targetCircle?.destroy?.();
    this.healthBar?.destroy?.();
    this.weaponOverlay?.destroy?.();
    this.speedBoostTrail?.stop();
    this.speedBoostTrail?.destroy();
    this.floatingImage?.destroy?.();

    super.destroy(true);
  }


}