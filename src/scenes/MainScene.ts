import { Scene, Physics, Types } from 'phaser';
import { Player } from '../objects/Player';
import { Enemy } from '../objects/Enemy';
import { Bullet } from '../objects/Bullet';
import { Door, DoorDirection } from '../objects/Door';
import { Room } from '../objects/Room';
import { EnemyFactory, EnemyType } from '../objects/EnemyFactory';

export class MainScene extends Scene {
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private player!: Player;
  private enemies!: Phaser.Physics.Arcade.Group;
  private currentRoom: string = 'room1';
  private gameOver: boolean = false;
  private gameOverText: Phaser.GameObjects.Text | null = null;
  private restartText: Phaser.GameObjects.Text | null = null;
  private healthText: Phaser.GameObjects.Text | null = null;
  private wallsLayer: Phaser.Tilemaps.TilemapLayer | null = null;
  private mousePointer: Phaser.Input.Pointer | null = null;
  
  // Room system
  private rooms: Map<string, Room> = new Map();
  private currentRoomId: string = 'room1';
  
  // Room triggers and enemy spawn points
  private roomTriggers: Map<string, Phaser.GameObjects.Zone> = new Map();
  private enemySpawnPoints: Map<string, Array<{x: number, y: number, type: EnemyType}>> = new Map();
  private roomCleared: Map<string, boolean> = new Map();
  private roomEnemiesSpawned: Map<string, boolean> = new Map();  // Track if enemies were spawned
  private enemyFactory: EnemyFactory;
  
  constructor() {
    super({ key: 'MainScene' });
    this.enemyFactory = new EnemyFactory(this);
  }

  // In MainScene.ts preload method
  preload() {
    this.loadSprite('player-sprite', 'assets/sprites/shooter-sprite.png', 64 , 64 );
    this.loadSprite('ranged-enemy-sprite', 'assets/sprites/enemy-ranged.png', 16, 32);
    this.loadSprite('arrow', 'assets/sprites/arrow.png', 32, 16);

    // Load your tileset image
    this.load.image('tiles-32', 'assets/tiles.png');
    
    // Load your TMJ tilemap - same method as for JSON
    this.load.tilemapTiledJSON('dungeon-map', 'assets/dungeon-32.tmj');  // Updated to use the correct file name
  }

  loadSprite(name: string, path: string, frameWidth: number, frameHeight: number) {  
    this.load.spritesheet(name, path, {
      frameWidth: frameWidth,
      frameHeight: frameHeight
    });
  } 

  create() {
    console.log('Game started!');
    
    const map = this.make.tilemap({ key: 'dungeon-map' });

    const tileset = map.addTilesetImage('tiles-32', 'tiles-32');
    
    
    // Add null checks before creating layers
    if (!tileset) {
      console.error('Failed to load tilesets');
      return;
    }

    // Add fullscreen toggle key
    if (this.input && this.input.keyboard) {
      this.input.keyboard.on('keydown-F', () => {
        if (this.scale.isFullscreen) {
          this.scale.stopFullscreen();
        } else {
          this.scale.startFullscreen();
        }
      });
    }
    
    const floorLayer = map.createLayer('Floor', tileset, 0, 0);
    this.wallsLayer = map.createLayer('Walls', tileset, 0, 0);
   
   
    // Set collision properties for walls
    if (this.wallsLayer) {
      this.wallsLayer.setCollisionFromCollisionGroup();
  
      // Enable physics on the walls layer
      // this.physics.world.createDebugGraphic();
    } else {
      console.error('Walls layer is null');
    }

    // Create player and setup input
    if (this.input && this.input.keyboard) {
      // Setup mouse input for targeting
      this.mousePointer = this.input.activePointer;
      this.input.on('pointerdown', this.handlePointerDown, this);
      this.input.on('pointerup', this.handlePointerUp, this);
      
      this.player = new Player(this, 100, 300);
      console.log('Player created:', this.player);
      
      // Set a smaller hitbox for the player
      const playerBody = this.player.body as Phaser.Physics.Arcade.Body;
      playerBody.setSize(32, 32); // Make hitbox smaller than sprite
      playerBody.setOffset(16, 16); // Center the hitbox
      
      // Add collision between player and walls
      if (this.wallsLayer) {
        this.physics.add.collider(this.player, this.wallsLayer);
        console.log('Added collision between player and walls');
      }
      
      // Listen for player death event
      this.events.on('playerDied', this.handlePlayerDeath, this);
    } else {
      console.error('Keyboard input not available');
      return;
    }
    
  

    // Setup camera to follow player
    this.cameras.main.setBounds(0, 0, 800, 600);
    this.cameras.main.startFollow(this.player);

    // Create the two-room system
   // this.createRooms();
    
    // Setup physics groups
    this.enemies = this.physics.add.group({ classType: Enemy });
    
    // Setup collisions
    this.setupCollisions();

    // Setup room triggers and enemy spawn points from the map
    this.setupRoomsFromTilemap(map);
  }

  
  setupDoorInteractions() {
    
    this.rooms.forEach(room => {
      room.doors.forEach(door => {
        // Add overlap detection with player
        this.physics.add.overlap(
          this.player, 
          door,
          (_, doorObj) => {
            // Cast doorObj to Door type to access its properties
            const doorInstance = doorObj as Door;
            // Only transition if door is open and it's been at least 1000ms since last transition
            if (!this.player.isCurrentlyTeleporting() && doorInstance.isOpen ) {
              this.changeRoom(doorInstance.targetRoomId, doorInstance.direction)  
            }
          },
          undefined,
          this
        );
      });
    });
  }

