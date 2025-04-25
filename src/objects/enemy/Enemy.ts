import { Scene, Physics } from 'phaser';
import { HealthBar } from '../HealthBar';
import { Weapon } from '../weapons/Weapon';
import { EnemyConfig } from './EnemyConfigs';
import { Player } from '../player/Player';
import { MainScene } from '../../scenes/MainScene';
import { WeaponFactory } from '../weapons/WeaponFactory';


// Extend Physics.Arcade.Sprite for physics and preUpdate/update capabilities
export abstract class Enemy extends Physics.Arcade.Sprite {
  id: string; // Store the unique ID

  // Movement properties
  protected moveSpeed: number = 100;
  protected player: Player | null = null;

  // Health properties
  protected health: number = 3;
  protected maxHealth: number = 3;
  protected isDead: boolean = false;
  protected healthBar: HealthBar;
  public weapon: Weapon | null = null;

  // Static map to track created animations
  private static animationsCreated: Map<string, boolean> = new Map();
  protected config: EnemyConfig | null = null;


  // Add new property for path finding
  protected lastKnownPlayerPosition: { x: number, y: number } | null = null;
  protected stuckTimer: number = 0;
  protected isStuck: boolean = false;
  protected alternativeDirection: { x: number, y: number } | null = null;
  protected lastPosition: { x: number, y: number } | null = null;

  protected pathfindingEnabled: boolean = false;
  protected currentPath: Array<{ x: number, y: number }> = [];
  protected currentPathIndex: number = 0;
  protected pathUpdateTimer: number = 0;
  protected pathUpdateInterval: number = 1000; // Update path every second
  public static readonly ENEMY_DIED = 'enemy-died';
  public static readonly TARGET_REACHED = 'target-reached';

  constructor(scene: Scene, x: number, y: number, id: string, config?: EnemyConfig) {
    // Call Sprite constructor (use __WHITE texture key for tinting)
    super(scene, x, y, '__WHITE');

    this.id = id; // Assign the ID

    // Apply configuration
    if (config) {
      this.setTexture(config.sprite);
      this.setScale(config.scale);
      this.moveSpeed = config.moveSpeed + Math.random() * 50;
      this.health = config.maxHealth;
      this.maxHealth = config.maxHealth;

      // Initialize weapon if specified in config
      if (config.weaponType) {
        this.weapon = WeaponFactory.createEnemyWeapon(scene, config.weaponType);
      }
      this.config = config;
    }

    this.setDepth(1.1);

    // Add to scene and enable physics
    scene.add.existing(this);
    scene.physics.world.enable(this); // Enable physics

    // Get the physics body
    const enemyBody = this.body as Phaser.Physics.Arcade.Body;

    // Ensure the enemy can collide with walls
    enemyBody.setCollideWorldBounds(true);
    enemyBody.setDrag(0); // No drag to ensure they can move freely

    // Initialize current speed to move speed

    // Create health bar
    this.healthBar = new HealthBar(scene, this, 20, 2, false);
    this.healthBar.setHealth(this.health, this.maxHealth);
    // Initialize pathfinding
    this.initializePathfinding();

    // Get the sprite's texture size
    this.setHitBox();

    // Initialize animations
    this.createAnimations(scene);

    // Initialize last position
    this.lastPosition = { x, y };

    if (config?.behaviour) {
      config.behaviour.init(scene, this);
    }
  }


  private initializePathfinding(): void {
    // Get the pathfinding grid from the scene
    const mainScene = this.scene as MainScene;
    const pathfindingGrid = mainScene.getPathfindingGrid();

    if (pathfindingGrid) {
      // Enable pathfinding
      this.pathfindingEnabled = true;
    }
  }



  protected setHitBox() {
    if (!this.body) return;

    const enemyBody = this.body as Phaser.Physics.Arcade.Body;

    // Get the frame dimensions instead of texture dimensions
    const frameWidth = this.frame.width;
    const frameHeight = this.frame.height;
    const midWidth = frameWidth / 2;
    const midHeight = frameHeight / 2;

    // Set hitbox size to match frame size
    enemyBody.setSize(midWidth, midHeight);
  }

  // Create animations method moved from subclasses
  protected createAnimations(scene: Scene): void {
    if (!this.config) return;

    const animationKey = this.config.animationKey;
    if (Enemy.animationsCreated.get(animationKey)) return;

    // Only create animation if animationConfig is provided
    if (this.config.animationConfig && !scene.anims.exists(animationKey)) {
      const animConfig = this.config.animationConfig;
      scene.anims.create({
        key: animationKey,
        frames: scene.anims.generateFrameNumbers(this.config.sprite, {
          start: animConfig.startFrame,
          end: animConfig.endFrame
        }),
        frameRate: animConfig.frameRate,
        repeat: animConfig.repeat
      });

      Enemy.animationsCreated.set(animationKey, true);
    }
  }


