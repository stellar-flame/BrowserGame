import { Scene } from 'phaser';
import { Player } from '../objects/player/Player';
import { Bullet } from '../objects/weapons/Bullet';
import { PathfindingGrid } from '../objects/pathfinding/PathfindingGrid';
import { RoomManager } from '../objects/rooms/RoomManager';
import { BarrelManager } from '../objects/props/BarrelManager';
import { EnemyManager } from '../objects/enemy/EnemyManager';
import { ItemManager } from '../objects/items/ItemManager';
import { WeaponManager } from '../objects/weapons/WeaponManager';
import { MovementManager } from '../objects/enemy/MovementManager';

export class MainScene extends Scene {
  // Core game objects
  protected player!: Player;
  protected wallsLayer: Phaser.Tilemaps.TilemapLayer | null = null;
  protected mousePointer: Phaser.Input.Pointer | null = null;

  // Game state
  protected gameOver: boolean = false;
  protected gameOverText: Phaser.GameObjects.Text | null = null;
  protected restartText: Phaser.GameObjects.Text | null = null;

  // Room system
  protected roomManager: RoomManager | null = null;

  // Managers and utilities
  protected pathfindingGrid: PathfindingGrid;
  protected barrelManager: BarrelManager | null = null;
  protected enemyManager: EnemyManager | null = null;
  protected itemManager: ItemManager | null = null;
  protected weaponManager: WeaponManager | null = null;
  protected movementManager: MovementManager | null = null;

  constructor(key: string = 'MainScene') {
    super({ key: key });
    this.pathfindingGrid = PathfindingGrid.getInstance();
  }

  // Asset loading
  preload() {
    this.loadGameAssets();
  }

  private loadGameAssets() {
    // Load sprites
    this.loadSprite('player-sprite', 'assets/sprites/shooter-sprite.png', 64, 64);
    this.loadSprite('skeleton-sprite', 'assets/sprites/skeleton.png', 16, 32);
    this.loadSprite('zombie-sprite', 'assets/sprites/zombie.png', 32, 32);
    this.loadSprite('ninja-sprite', 'assets/sprites/ninja.png', 16, 32);
    this.loadSprite('chomper-sprite', 'assets/sprites/chomper.png', 16, 32);
    this.loadSprite('canon', 'assets/sprites/canon.png', 16, 16);
    this.loadSprite('troll-sprite', 'assets/sprites/troll-sprite.png', 32, 32);
    this.loadSprite('arrow', 'assets/sprites/arrow.png', 32, 16);
    this.loadSprite('ninja-star', 'assets/sprites/ninja-star.png', 32, 32);
    this.loadSprite('smashed-barrel', 'assets/sprites/smashed-barrel.png', 32, 32);
    this.loadSprite('weapon-upgrade', 'assets/sprites/weapon-upgrade.png', 32, 32);
    this.loadSprite('slug-sprite', 'assets/sprites/slug-sprite.png', 16, 32);
    this.loadSprite('turret-animation', 'assets/sprites/turret-sheet.png', 32, 32);
    // Load tiles and maps
    this.load.image('tiles-32', 'assets/tiles.png');
    this.load.tilemapTiledJSON('dungeon-map', 'assets/dungeon-32.tmj');

    // Load props
    this.load.image('particle', 'assets/sprites/particle.png');
    this.load.image('door-open', 'assets/sprites/door-open.png');
    this.load.image('door-closed', 'assets/sprites/door-closed.png');
    this.load.image('barrel', 'assets/sprites/barrel.png');
    this.load.image('potion', 'assets/sprites/potion.png');
    this.load.image('powerup', 'assets/sprites/powerup.png');
    this.load.image('player-bullet-1', 'assets/sprites/player-bullet-1.png');
    this.load.image('turret', 'assets/sprites/turret.png');
    this.load.image('slime-shot', 'assets/sprites/slime-shot.png');
    // Load sound effects
    // this.load.audio('weapon-upgrade', 'assets/sounds/weapon-upgrade.mp3');
  }

  private loadSprite(name: string, path: string, frameWidth: number, frameHeight: number) {
    this.load.spritesheet(name, path, {
      frameWidth: frameWidth,
      frameHeight: frameHeight
    });
  }

