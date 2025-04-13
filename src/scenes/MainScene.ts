import { Scene, Physics, Types } from 'phaser';
import { Player } from '../objects/Player';
import { Enemy } from '../objects/enemy/Enemy';
import { RangedEnemy } from '../objects/enemy/RangedEnemy';
import { Bullet } from '../objects/Bullet';
import { EnemyFactory, EnemyType } from '../objects/enemy/EnemyFactory';
import { Door } from '../objects/Door';

export class MainScene extends Scene {
  private player!: Player;
  private enemies!: Phaser.Physics.Arcade.Group;
  private gameOver: boolean = false;
  private gameOverText: Phaser.GameObjects.Text | null = null;
  private restartText: Phaser.GameObjects.Text | null = null;
  private wallsLayer: Phaser.Tilemaps.TilemapLayer | null = null;
  private mousePointer: Phaser.Input.Pointer | null = null;
  
  // Room system
  private currentRoomId: string = 'room1';
  
  // Room triggers and enemy spawn points
  private roomTriggers: Map<string, Phaser.GameObjects.Zone> = new Map();
  private enemySpawnPoints: Map<string, Array<{x: number, y: number, type: EnemyType | undefined}>> = new Map();
  private roomCleared: Map<string, boolean> = new Map();
  private roomEnemiesSpawned: Map<string, boolean> = new Map();  // Track if enemies were spawned
  private doors: Door[] = [];
  
  constructor() {
    super({ key: 'MainScene' });
  }