  // Update method to handle movement and shooting logic
  preUpdate(time: number, delta: number) {
    super.preUpdate(time, delta);
    if (!this.body) return;


    // Play the walk animation only if animation config exists
    if (this.shouldPlayAnimation()) {
      this.play(this.config!.animationKey, true);
    }

    // Flip the sprite based on movement direction
    if (this.body.velocity.x < 0) {
      this.flipX = true;
    } else if (this.body.velocity.x > 0) {
      this.flipX = false;
    }

    // Handle movement
    this.updateMovement(delta);

    // Check if it's time to attack
    if (this.isInAttackRange()) {
      this.performAttack();
    }

    if (this.config?.behaviour) {
      this.config.behaviour.preUpdate(time, delta);
    }
    // Update health bar position
    this.healthBar.update();
  }


  // Method to update enemy movement
  protected updateMovement(delta: number): void {
    if (!this.pathfindingEnabled || !this.body) return;
    const mainScene = this.scene as MainScene;
    const pathfindingGrid = mainScene.getPathfindingGrid();


    if (this.currentPath && this.currentPath.length > 0) {
      const targetNode = this.currentPath[this.currentPathIndex];
      const targetWorldX = pathfindingGrid.getWorldX(targetNode.x);
      const targetWorldY = pathfindingGrid.getWorldY(targetNode.y);


      const dx = targetWorldX - this.x;
      const dy = targetWorldY - this.y;
      const distance = Math.hypot(dx, dy);

      const isWalkable = pathfindingGrid.isTileWalkable(targetNode.x, targetNode.y);


      // If we're close enough to the target node, move to the next one
      if (distance < 5 || !isWalkable) {
        this.currentPathIndex++;

        // If we've reached the end of the path, stop moving
        if (this.currentPathIndex >= this.currentPath.length) {
          if (this.body instanceof Phaser.Physics.Arcade.Body) {
            console.log('enemy: stopping movement');
            this.body.setVelocity(0, 0);
            this.currentPathIndex = 0;
            this.currentPath = [];
            this.scene.events.emit(Enemy.TARGET_REACHED, { enemy: this });
          }
          return;
        }
      } else {
        // Calculate the angle to the target
        const angle = Math.atan2(dy, dx);

        // Set velocity based on the angle and move speed
        const vx = Math.cos(angle) * this.moveSpeed;
        const vy = Math.sin(angle) * this.moveSpeed;

        // Apply the velocity to the physics body
        if (this.body instanceof Phaser.Physics.Arcade.Body) {
          this.body.setVelocity(vx, vy);
        }
      }
    } else {
      // If there's no path, stop moving
      if (this.body instanceof Phaser.Physics.Arcade.Body) {
        this.body.setVelocity(0, 0);
      }
    }
  }

  public setPath(path: Array<{ x: number, y: number }>): void {
    this.currentPath = path;
    this.currentPathIndex = 0;
  }

  public getPath(): Array<{ x: number, y: number }> {
    return this.currentPath;
  }

  // Method to set player reference
  public setPlayer(player: Player): void {
    this.player = player;
  }

  // Method to take damage
  public takeDamage(amount: number): void {
    if (this.isDead) return;

    this.health -= amount;
    this.healthBar.setHealth(this.health, this.maxHealth);

    // Visual feedback
    this.setTint(0xff0000);
    this.scene.time.delayedCall(100, () => {
      this.clearTint();
    });
    if (this.health <= 0) {
      this.die();
    }
  }

  // Method to handle enemy death
  public die(): void {
    this.isDead = true;

    // Destroy the health bar if it exists
    if (this.healthBar) {
      this.healthBar.destroy();
    }

    // Destroy the enemy sprite
    this.destroy();
  }

  // Override the destroy method to ensure health bar is destroyed
  public destroy(fromScene?: boolean): void {
    // Destroy the health bar if it exists
    if (this.healthBar) {
      this.healthBar.destroy();
    }
    this.scene.events.emit(Enemy.ENEMY_DIED, { enemy: this });
    // Call the parent destroy method
    super.destroy(fromScene);

  }

  // Method to check if enemy is dead
  public isEnemyDead(): boolean {
    return this.isDead;
  }

  // Method to check if animations should be played
  protected shouldPlayAnimation(): boolean {
    return this.config !== null && this.config.animationKey !== undefined;
  }

  // Public method to destroy health bar
  public destroyHealthBar(): void {
    if (this.healthBar) {
      this.healthBar.destroy();
    }
  }

  protected performAttack(): void {
    // Default implementation does nothing
  }

  // Method to check if enemy is in attack range
  protected isInAttackRange(): boolean {
    if (!this.weapon || !this.player) return false;

    const distance = Phaser.Math.Distance.Between(
      this.x, this.y,
      this.player.x, this.player.y
    );

    return distance <= this.weapon.maxDistance;
  }


  public handleWallCollision(): void {
    // Stop movement and change direction when hitting a wall
    if (this.body instanceof Phaser.Physics.Arcade.Body) {
      this.body.velocity.x = 0;
      this.body.velocity.y = 0;
      // You can add additional logic here, like changing direction
      this.reverseDirection();
    }
  }

  protected reverseDirection(): void {
    // Reverse the current movement direction
    if (this.body instanceof Phaser.Physics.Arcade.Body) {
      this.body.velocity.x *= -1;
      this.body.velocity.y *= -1;
    }
  }

}
