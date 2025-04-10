import { Scene, Physics, Types } from 'phaser';
import { Player } from '../objects/Player';
import { Enemy } from '../objects/Enemy';
import { Bullet } from '../objects/Bullet';
import { Door, DoorDirection } from '../objects/Door';
import { Room } from '../objects/Room';
import { EnemyFactory, EnemyType } from '../objects/EnemyFactory';

export class MainScene extends Scene {
  private player!: Player;
  private cursors!: Types.Input.Keyboard.CursorKeys;
  private enemies!: Physics.Arcade.Group;
  private bullets!: Physics.Arcade.Group;
  private enemyLastFired: { [key: string]: number } = {};
  private playerHit: boolean = false;
  private wallsLayer!: Phaser.Tilemaps.TilemapLayer | null;
  
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
    this.load.spritesheet('player-sprite', 'assets/sprites/player.png', {
      frameWidth: 16,
      frameHeight: 32 
    });
    // Load your tileset image
    this.load.image('dungeon-tiles', 'assets/tiles/0x72_DungeonTilesetII_v1.7/0x72_DungeonTilesetII_v1.7.png');
    this.load.image('atlas_walls_high-16x32', 'assets/tiles/0x72_DungeonTilesetII_v1.7/atlas_walls_high-16x32.png');
    
    // Load your TMJ tilemap - same method as for JSON
    this.load.tilemapTiledJSON('dungeon-map', 'assets/dungeon.tmj');  // Updated to use the correct file name
  }

  create() {
    console.log('Game started!');
    
    const map = this.make.tilemap({ key: 'dungeon-map' });
    
    const tileset = map.addTilesetImage('dungeon-tiles', 'dungeon-tiles');
    const wallsTileset = map.addTilesetImage('atlas_walls_high-16x32', 'atlas_walls_high-16x32');
    
    
    // Add null checks before creating layers
    if (!tileset || !wallsTileset) {
      console.error('Failed to load tilesets');
      return;
    }

    
    const floorLayer = map.createLayer('Floor', tileset, 0, 0);
    this.wallsLayer = map.createLayer('Walls', wallsTileset, 0, 0);
    const wallEdgesLayer = map.createLayer('WallEdges', wallsTileset, 0, 0);
    console.log('Wall edges layer created:', wallEdgesLayer);
    const doorsLayer = map.createLayer('Doors', tileset, 0, 0);
   
   
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
      // Create cursor keys
      this.cursors = this.input.keyboard.createCursorKeys();
      
    
      
      this.player = new Player(this, 100, 300, this.cursors);
      console.log('Player created:', this.player);
      
      // Add collision between player and walls
      if (this.wallsLayer) {
        this.physics.add.collider(this.player, this.wallsLayer);
        console.log('Added collision between player and walls');
      }
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
    this.bullets = this.physics.add.group({ classType: Bullet, maxSize: 30, runChildUpdate: true });
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
    // Add collisions between bullets and walls
    if (this.wallsLayer) {
      this.physics.add.collider(this.bullets, this.wallsLayer, this.handleBulletPlatformCollision, undefined, this);
      this.physics.add.collider(this.enemies, this.wallsLayer);

    }
    
    // Add collisions between bullets and player
    this.physics.add.collider(this.player, this.bullets, this.handlePlayerBulletCollision, undefined, this);
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
      const enemy = this.enemyFactory.createEnemy(point.type, point.x, point.y, `enemy_${roomId}_${index}`);
      this.enemies.add(enemy);
      
      // Add collision with walls
      if (this.wallsLayer) {
        this.physics.add.collider(enemy, this.wallsLayer);
      }
    });
    
    // Mark that enemies have been spawned in this room
    this.roomEnemiesSpawned.set(roomId, true);
    console.log(`Spawned ${spawnPoints.length} enemies in room ${roomId}`);
  }

  update(time: number, delta: number) {
    // Check if current room is cleared
    this.checkRoomCleared();
    
    if (!this.playerHit) {
      this.enemies.getChildren().forEach((enemy) => {
        const enemyInstance = enemy as Enemy;
        const enemyBody = enemyInstance.body as Physics.Arcade.Body;
        if (!enemyInstance.active || !enemyBody) return;

        const distance = Phaser.Math.Distance.Between(enemyInstance.x, enemyInstance.y, this.player.x, this.player.y);
        const angleToPlayer = Phaser.Math.Angle.Between(enemyInstance.x, enemyInstance.y, this.player.x, this.player.y);
        const minDistance = 150;
        const maxDistance = 350;

        if (distance < minDistance) {
          enemyBody.setVelocity(-Math.cos(angleToPlayer) * 100, -Math.sin(angleToPlayer) * 100);
        } else if (distance > maxDistance) {
          enemyBody.setVelocity(Math.cos(angleToPlayer) * 100, Math.sin(angleToPlayer) * 100);
        } else {
          enemyBody.setVelocity(0);
        }
        
        if (distance > minDistance && distance < maxDistance) {
          const enemyId = enemyInstance.id;
          const now = time;
          if (!this.enemyLastFired[enemyId] || now - this.enemyLastFired[enemyId] > 2000) {
            this.enemyShoot(enemyInstance, angleToPlayer);
            this.enemyLastFired[enemyId] = now;
          }
        }
      });
    }
  }

  enemyShoot(enemy: Enemy, angle: number) {
    const bullet = this.bullets.get() as Bullet;
    if (bullet) {
      bullet.fire(enemy.x, enemy.y, angle);
    }
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

    // If player is already hit, just return (bullet is already deactivated)
    if (this.playerHit) {
      return;
    }

    playerInstance.setPosition(100, 300);
    (playerInstance.body as Physics.Arcade.Body).setVelocity(0);

    this.playerHit = true;
    playerInstance.setAlpha(0.5);
    this.tweens.add({
        targets: playerInstance,
        alpha: 1,
        duration: 100,
        yoyo: true,
        repeat: 9,
        onComplete: () => {
          playerInstance.setAlpha(1);
        }
    });
    
    this.time.delayedCall(2000, () => {
      this.playerHit = false;
    });
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
}