  // Scene initialization
  create() {

    console.log('Game started!');

    this.setupInput();
    this.setupMap();
    this.setupPlayer();
    this.setupWeaponManager();
    this.setupCamera();
    this.setupPhysics();
    this.setupRooms();
    this.setupPathfinding();
    this.setupBarrels();
    this.setupPotions();
    this.setupEnemies();
    this.setupCollisions();
    this.setupDeployableWeapon();

    // Add keyboard shortcut to toggle grid labels
    if (this.input && this.input.keyboard) {
      this.input.keyboard.on('keydown-G', () => {
        if (this.pathfindingGrid) {
          this.pathfindingGrid.toggleGridLabels(this);
        }
      });

      // Add keyboard shortcut to toggle buffered grid visualization
      this.input.keyboard.on('keydown-B', () => {
        if (this.pathfindingGrid) {
          this.pathfindingGrid.toggleBufferedGridVisualization(this);
        }
      });
    }


    // Enable debug visualization
    // this.physics.world.createDebugGraphic();

  }

  private setupInput() {
    if (this.input && this.input.keyboard) {
      this.input.keyboard.on('keydown-F', () => {
        if (this.scale.isFullscreen) {
          this.scale.stopFullscreen();
        } else {
          this.scale.startFullscreen();
        }
      });
      this.mousePointer = this.input.activePointer;
    }
  }

  private setupMap() {
    const map = this.make.tilemap({ key: 'dungeon-map' });
    const tileset = map.addTilesetImage('tiles-32', 'tiles-32');

    if (!tileset) {
      console.error('Failed to load tilesets');
      return;
    }

    const floorLayer = map.createLayer('Floor', tileset, 0, 0);
    const floorDecorLayer = map.createLayer('FloorDecor', tileset, 0, 0);
    this.wallsLayer = map.createLayer('Walls', tileset, 0, 0);

    if (floorLayer) {
      floorLayer.setAlpha(1);
      floorLayer.setDepth(-1);
      floorLayer.setPipeline('TextureTintPipeline');
      floorLayer.setScrollFactor(1);
      floorLayer.setCullPadding(32, 32);
    }

    if (floorDecorLayer) {
      floorDecorLayer.setAlpha(1);
      floorDecorLayer.setDepth(-0.5);
      floorDecorLayer.setPipeline('TextureTintPipeline');
      floorDecorLayer.setScrollFactor(1);
      floorDecorLayer.setCullPadding(32, 32);
    }

    if (this.wallsLayer) {
      this.wallsLayer.setCollisionFromCollisionGroup();
      this.wallsLayer.setPipeline('TextureTintPipeline');
      this.wallsLayer.setScrollFactor(1);
      this.wallsLayer.setCullPadding(32, 32);
    } else {
      console.error('Walls layer is null');
    }
  }

  private setupPlayer() {
    if (!this.input || !this.input.keyboard) {
      console.error('Keyboard input not available');
      return;
    }

    // this.player = new Player(this, 100, 300);
    // this.player = new Player(this, 850, 320);

    // this.player = new Player(this, 1400, 700);
    // this.player = new Player(this, 1400, 1000);
    this.player = new Player(this, 735, 1500);


    console.log('Player created:', this.player);

    const playerBody = this.player.body as Phaser.Physics.Arcade.Body;
    playerBody.setSize(32, 32);
    playerBody.setOffset(16, 16);


    this.events.on('playerDied', this.handlePlayerDeath, this);

  }

  private setupWeaponManager() {
    this.weaponManager = new WeaponManager(this, this.player);
    const map = this.make.tilemap({ key: 'dungeon-map' });
    this.weaponManager.setupWeaponUpgrades(map.getObjectLayer('Items') as Phaser.Tilemaps.ObjectLayer);
  }

  private setupCamera() {
    this.cameras.main.setBounds(0, 0, 2400, 3600);
    this.cameras.main.startFollow(this.player, true, 0.1, 0.1);
    this.cameras.main.setRoundPixels(true);
    this.cameras.main.setZoom(1);
  }

  private setupPhysics() {
    this.physics.world.setBounds(0, 0, 2400, 3600);
  }

  private setupRooms() {
    this.roomManager = new RoomManager(this, this.player);
    const map = this.make.tilemap({ key: 'dungeon-map' });
    this.roomManager.initializeRooms(map.getObjectLayer('Rooms') as Phaser.Tilemaps.ObjectLayer);
  }

  private setupPathfinding() {
    if (this.wallsLayer) {
      const map = this.make.tilemap({ key: 'dungeon-map' });
      this.pathfindingGrid.initialize(this, map);
    }
  }

  private setupBarrels() {
    this.barrelManager = new BarrelManager(this, this.player);
    const map = this.make.tilemap({ key: 'dungeon-map' });
    this.barrelManager.createBarrelsFromPropsLayer(map.getObjectLayer('Props') as Phaser.Tilemaps.ObjectLayer, this.getRoomManager().getRooms());
  }