  changeRoom(newRoomId: string, fromDirection: DoorDirection) {
    console.log('Changing room to', newRoomId, 'from', fromDirection);
    // Don't do anything if already in this room
    if (newRoomId === this.currentRoomId) return;
    
    // Get the new room
    const newRoom = this.rooms.get(newRoomId);
    if (!newRoom) return;
    
    // Hide current room
    const currentRoom = this.rooms.get(this.currentRoomId);
    if (currentRoom) {
      currentRoom.hide();
    }
    
    // Show new room
    newRoom.show();
    
    // Position player at entry point based on direction
    // This positions player just inside the new room at the appropriate door
    const bounds = newRoom.bounds;
    let newX = this.player.x;
    let newY = this.player.y;
    
    // Fix the player positioning based on the door direction
    switch(fromDirection) {
      case DoorDirection.NORTH:
        newY = bounds.y + 40; // Just inside the top of the room
        break;
      case DoorDirection.SOUTH:
        newY = bounds.y + bounds.height - 40; // Just inside the bottom of the room
        break;
      case DoorDirection.EAST:
        newX = bounds.x + 100; // Move further into the room to avoid door overlap
        break;
      case DoorDirection.WEST:
        newX = bounds.x + bounds.width - 40; // Just inside the right side of room
        break;
    }
    
    // Update camera bounds to new room
    this.cameras.main.setBounds(
      bounds.x, 
      bounds.y, 
      bounds.width, 
      bounds.height
    );
    
    // Update current room
    this.currentRoomId = newRoomId;
    
    // Teleport the player to the new position
    this.player.teleport(newX, newY);
  }
  
  setupCollisions() {
    // Add collisions between player bullets and walls
    if (this.wallsLayer) {
      this.physics.add.collider(this.player.bullets, this.wallsLayer, this.handleBulletPlatformCollision, undefined, this);
      this.physics.add.collider(this.enemies, this.wallsLayer);
    }
    
    // Add collisions between player bullets and enemies
    this.physics.add.collider(this.enemies, this.player.bullets, this.handleEnemyBulletCollision, undefined, this);
    
    // Add collisions between player and enemies
    this.physics.add.collider(this.player, this.enemies, (player, enemy) => {
      // Cast to Player and Enemy types
      const playerInstance = player as Player;
      
      // Apply damage to player
      playerInstance.takeDamage(10);
    });
    
    // Add collisions between player and enemy bullets
    this.enemies.getChildren().forEach((enemy) => {
      const enemyInstance = enemy as Enemy;
      if (enemyInstance.bullets) {
        this.physics.add.collider(this.player, enemyInstance.bullets, this.handlePlayerBulletCollision, undefined, this);
        
        // Add collision between player bullets and enemy bullets
        this.physics.add.collider(this.player.bullets, enemyInstance.bullets, (playerBullet, enemyBullet) => {
          // Deactivate both bullets
          (playerBullet as Bullet).deactivate();
          (enemyBullet as Bullet).deactivate();
        });
      }
    });
  }

