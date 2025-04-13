import { Scene, Physics, Input } from 'phaser';
import { Player } from '../objects/Player';
import { Enemy } from '../objects/enemy/Enemy';
import { RangedEnemy } from '../objects/enemy/RangedEnemy';
import { EnemyFactory, EnemyType } from '../objects/enemy/EnemyFactory';

export class TestScene extends Scene {
  private player!: Player;
  private enemies!: Phaser.Physics.Arcade.Group;
  private wallsLayer: Phaser.Tilemaps.TilemapLayer | null = null;
  private spawnText!: Phaser.GameObjects.Text;
  private enemyType: EnemyType = 'NINJA'; // Default enemy type to spawn
  private enemyTypeText!: Phaser.GameObjects.Text;
  
  constructor() {
    super({ key: 'TestScene' });
  }

  preload() {
    // Load the same assets as MainScene
    this.loadSprite('player-sprite', 'assets/sprites/shooter-sprite.png', 64, 64);
    this.loadSprite('skeleton-sprite', 'assets/sprites/skeleton.png', 16, 32);
    this.loadSprite('zombie-sprite', 'assets/sprites/zombie.png', 32, 32);
    this.loadSprite('ninja-sprite', 'assets/sprites/ninja.png', 16, 32);
    this.loadSprite('arrow', 'assets/sprites/arrow.png', 32, 16);
    this.loadSprite('ninja-star', 'assets/sprites/ninja-star.png', 32, 32);
    this.load.image('tiles-32', 'assets/tiles.png');
    this.load.tilemapTiledJSON('dungeon-map', 'assets/dungeon-32.tmj');
  }

  loadSprite(name: string, path: string, frameWidth: number, frameHeight: number) {
    this.load.spritesheet(name, path, {
      frameWidth: frameWidth,
      frameHeight: frameHeight
    });
  }

  create() {
    console.log('Test Scene started!');
    
    // Create a simple map for testing
    const map = this.make.tilemap({ key: 'dungeon-map' });
    const tileset = map.addTilesetImage('tiles-32', 'tiles-32');
    
    if (!tileset) {
      console.error('Failed to load tilesets');
      return;
    }
    
    // Create floor and walls layers
    const floorLayer = map.createLayer('Floor', tileset, 0, 0);
    const floorDecorLayer = map.createLayer('FloorDecor', tileset, 0, 0);
    this.wallsLayer = map.createLayer('Walls', tileset, 0, 0);
    
    if (floorLayer) {
      floorLayer.setAlpha(1);
      floorLayer.setDepth(-1);
    }
    
    if (floorDecorLayer) {
      floorDecorLayer.setAlpha(1);
      floorDecorLayer.setDepth(-0.5); // Put floor decor between floor and walls
    }
    
    if (this.wallsLayer) {
      this.wallsLayer.setCollisionFromCollisionGroup();
    }
    
    // Create player at the center of the screen
    this.player = new Player(this, 1400, 300);
    
    // Set up player collision with walls
    if (this.wallsLayer) {
      this.physics.add.collider(this.player, this.wallsLayer);
    }
    
    // Create enemies group
    this.enemies = this.physics.add.group({ classType: Enemy });
    

      // Enable physics debug graphics
    // this.physics.world.createDebugGraphic();

    // Set up collisions
    this.setupCollisions();
    
    // Create UI elements
    this.spawnText = this.add.text(16, 16, 'Press SPACE to spawn enemy\nPress M to switch enemy type', {
      fontSize: '16px',
      color: '#fff'
    });

    this.enemyTypeText = this.add.text(16, 64, `Enemy Type: ${this.enemyType}`, {
      fontSize: '16px',
      color: '#fff'
    });

    // Add keyboard input
    if (this.input.keyboard) {
      this.input.keyboard.on('keydown-SPACE', () => {
        this.spawnEnemy(this.player);
      });

      this.input.keyboard.on('keydown-M', () => {
        this.toggleEnemyType();
      });
    }

    
    // Set up camera to follow player
    this.cameras.main.setBounds(0, 0, 1600, 1200);
    this.cameras.main.startFollow(this.player);
    
    // Set physics world bounds
    this.physics.world.setBounds(0, 0, 1600, 1200);
    
    // Listen for player death
    this.events.on('playerDied', this.handlePlayerDeath, this);
  }
  
  spawnEnemy(player:  Player) {
    const x = 1100;
    const y = 300
    // Create enemy based on current type
    const enemy = EnemyFactory.createEnemy(
      this, 
      this.enemyType, 
      x, 
      y, 
      `enemy_${this.enemies.getLength()}`
    );

    enemy.setPlayer(player);
    
    this.enemies.add(enemy);
    
    // Set up collisions for enemy bullets if it's a RangedEnemy
    if (enemy instanceof RangedEnemy && enemy.weapon && enemy.weapon.bullets) {
      this.physics.add.collider(this.player, enemy.weapon.bullets, this.handlePlayerBulletCollision, undefined, this);
      if (this.wallsLayer) {
        this.physics.add.collider(this.wallsLayer, enemy.weapon.bullets, this.handleBulletPlatformCollision, undefined, this);
      }
    }
    
    console.log(`Spawned ${this.enemyType} enemy at (${x}, ${y})`);
  }
  
