import { Scene, Physics, Types } from 'phaser';
import { Player } from '../objects/Player';
import { Enemy } from '../objects/enemy/Enemy';
import { RangedEnemy } from '../objects/enemy/RangedEnemy';
import { Bullet } from '../objects/Bullet';
import { EnemyFactory, EnemyType } from '../objects/enemy/EnemyFactory';
import { Door, DoorDirection } from '../objects/Door';
import { PathfindingGrid } from '../objects/pathfinding/PathfindingGrid';
import { BarrelManager } from '../objects/BarrelManager';
import { Room } from '../objects/Room';

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
  private rooms: Map<string, Room> = new Map();
  private doors: Door[] = [];
  
  // Managers and utilities
  private pathfindingGrid: PathfindingGrid;
  private barrelManager: BarrelManager;
  
  constructor() {
    super({ key: 'MainScene' });
    this.pathfindingGrid = PathfindingGrid.getInstance();
    this.barrelManager = new BarrelManager(this);
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
    
    // Load tiles and maps
    this.load.image('tiles-32', 'assets/tiles.png');
    this.load.tilemapTiledJSON('dungeon-map', 'assets/dungeon-32.tmj');
    
    // Load props
    this.load.image('door-open', 'assets/sprites/door-open.png');
    this.load.image('door-closed', 'assets/sprites/door-closed.png');
    this.load.image('barrel', 'assets/sprites/barrel.png');
    this.load.image('smashed-barrel', 'assets/sprites/smashed-barrel.png');
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
    // this.setupBarrels();
    this.setupCollisions();
  
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

  public addToMainEnemyGroup(enemy: Enemy) {
    this.enemies.add(enemy);
    this.setupEnemyBulletCollisions(enemy as Enemy);
  }

  // Setup collisions AFTER enemies group and player exist
  private setupCollisions() {
    // Collisions with walls
    if (this.wallsLayer) {
      this.physics.add.collider(this.player, this.wallsLayer); // Player vs Walls
      this.physics.add.collider(this.player.bullets, this.wallsLayer, this.handleBulletPlatformCollision, undefined, this); // Player Bullets vs Walls
      this.physics.add.collider(this.enemies, this.wallsLayer, this.handleEnemyWallCollision, undefined, this); // Enemies vs Walls
    }

    // Collisions involving enemies (using the main group) 
    this.physics.add.collider(this.enemies, this.player.bullets, this.handleEnemyBulletCollision, undefined, this); // Player Bullets vs Enemies

    this.physics.add.overlap(this.player, this.enemies, this.handlePlayerEnemyOverlap, undefined, this); // Player vs Enemies (Overlap for melee)

   
     // Barrel collisions (assuming BarrelManager handles its own group collisions)
    //  this.barrelManager.setupCollisions(); // Ensure BarrelManager collision setup is called
  }

   // Helper to set up collisions for a specific enemy's bullets
 private setupEnemyBulletCollisions(enemyInstance: Enemy) {
  if (enemyInstance instanceof RangedEnemy && enemyInstance.weapon && enemyInstance.weapon.bullets) {
       // Enemy Bullets vs Player
       this.physics.add.collider(this.player, enemyInstance.weapon.bullets, this.handlePlayerBulletCollision, undefined, this); 
       // Enemy Bullets vs Walls
       if (this.wallsLayer) {
           this.physics.add.collider(enemyInstance.weapon.bullets, this.wallsLayer, this.handleBulletPlatformCollision, undefined, this);
       }
   }
  }


 private handleEnemyWallCollision(enemy: any, wall: any) {
    console.log('Enemy collided with wall:', enemy);
    
    const enemyInstance = enemy as Enemy;
    if (enemyInstance.body) {
      const body = enemyInstance.body as Phaser.Physics.Arcade.Body;
      body.setVelocity(0, 0);
      
      this.time.delayedCall(200, () => {
        if (enemyInstance.body && !enemyInstance.isEnemyDead()) {
          enemyInstance.preUpdate(this.time.now, 0);
        }
      });
    }``
  }


  // Handles collision between player bullets and walls/platforms
  private handleBulletPlatformCollision(bullet: any, platform: any) {
    const bulletInstance = bullet as Bullet;
    if (bulletInstance && bulletInstance.active) {
      bulletInstance.deactivate();
    }
  }

  // Handles collision between enemy bullets and the player
  private handlePlayerBulletCollision(player: any, bullet: any) {
    const playerInstance = player as Player;
    const bulletInstance = bullet as Bullet;
    
    if (!playerInstance.active || !bulletInstance.active) {
      return;
    }

    playerInstance.takeDamage(bulletInstance.getDamage());
    bulletInstance.deactivate();
  }
  
  // Handles collision between player bullets and enemies
  private handleEnemyBulletCollision(enemy: any, bullet: any) {
    const enemyInstance = enemy as Enemy;
    const bulletInstance = bullet as Bullet;
    
    if (!enemyInstance.active || !bulletInstance.active) {
      return;
    }
    
    bulletInstance.deactivate();
    enemyInstance.takeDamage(bulletInstance.getDamage());
    
    // If enemy is dead, let the Room check if it's cleared
    if (enemyInstance.isEnemyDead()) {
       // Find which room this enemy belonged to (might need a reference on the enemy)
       // For now, assume it's the current room - this might be inaccurate if enemies wander
       const currentRoom = this.rooms.get(this.currentRoomId);
       if (currentRoom) {
        console.log(`Enemy ${enemyInstance} died in room ${currentRoom.getId()}`);  
          currentRoom.checkCleared(); // Let the room handle door opening etc.
       }
       // Note: No need to remove from the group here, destroy() handles that.
    }
  }

  // Handles overlap between player and enemies (for melee)
  private handlePlayerEnemyOverlap(player: any, enemy: any) {
    const playerInstance = player as Player;
    const enemyInstance = enemy as Enemy;
  
    
    if (enemyInstance.active && !(enemyInstance instanceof RangedEnemy) && enemyInstance.weapon) {
      enemyInstance.weapon.dealDamage(enemyInstance, playerInstance);
    }
  }


  private setupRooms() {
    const map = this.make.tilemap({ key: 'dungeon-map' });
    this.setupRoomsFromTilemap(map);
    this.setupDoors();
  }

  private setupPathfinding() {
    if (this.wallsLayer) {
      const map = this.make.tilemap({ key: 'dungeon-map' });
      this.pathfindingGrid.initialize(this, map, this.wallsLayer);
    }
  }

  private setupBarrels() {
    this.barrelManager.initializeFromPropsLayer();
  }

  setupRoomsFromTilemap(map: Phaser.Tilemaps.Tilemap) {
    // Get room triggers from object layer
    const rooms = map.getObjectLayer('Rooms');
    if (rooms) {
      rooms.objects.filter(obj => obj.name === "Room").forEach(roomObj => {
        this.setupRoom(roomObj);
      });

      rooms.objects.filter(obj => obj.name === "EnemyTrigger").forEach(roomObj => {
        this.setupEnemyTrigger(roomObj);
      });
    } 
    else {
      console.warn("No 'Rooms' layer found in map");
    }
    
    // Get enemy spawn points from object layer
    const enemiesLayer = map.getObjectLayer('Enemies');
    if (enemiesLayer) {
      this.setupEnemies(enemiesLayer);
    } else {
      console.warn("No 'Enemies' layer found in map");
    }
  }

  setupEnemies(enemiesLayer: Phaser.Tilemaps.ObjectLayer) {
    console.log('Enemies layer:', enemiesLayer);
    // Initialize enemy spawn points map
    enemiesLayer.objects.forEach(enemyObj => {
      // Get room ID from properties
      const roomProperty = enemyObj.properties?.find((p: { name: string; value: string }) => p.name === 'Room');
      if (!roomProperty) return;
      
      const roomId = roomProperty.value as string;
      console.log('Room ID:', roomId);

      const room = this.rooms.get(roomId);
      if (room) {
        room.setupEnemies(enemyObj);
      }
    });
  }
  
  setupEnemyTrigger(roomObj: Phaser.Types.Tilemaps.TiledObject) {
    // Get room ID from properties
    const roomProperty = roomObj.properties?.find((p: { name: string; value: string }) => p.name === 'Room');
    if (!roomProperty) return;

    const room = this.rooms.get(roomProperty.value as string);
    if (!room) {
      console.warn('Room not found:', roomProperty.value);
      return;
    }
    room.setupEnemyTrigger(roomObj);    
  }

  setupRoom(roomObj: Phaser.Types.Tilemaps.TiledObject) {
    const room = Room.createFromRoomObject(this, roomObj);
    if (!room) return;
    this.rooms.set(room.getId(), room);
    const zone = room.getZone();
    
    
    // Add overlap detection
    this.physics.add.overlap(this.player, zone, () => {
      this.handleRoomEntry(room.getId());
    });
    
    return;
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

    // Check if room is cleared
    // this.checkRoomCleared();
  }

  
  // checkRoomCleared() {
  //   if (!this.currentRoomId) return;
    
  //   // Only mark as cleared if enemies were spawned and then cleared
  //   if (this.roomEnemiesSpawned.get(this.currentRoomId) && this.enemies.getLength() === 0) {
  //     this.roomCleared.set(this.currentRoomId, true);
      
  //     // Find and open all doors associated with this room
  //     const roomDoors = this.findDoorsByRoomId(this.currentRoomId);
  //     roomDoors.forEach(door => {
  //       if (!door.isDoorOpen()) {
  //         door.open();
  //         console.log(`Opening door ${door.getDoorId()} in room ${this.currentRoomId}`);
  //       }
  //     });
  //   }
  // }


  public anyTargetableObjectsInRoom() {
    const room = this.rooms.get(this.currentRoomId);
    if (!room) return false;
    return room.isEnemiesSpawned() &&  !room.isRoomCleared();
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

  private setupDoors() {
    // Get the RoomTriggers layer from the tilemap
    const roomLayer = this.make.tilemap({ key: 'dungeon-map' }).getObjectLayer('Rooms');
    
    if (!roomLayer) {
      console.error('Rooms layer not found in the tilemap');
      return;
    }
    
    // Find all Door objects in the RoomTriggers layer
    const doorObjects = roomLayer.objects.filter((obj: Phaser.Types.Tilemaps.TiledObject) => obj.name === 'Door');
    
    // Create Door instances for each door object
    doorObjects.forEach((doorObj: Phaser.Types.Tilemaps.TiledObject) => {
      const room = this.rooms.get(doorObj.properties?.find((p: { name: string; value: string }) => p.name === 'Room')?.value as string);
      if (room ) {
        const door = room.setupDoors(doorObj);  
        if (door) {
          const collider = this.physics.add.collider(this.player, door);
          door.setCollider(collider);
        }
      }
    });
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
    return this.barrelManager;
  }
}