  private setupPotions() {
    this.itemManager = new ItemManager(this, this.player);
    this.itemManager.setSpawnPoints(this.getRoomManager().getRooms());
    const map = this.make.tilemap({ key: 'dungeon-map' });
    this.itemManager.createItemsFromItemsLayer(map.getObjectLayer('Items') as Phaser.Tilemaps.ObjectLayer);
  }

  protected setupEnemies() {
    this.movementManager = new MovementManager(this, this.player);
    this.enemyManager = new EnemyManager(this, this.player);
    const map = this.make.tilemap({ key: 'dungeon-map' });
    this.enemyManager.createEnemiesFromSpawnLayer(map.getObjectLayer('Enemies') as Phaser.Tilemaps.ObjectLayer, this.getRoomManager().getRooms());
  }


  // Setup collisions AFTER enemies group and player exist
  private setupCollisions() {
    // Collisions with walls
    if (this.wallsLayer) {
      this.physics.add.collider(this.player, this.wallsLayer); // Player vs Walls

    }

    if (this.weaponManager) {
      this.weaponManager.setupCollisions();
    }

    // Setup enemy collisions
    if (this.enemyManager) {
      this.enemyManager.setupCollisions();
    }

    // Setup barrel collisions
    if (this.barrelManager) {
      this.barrelManager.setupCollisions();
    }

    if (this.itemManager) {
      this.itemManager.setupCollisions();
    }
  }

  public handleBulletCollision(bullet: any, platform: any) {
    const bulletInstance = bullet as Bullet;
    if (bulletInstance && bulletInstance.active) {
      bulletInstance.deactivate();
    }
  }


  update(time: number, delta: number) {
    if (this.gameOver) {
      return;
    }
    if (this.movementManager) {
      this.movementManager.updateFlankingPoints(this.getEnemyManager().getEnemies());
    }
  }


  // Handle player death
  private handlePlayerDeath(): void {
    if (this.gameOver) return;

    // Stop all movement
    this.player.setVelocity(0, 0);

    // Disable player controls
    this.player.setActive(false);

    // Get camera center position
    const cameraCenterX = this.cameras.main.scrollX + this.cameras.main.width / 2;
    const cameraCenterY = this.cameras.main.scrollY + this.cameras.main.height / 2;

    // Create a semi-transparent overlay at the center of the screen
    const overlay = this.add.rectangle(cameraCenterX, cameraCenterY, 300, 200, 0x000000, 0.7);
    overlay.setOrigin(0.5);
    overlay.setDepth(100); // Ensure it's above other elements

    // Show game over text at the center of the screen
    this.gameOverText = this.add.text(cameraCenterX, cameraCenterY - 30, 'GAME OVER', {
      fontSize: '64px',
      color: '#ff0000',
      fontFamily: 'Arial'
    }).setOrigin(0.5).setDepth(101);

    // Add restart instruction
    this.restartText = this.add.text(cameraCenterX, cameraCenterY + 30, 'Press R to restart', {
      fontSize: '32px',
      color: '#ffffff',
      fontFamily: 'Arial'
    }).setOrigin(0.5).setDepth(101);

    // Set game over flag
    this.gameOver = true;
  }


  // Getter for player
  public getPlayer(): Player {
    return this.player;
  }

  // Getter for walls layer
  public getWallsLayer(): Phaser.Tilemaps.TilemapLayer | null {
    return this.wallsLayer;
  }

  // Getter for tilemap
  public getTilemap(): Phaser.Tilemaps.Tilemap | null {
    return this.make.tilemap({ key: 'dungeon-map' });
  }

  // Add getter for pathfinding grid
  public getPathfindingGrid(): PathfindingGrid {
    return this.pathfindingGrid;
  }

  // Add getter for barrel manager
  public getBarrelManager(): BarrelManager {
    if (!this.barrelManager) {
      throw new Error('BarrelManager not initialized');
    }
    return this.barrelManager;
  }

  // Add getter for enemy manager
  public getEnemyManager(): EnemyManager {
    if (!this.enemyManager) {
      throw new Error('EnemyManager not initialized');
    }
    return this.enemyManager;
  }

  public getRoomManager(): RoomManager {
    if (!this.roomManager) {
      throw new Error('RoomManager not initialized');
    }
    return this.roomManager;
  }


  public getMovementManager(): MovementManager {
    if (!this.movementManager) {
      throw new Error('MovementManager not initialized');
    }
    return this.movementManager;
  }

  private setupDeployableWeapon() {

  }


}