  toggleEnemyType() {
    switch (this.enemyType) {
      case 'ZOMBIE':
        this.enemyType = 'SKELETON';
        break;
      case 'SKELETON':
        this.enemyType = 'NINJA';
        break;
      case 'NINJA':
        this.enemyType = 'ZOMBIE';
        break;
    }
    this.enemyTypeText.setText(`Enemy Type: ${this.enemyType}`);
  }
  
  setupCollisions() {
    // Add collisions between player bullets and walls
    if (this.wallsLayer) {
      this.physics.add.collider(this.player.bullets, this.wallsLayer, this.handleBulletPlatformCollision, undefined, this);
      
      // Add collision between enemies and walls
      this.physics.add.collider(this.enemies, this.wallsLayer, (enemy, wall) => {
        // When an enemy collides with a wall, force it to stop
        const enemyInstance = enemy as Enemy;
        if (enemyInstance.body) {
          const body = enemyInstance.body as Phaser.Physics.Arcade.Body;
          body.setVelocity(0, 0);
          
          // After a short delay, try to find an alternative path
          this.time.delayedCall(200, () => {
            if (enemyInstance.body && !enemyInstance.isEnemyDead()) {
              enemyInstance.preUpdate(this.time.now, 0);
            }
          });
        }
      });
    }
    
    // Add collisions between player bullets and enemies
    this.physics.add.collider(this.enemies, this.player.bullets, this.handleEnemyBulletCollision, undefined, this);
    
    // Add overlap between player and enemies (instead of collision)
    this.physics.add.overlap(this.player, this.enemies, (player, enemy) => {
      const playerInstance = player as Player;
      const enemyInstance = enemy as Enemy;
      
      // Only apply damage if the enemy is a MeleeEnemy and has a weapon
      if (!(enemyInstance instanceof RangedEnemy) && enemyInstance.weapon) {
        enemyInstance.weapon.dealDamage(enemyInstance, playerInstance);
      }
    });
  }
  
  update(time: number, delta: number) {
    // Update player
    this.player.update();
    
    // Update enemies
    this.enemies.getChildren().forEach((enemy) => {
      const enemyInstance = enemy as Enemy;
      enemyInstance.preUpdate(time, delta);
    });
  }
  
  handleBulletPlatformCollision(bullet: any, platform: any) {
    const bulletInstance = bullet as any;
    if (bulletInstance && bulletInstance.active) {
      bulletInstance.deactivate();
    }
  }
  
  handlePlayerBulletCollision(player: any, bullet: any) {
    const playerInstance = player as Player;
    const bulletInstance = bullet as any;
    
    if (!playerInstance.active || !bulletInstance.active) {
      return;
    }
    
    // Always deactivate the bullet
    bulletInstance.deactivate();
    
    // Apply damage from the bullet
    playerInstance.takeDamage(bulletInstance.getDamage());
  }
  
  handleEnemyBulletCollision(enemy: any, bullet: any) {
    const enemyInstance = enemy as Enemy;
    const bulletInstance = bullet as any;
    
    if (!enemyInstance.active || !bulletInstance.active) {
      return;
    }
    
    // Deactivate the bullet
    bulletInstance.deactivate();
    
    console.log('handleEnemyBulletCollision', bulletInstance.getDamage());
    // Apply damage from the bullet
    enemyInstance.takeDamage(bulletInstance.getDamage());
    
    // If enemy is dead, remove it from the group
    if (enemyInstance.isEnemyDead()) {
      this.enemies.remove(enemyInstance, true, true);
    }
  }
  
  handlePlayerDeath() {
    console.log('Player died in test scene!');
    
    // Get player's death position
    const playerX = this.player.x;
    const playerY = this.player.y;
    
    // Create a semi-transparent overlay at the player's death location
    const overlay = this.add.rectangle(playerX, playerY, 300, 200, 0x000000, 0.7);
    overlay.setOrigin(0.5);
    overlay.setDepth(100); // Ensure it's above other elements
    
    // Create game over text at player's death location
    const gameOverText = this.add.text(playerX, playerY - 30, 'GAME OVER', {
      fontSize: '64px',
      color: '#ff0000',
      fontFamily: 'Arial'
    }).setOrigin(0.5).setDepth(101);
    
    // Add restart instruction
    const restartText = this.add.text(playerX, playerY + 30, 'Press R to restart', {
      fontSize: '32px',
      color: '#ffffff',
      fontFamily: 'Arial'
    }).setOrigin(0.5).setDepth(101);
    
    // Add restart key
    if (this.input.keyboard) {
      this.input.keyboard.on('keydown-R', () => {
        this.scene.restart();
      });
    }
  }
} 