  // In MainScene.ts preload method
  preload() {
    this.loadSprite('player-sprite', 'assets/sprites/shooter-sprite.png', 64 , 64 );
    this.loadSprite('skeleton-sprite', 'assets/sprites/skeleton.png', 16, 32);
    this.loadSprite('zombie-sprite', 'assets/sprites/zombie.png', 32, 32);
    this.loadSprite('ninja-sprite', 'assets/sprites/ninja.png', 16, 32 );
    this.loadSprite('arrow', 'assets/sprites/arrow.png', 32, 16);
    this.loadSprite('ninja-star', 'assets/sprites/ninja-star.png', 32, 32);
    // Load your tileset image
    this.load.image('tiles-32', 'assets/tiles.png');
    
    // Load your TMJ tilemap - same method as for JSON
    this.load.tilemapTiledJSON('dungeon-map', 'assets/dungeon-32.tmj');  // Updated to use the correct file name
    this.load.image('door-open', 'assets/sprites/door-open.png');
    this.load.image('door-closed', 'assets/sprites/door-closed.png');
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
    const floorDecorLayer = map.createLayer('FloorDecor', tileset, 0, 0);
    this.wallsLayer = map.createLayer('Walls', tileset, 0, 0);
   
    // Disable grid lines on floor tiles
    if (floorLayer) {
      floorLayer.setAlpha(1);
      floorLayer.setDepth(-1); // Put floor behind other elements
    }
   
    // Set up floor decor layer
    if (floorDecorLayer) {
      floorDecorLayer.setAlpha(1);
      floorDecorLayer.setDepth(-0.5); // Put floor decor between floor and walls
    }
   
    // Set collision properties for walls
    if (this.wallsLayer) {
      this.wallsLayer.setCollisionFromCollisionGroup();
  
      // Enable physics debug graphics
      // this.physics.world.createDebugGraphic();
    } else {
      console.error('Walls layer is null');
    }

    // Create player and setup input
    if (this.input && this.input.keyboard) {
      // Setup mouse input for targeting
      this.mousePointer = this.input.activePointer;
      
      this.player = new Player(this, 100,300);
      
      // this.player = new Player(this, 880, 320);
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
    this.cameras.main.setBounds(0, 0, 1600, 1200);
    this.cameras.main.startFollow(this.player);
    
    // Set physics world bounds to match camera bounds
    this.physics.world.setBounds(0, 0, 1600, 1200);

    // Create the two-room system
   // this.createRooms();
    
    // Setup physics groups
    this.enemies = this.physics.add.group({ classType: Enemy });
    
    // Setup collisions
    this.setupCollisions();

    // Setup room triggers and enemy spawn points from the map
    this.setupRoomsFromTilemap(map);
    this.setupDoors();
  }


  setupCollisions() {
    // Add collisions between player bullets and walls
    if (this.wallsLayer) {
      this.physics.add.collider(this.player.bullets, this.wallsLayer, this.handleBulletPlatformCollision, undefined, this);
      
      // Add collision between enemies and walls with a callback to handle the collision
      this.physics.add.collider(this.enemies, this.wallsLayer, (enemy, wall) => {
        // When an enemy collides with a wall, we can add special handling here if needed
        console.log('Enemy collided with wall:', enemy);
        
        // Force the enemy to stop moving when it hits a wall
        const enemyInstance = enemy as Enemy;
        if (enemyInstance.body) {
          // Cast to Arcade.Body to access setVelocity
          const body = enemyInstance.body as Phaser.Physics.Arcade.Body;
          body.setVelocity(0, 0);
          
          // After a short delay, try to find an alternative path
          this.time.delayedCall(200, () => {
            if (enemyInstance.body && !enemyInstance.isEnemyDead()) {
              // Let the enemy's updateMovement method handle finding an alternative path
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
      // Cast to Player and Enemy types
      const playerInstance = player as Player;
      const enemyInstance = enemy as Enemy;
      
      // Only apply damage if the enemy is a MeleeEnemy and has a weapon
      if (!(enemyInstance instanceof RangedEnemy) && enemyInstance.weapon) {
        // Use the weapon's dealDamage method
        enemyInstance.weapon.dealDamage(enemyInstance, playerInstance);
      }
    });
    
    // Add collisions between player and enemy bullets
    this.enemies.getChildren().forEach((enemy) => {
      const enemyInstance = enemy as Enemy;
      if (enemyInstance instanceof RangedEnemy && enemyInstance.weapon && enemyInstance.weapon.bullets) {
        this.physics.add.collider(this.player, enemyInstance.weapon.bullets, this.handlePlayerBulletCollision, undefined, this);
        
        // Add collision between player bullets and enemy bullets
        this.physics.add.collider(this.player.bullets, enemyInstance.weapon.bullets, (playerBullet, enemyBullet) => {
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
        // Only process objects with name "EnemyTrigger"
        if (triggerObj.name !== "EnemyTrigger") {
          return;
        }
        
        // Get room ID from properties
        const roomProperty = triggerObj.properties?.find((p: { name: string; value: string }) => p.name === 'Room');
        if (!roomProperty) return;
        
        const roomId = roomProperty.value as string;
        console.log('Room ID:', roomId);
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
      console.log('Enemies layer:', enemiesLayer);
      // Initialize enemy spawn points map
      enemiesLayer.objects.forEach(enemyObj => {
        // Get room ID from properties
        const roomProperty = enemyObj.properties?.find((p: { name: string; value: string }) => p.name === 'Room');
        if (!roomProperty) return;
        
        const roomId = roomProperty.value as string;
        console.log('Room ID:', roomId);

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
      console.log('Enemy spawn points loaded:', this.enemySpawnPoints);
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
      // Skip if no enemy type is specified
      if (!point.type) {
        console.log(`Skipping enemy spawn point ${index} in room ${roomId} - no type specified`);
        return;
      }

      // Use the enemy type from the spawn point
      console.log('Spawning enemy:', point.type);
      
      const enemy = EnemyFactory.createEnemy(this, point.type, point.x, point.y, `enemy_${roomId}_${index}`);
      enemy.setPlayer(this.player);

      this.enemies.add(enemy);
      
      // Note: We don't need to add individual collisions with walls here
      // as we've already set up a group collision in setupCollisions()
      
      // Set up collisions for enemy bullets if it's a RangedEnemy
      if (enemy instanceof RangedEnemy && enemy.weapon && enemy.weapon.bullets) {
        this.physics.add.collider(this.player, enemy.weapon.bullets, this.handlePlayerBulletCollision, undefined, this);
        if (this.wallsLayer) {
          this.physics.add.collider(this.wallsLayer, enemy.weapon.bullets, this.handleBulletPlatformCollision, undefined, this);
        }
      }
    });
    
    // Mark that enemies have been spawned in this room
    this.roomEnemiesSpawned.set(roomId, true);
    console.log(`Spawned ${spawnPoints.length} enemies in room ${roomId}`);
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
    this.checkRoomCleared();
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

    // Apply damage to player from enemy bullet
    playerInstance.takeDamage(bulletInstance.getDamage());
    
    // Deactivate the bullet
    bulletInstance.deactivate();
  }

  handleEnemyBulletCollision(enemy: any, bullet: any) {
    const enemyInstance = enemy as Enemy;
    const bulletInstance = bullet as Bullet;
    
    if (!enemyInstance.active || !bulletInstance.active) {
      return;
    }
    
    // Deactivate the bullet
    bulletInstance.deactivate();
    
    // Apply damage from the bullet
    enemyInstance.takeDamage(bulletInstance.getDamage());
    
    // If enemy is dead, remove it from the group
    if (enemyInstance.isEnemyDead()) {
      this.enemies.remove(enemyInstance, true, true);
      // Check if room is cleared after enemy is removed
      this.checkRoomCleared();
    }
  }

  checkRoomCleared() {
    if (!this.currentRoomId) return;
    
    // Only mark as cleared if enemies were spawned and then cleared
    if (this.roomEnemiesSpawned.get(this.currentRoomId) && this.enemies.getLength() === 0) {
      this.roomCleared.set(this.currentRoomId, true);
      
      // Find and open all doors associated with this room
      const roomDoors = this.findDoorsByRoomId(this.currentRoomId);
      roomDoors.forEach(door => {
        if (!door.isDoorOpen()) {
          door.open();
          console.log(`Opening door ${door.getDoorId()} in room ${this.currentRoomId}`);
        }
      });
    }
  }

  // Helper method to get enemy type from properties
  private getEnemyTypeFromProperties(properties: any[] | undefined): EnemyType | undefined {
    return properties?.find(p => p.name === 'Type')?.value?.toUpperCase() as EnemyType | undefined;
  }

  // Handle player death
  private handlePlayerDeath(): void {
    console.log('Player died!');
    
    // Destroy all enemies and remove them from the scene
    this.enemies.clear(true, true);
    
    // Get player's death position
    const playerX = this.player.x;
    const playerY = this.player.y;
    
    // Create a semi-transparent overlay at the player's death location
    const overlay = this.add.rectangle(playerX, playerY, 300, 200, 0x000000, 0.7);
    overlay.setOrigin(0.5);
    overlay.setDepth(100); // Ensure it's above other elements
    
    // Show game over text at player's death location
    this.gameOverText = this.add.text(playerX, playerY - 30, 'GAME OVER', { 
      fontSize: '64px', 
      color: '#ff0000',
      fontFamily: 'Arial'
    }).setOrigin(0.5).setDepth(101);
    
    // Add restart instruction
    this.restartText = this.add.text(playerX, playerY + 30, 'Press R to restart', { 
      fontSize: '32px', 
      color: '#ffffff',
      fontFamily: 'Arial'
    }).setOrigin(0.5).setDepth(101);
    
    // Add restart key
    if (this.input && this.input.keyboard) {
      this.input.keyboard.on('keydown-R', () => {
        this.scene.restart();
      });
    }
    
    // Set game over flag
    this.gameOver = true;
  }

  private setupDoors() {
    // Get the RoomTriggers layer from the tilemap
    const roomTriggersLayer = this.make.tilemap({ key: 'dungeon-map' }).getObjectLayer('RoomTriggers');
    
    if (!roomTriggersLayer) {
      console.error('RoomTriggers layer not found in the tilemap');
      return;
    }
    console.log('RoomTriggers layer:', roomTriggersLayer);
    
    // Find all Door objects in the RoomTriggers layer
    const doorObjects = roomTriggersLayer.objects.filter((obj: Phaser.Types.Tilemaps.TiledObject) => obj.name === 'Door');
    
    // Create Door instances for each door object
    doorObjects.forEach((doorObj: Phaser.Types.Tilemaps.TiledObject) => {
      console.log('Door object:', doorObj);
      // Get the door properties
      const isOpen = doorObj.properties.find((prop: { name: string; value: any }) => prop.name === 'Open')?.value === 1;
      const roomId = doorObj.properties.find((prop: { name: string; value: any }) => prop.name === 'Room')?.value || 'unknown';
      const doorId = doorObj.properties.find((prop: { name: string; value: any }) => prop.name === 'id')?.value || 'unknown';
      
      // Create a new Door instance
      const door = new Door(
        this,
        (doorObj.x || 0) + (doorObj.width || 0) / 2, // Center the door horizontally
        (doorObj.y || 0) + (doorObj.height || 0) / 2, // Center the door vertically
        isOpen,
        roomId,
        doorId
      );
      
      console.log('Adding door:', door);
      // Add the door to our doors array
      this.doors.push(door);
      
      // If the door is closed, add physics body and collision with player
      if (!isOpen) {
        // Enable physics on the door
        this.physics.world.enable(door);
        
        // Set up the physics body
        const doorBody = door.body as Phaser.Physics.Arcade.Body;
        doorBody.setImmovable(true);
        doorBody.setSize(doorObj.width || 32, doorObj.height || 32);
        
        // Add collision between player and closed door
        const collider = this.physics.add.collider(this.player, door);
        door.setCollider(collider);
      }
      
      console.log(`Created door: ${doorId} in room: ${roomId}, isOpen: ${isOpen}`);
    });
  }
  
  // Method to get all doors
  public getDoors(): Door[] {
    return this.doors;
  }
  
  // Method to find a door by ID
  public findDoorById(doorId: string): Door | undefined {
    return this.doors.find(door => door.getDoorId() === doorId);
  }
  
  // Method to find doors by room ID
  public findDoorsByRoomId(roomId: string): Door[] {
    return this.doors.filter(door => door.getRoomId() === roomId);
  }

}