  setupRoomsFromTilemap(map: Phaser.Tilemaps.Tilemap) {
    // Get room triggers from object layer
    const roomTriggersLayer = map.getObjectLayer('RoomTriggers');
    if (roomTriggersLayer) {
      roomTriggersLayer.objects.forEach(triggerObj => {
        // Get room ID from properties
        const roomProperty = triggerObj.properties?.find((p: { name: string; value: string }) => p.name === 'Room');
        if (!roomProperty) return;
        
        const roomId = roomProperty.value as string;
        
        // Ensure all required properties exist
        if (typeof triggerObj.x !== 'number' || 
            typeof triggerObj.y !== 'number' || 
            typeof triggerObj.width !== 'number' || 
            typeof triggerObj.height !== 'number') {
          console.warn('Invalid trigger object properties:', triggerObj);
          return;
        }
        
        // Create a zone with the same bounds as the trigger object
        const zone = this.add.zone(
          triggerObj.x + (triggerObj.width / 2), 
          triggerObj.y + (triggerObj.height / 2),
          triggerObj.width,
          triggerObj.height
        );
        
        // Enable physics on the zone
        this.physics.world.enable(zone);
        (zone.body as Physics.Arcade.Body).setAllowGravity(false);
        (zone.body as Physics.Arcade.Body).moves = false;
        
        // Store zone by room ID
        this.roomTriggers.set(roomId, zone);
        this.roomCleared.set(roomId, false);
        
        // Add overlap detection
        this.physics.add.overlap(this.player, zone, () => {
          this.handleRoomEntry(roomId);
        });
        
        console.log(`Created room trigger for room ${roomId}`);
      });
    } else {
      console.warn("No 'RoomTriggers' layer found in map");
    }
    
    // Get enemy spawn points from object layer
    const enemiesLayer = map.getObjectLayer('Enemies');
    if (enemiesLayer) {
      // Initialize enemy spawn points map
      enemiesLayer.objects.forEach(enemyObj => {
        // Get room ID from properties
        const roomProperty = enemyObj.properties?.find((p: { name: string; value: string }) => p.name === 'Room');
        if (!roomProperty) return;
        
        const roomId = roomProperty.value as string;
        
        // Ensure position properties exist
        if (typeof enemyObj.x !== 'number' || typeof enemyObj.y !== 'number') {
          console.warn('Invalid enemy object position:', enemyObj);
          return;
        }
        
        // Create entry for this room if it doesn't exist
        if (!this.enemySpawnPoints.has(roomId)) {
          this.enemySpawnPoints.set(roomId, []);
        }
        
        // Add spawn point
        this.enemySpawnPoints.get(roomId)?.push({
          x: enemyObj.x,
          y: enemyObj.y,
          type: this.getEnemyTypeFromProperties(enemyObj.properties)
        });
      });
      
      console.log("Enemy spawn points loaded:", this.enemySpawnPoints);
    } else {
      console.warn("No 'Enemies' layer found in map");
    }
  }

  handleRoomEntry(roomId: string) {
    // If we're already in this room, do nothing
    if (this.currentRoomId === roomId) return;
    
    console.log(`Player entered room ${roomId}`);
    this.currentRoomId = roomId;
    
    // Spawn enemies if room is not cleared
    if (!this.roomCleared.get(roomId)) {
      this.spawnEnemiesInRoom(roomId);
    }
  }

  spawnEnemiesInRoom(roomId: string) {
    const spawnPoints = this.enemySpawnPoints.get(roomId);
    
    if (!spawnPoints || spawnPoints.length === 0) {
      console.log(`No enemy spawn points for room ${roomId}`);
      return;
    }
    
    // Clear any existing enemies
    this.enemies.clear(true, true);
    
    // Spawn new enemies at each spawn point
    spawnPoints.forEach((point, index) => {
      // Use the enemy type from the spawn point
      console.log('Spawning enemy:', point.type);
      const enemy = this.enemyFactory.createEnemy(point.type, point.x, point.y, `enemy_${roomId}_${index}`);
      this.enemies.add(enemy);
      
      // Add collision with walls
      if (this.wallsLayer) {
        this.physics.add.collider(enemy, this.wallsLayer);
      }
      
      // Set up collisions for enemy bullets
      if (enemy.bullets) {
        this.physics.add.collider(this.player, enemy.bullets, this.handlePlayerBulletCollision, undefined, this);
        if (this.wallsLayer) {
          this.physics.add.collider(this.wallsLayer, enemy.bullets, this.handleBulletPlatformCollision, undefined, this);
        }
      }
    });
    
    // Mark that enemies have been spawned in this room
    this.roomEnemiesSpawned.set(roomId, true);
    console.log(`Spawned ${spawnPoints.length} enemies in room ${roomId}`);
  }

