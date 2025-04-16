import { Scene } from 'phaser';
import { Player } from '../objects/Player';
import { Enemy } from '../objects/enemy/Enemy';
import { Bullet } from '../objects/weapons/Bullet';
import { PathfindingGrid } from '../objects/pathfinding/PathfindingGrid';
import { RoomManager } from '../objects/rooms/RoomManager';
import { BarrelManager } from '../objects/props/BarrelManager';
import { EnemyManager } from '../objects/enemy/EnemyManager';

export class MainScene extends Scene {
  // Core game objects
  private player!: Player;
  private enemies!: Phaser.Physics.Arcade.Group;
  private wallsLayer: Phaser.Tilemaps.TilemapLayer | null = null;
  private mousePointer: Phaser.Input.Pointer | null = null;
  
  // Game state
  private gameOver: boolean = false;
  private gameOverText: Phaser.GameObjects.Text | null = null;
  private restartText: Phaser.GameObjects.Text | null = null;
  
  // Room system
  private currentRoomId: string = "1";
  private roomManager: RoomManager;
  
  // Managers and utilities
  private pathfindingGrid: PathfindingGrid;
  private barrelManager: BarrelManager | null = null;
  private enemyManager: EnemyManager | null = null;
  
 
  constructor() {
    super({ key: 'MainScene' });
    this.pathfindingGrid = PathfindingGrid.getInstance();
    this.roomManager = new RoomManager(this);

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
    this.loadSprite('arrow', 'assets/sprites/arrow.png', 32, 16);
    this.loadSprite('ninja-star', 'assets/sprites/ninja-star.png', 32, 32);
    this.loadSprite('smashed-barrel', 'assets/sprites/smashed-barrel.png', 32, 32);
    
    // Load tiles and maps
    this.load.image('tiles-32', 'assets/tiles.png');
    this.load.tilemapTiledJSON('dungeon-map', 'assets/dungeon-32.tmj');
    
    // Load props
    this.load.image('door-open', 'assets/sprites/door-open.png');
    this.load.image('door-closed', 'assets/sprites/door-closed.png');
    this.load.image('barrel', 'assets/sprites/barrel.png');
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
    this.setupCamera();
    this.setupPhysics();
    this.setupRooms();
    this.setupPathfinding();
    this.setupBarrels();
    this.setupEnemies();
    this.setupCollisions();
    

    this.events.on(EnemyManager.ENEMY_DIED, (data: { enemy: Enemy }) => {
      this.roomManager.getRoom(this.currentRoomId)?.checkCleared();
    });
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
    }
   
    if (floorDecorLayer) {
      floorDecorLayer.setAlpha(1);
      floorDecorLayer.setDepth(-0.5);
    }
   
    if (this.wallsLayer) {
      this.wallsLayer.setCollisionFromCollisionGroup();
    } else {
      console.error('Walls layer is null');
    }
  }

  private setupPlayer() {
    if (!this.input || !this.input.keyboard) {
      console.error('Keyboard input not available');
      return;
    }

    this.player = new Player(this, 100, 300);
    console.log('Player created:', this.player);
    
    const playerBody = this.player.body as Phaser.Physics.Arcade.Body;
    playerBody.setSize(32, 32);
    playerBody.setOffset(16, 16);
    
    
    this.events.on('playerDied', this.handlePlayerDeath, this);
  }

  private setupCamera() {
    this.cameras.main.setBounds(0, 0, 1600, 1200);
    this.cameras.main.startFollow(this.player);
  }

  private setupPhysics() {
    this.physics.world.setBounds(0, 0, 1600, 1200);
    this.enemies = this.physics.add.group({ classType: Enemy });
  }

  private setupRooms() {
    const map = this.make.tilemap({ key: 'dungeon-map' });
    this.roomManager.initializeRooms(map.getObjectLayer('Rooms') as Phaser.Tilemaps.ObjectLayer);
  }

  private setupPathfinding() {
    if (this.wallsLayer) {
      const map = this.make.tilemap({ key: 'dungeon-map' });
      this.pathfindingGrid.initialize(this, map, this.wallsLayer);
    }
  }

  private setupBarrels() {
    this.barrelManager = new BarrelManager(this);
    console.log('BarrelManager created:', this.barrelManager);
    const map = this.make.tilemap({ key: 'dungeon-map' });
    this.barrelManager.createBarrelsFromPropsLayer(map.getObjectLayer('Props') as Phaser.Tilemaps.ObjectLayer, this.roomManager.getRooms());
  }

  private setupEnemies() {
    this.enemyManager = new EnemyManager(this);
    console.log('EnemyManager created:', this.enemyManager);
    const map = this.make.tilemap({ key: 'dungeon-map' });
    this.enemyManager.createEnemiesFromSpawnLayer(map.getObjectLayer('Enemies') as Phaser.Tilemaps.ObjectLayer, this.roomManager.getRooms());
  }


  // Setup collisions AFTER enemies group and player exist
  private setupCollisions() {
    // Collisions with walls
    if (this.wallsLayer) {
      this.physics.add.collider(this.player, this.wallsLayer); // Player vs Walls
      this.physics.add.collider(this.player.bullets, this.wallsLayer, this.handleBulletPlatformCollision, undefined, this); // Player Bullets vs Walls
    }

    // Setup enemy collisions
    if (this.enemyManager) {
      this.enemyManager.setupCollisions();
    }

    // Setup barrel collisions
    if (this.barrelManager) {
      this.barrelManager.setupCollisions();
    }
  }


  // Handles collision between player bullets and walls/platforms
  public handleBulletPlatformCollision(bullet: any, platform: any) {
    const bulletInstance = bullet as Bullet;
    if (bulletInstance && bulletInstance.active) {
      bulletInstance.deactivate();
    }
  }

  
  handleRoomEntry(roomId: string) {
    // If we're already in this room, do nothing
    if (this.currentRoomId === roomId) return;
    
    console.log(`Player entered room ${roomId}`);
    this.currentRoomId = roomId;
  }

  update(time: number, delta: number) {
    if (this.gameOver) {
      return;
    }

    // Update player
    this.player.update();
    
    // Update enemies and their health bars
    this.enemies.getChildren().forEach((enemy) => {
      const enemyInstance = enemy as Enemy;
      // Update enemy behavior
      enemyInstance.preUpdate(time, delta);
    });

  }

  public anyTargetableObjectsInRoom() {
    if (!this.roomManager) return false;  
    return this.roomManager.anyTargetableObjectsInRoom(this.currentRoomId);
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
  public getEnemyManager(): EnemyManager | null {
    return this.enemyManager;
  }
}