  // Handle mouse pointer down for targeting
  private handlePointerDown(pointer: Phaser.Input.Pointer): void {
    if (pointer.leftButtonDown()) {
      // Convert pointer position to world position
      const worldPoint = this.cameras.main.getWorldPoint(pointer.x, pointer.y);
      this.player.startTargeting(worldPoint.x, worldPoint.y);
      
      // Check fire rate before firing
      const currentTime = this.time.now;
      if (currentTime - this.player.lastFired > this.player.fireRate) {
        this.player.fire();
        this.player.lastFired = currentTime;
      }
    }
  }
  
  // Handle mouse pointer up to stop targeting
  private handlePointerUp(pointer: Phaser.Input.Pointer): void {
    if (pointer.leftButtonReleased()) {
      this.player.stopTargeting();
    }
  }
  
  update(time: number, delta: number) {
    if (this.gameOver) {
      return;
    }

    // Update player
    this.player.update();
    
    // Update enemies and their player position tracking
    this.enemies.getChildren().forEach((enemy) => {
      const enemyInstance = enemy as Enemy;
      enemyInstance.updatePlayerPosition(this.player.x, this.player.y);
      enemyInstance.update();
    });
  }

  handleBulletPlatformCollision(bullet: any, platform: any) {
    const bulletInstance = bullet as Bullet;
    if (bulletInstance && bulletInstance.active) {
      bulletInstance.deactivate();
    }
  }

  handlePlayerBulletCollision(player: any, bullet: any) {
    const playerInstance = player as Player;
    const bulletInstance = bullet as Bullet;
    
    if (!playerInstance.active || !bulletInstance.active) {
      return;
    }

    // Always deactivate the bullet
    bulletInstance.deactivate();

    // Apply damage to player
    playerInstance.takeDamage(5);
  }

  handleEnemyBulletCollision(enemy: any, bullet: any) {
    const enemyInstance = enemy as Enemy;
    const bulletInstance = bullet as Bullet;
    
    if (!enemyInstance.active || !bulletInstance.active) {
      return;
    }
    
    // Deactivate the bullet
    bulletInstance.deactivate();
    
    // Apply damage to the enemy
    enemyInstance.takeDamage();
  }

  checkRoomCleared() {
    if (!this.currentRoomId) return;
    
    // Only mark as cleared if enemies were spawned and then cleared
    if (this.roomEnemiesSpawned.get(this.currentRoomId) && this.enemies.getLength() === 0) {
      this.roomCleared.set(this.currentRoomId, true);
      console.log(`Room ${this.currentRoomId} cleared!`);
      
      // Here you could trigger door unlocking or other events
    }
  }

  // Helper method to get enemy type from properties
  private getEnemyTypeFromProperties(properties: any[] | undefined): EnemyType {
    if (!properties) return EnemyType.BASIC;
    
    const typeProperty = properties.find(p => p.name === 'EnemyType');
    if (!typeProperty) return EnemyType.BASIC;
    
    const typeValue = typeProperty.value as string;
    switch (typeValue.toUpperCase()) {
      case 'BASIC':
        return EnemyType.BASIC;
      case 'RANGED':
        return EnemyType.RANGED;
      default:
        console.warn(`Unknown enemy type: ${typeValue}, defaulting to BASIC`);
        return EnemyType.BASIC;
    }
  }

  // Handle player death
  private handlePlayerDeath(): void {
    console.log('Player died!');
    
    // Stop all enemies
    this.enemies.getChildren().forEach((enemy) => {
      const enemyInstance = enemy as Enemy;
      enemyInstance.setActive(false);
      enemyInstance.setVisible(false);
    });
    
    // Show game over text
    this.gameOverText = this.add.text(400, 300, 'GAME OVER', { 
      fontSize: '64px', 
      color: '#ff0000',
      fontFamily: 'Arial'
    }).setOrigin(0.5);
    
    // Add restart instruction
    this.restartText = this.add.text(400, 400, 'Press R to restart', { 
      fontSize: '32px', 
      color: '#ffffff',
      fontFamily: 'Arial'
    }).setOrigin(0.5);
    
    // Add restart key
    if (this.input && this.input.keyboard) {
      this.input.keyboard.on('keydown-R', () => {
        this.scene.restart();
      });
    }
  }
}
