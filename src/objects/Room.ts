import { Scene, GameObjects, Physics, Types } from 'phaser';
import { Enemy } from './enemy/Enemy';
import { Door, DoorDirection } from './Door';
import { EnemyFactory, EnemyType } from './enemy/EnemyFactory';
import { MainScene } from '../scenes/MainScene';

export class Room {
private scene: MainScene;
  private id: string;
  private zone: GameObjects.Zone;
  private enemyTriggerZone: GameObjects.Zone | null = null;
  private enemies: Enemy[] = [];
 
  private doors: Door[] = [];
  private isCleared: boolean = false;
  private enemiesSpawned: boolean = false;
  private spawnPoints: Array<{x: number, y: number, type: EnemyType | undefined}> = [];

  constructor(
    scene: Scene,
    id: string,
    x: number,
    y: number,
    width: number,
    height: number
  ) {
    this.scene = scene as MainScene;
    this.id = id;
    
    // Create the room zone
    this.zone = scene.add.zone(
      x + (width / 2),
      y + (height / 2),
      width,
      height
    );
    
    // Enable physics on the zone
    scene.physics.world.enable(this.zone);
    const body = this.zone.body as Physics.Arcade.Body;
    body.setAllowGravity(false);
    body.moves = false;

  }

  /**
   * Creates a Room instance from a tilemap object
   * @param scene The Phaser scene
   * @param roomObj The tilemap object containing room data
   * @returns A new Room instance or null if the object is invalid
   */
  public static createFromTilemapObject(scene: Scene, roomObj: Types.Tilemaps.TiledObject): Room | null {
    // Get room ID from properties
    const roomProperty = roomObj.properties?.find((p: { name: string; value: string }) => p.name === 'Room');
    if (!roomProperty) {
      console.warn('Room object missing Room property');
      return null;
    }
    
    const roomId = roomProperty.value;
    console.log('Creating room with ID:', roomId);
    
    // Ensure all required properties exist
    if (typeof roomObj.x !== 'number' || 
        typeof roomObj.y !== 'number' || 
        typeof roomObj.width !== 'number' || 
        typeof roomObj.height !== 'number') {
      console.warn('Invalid room object properties:', roomObj);
      return null;
    }
    
    // Create the room
    return new Room(
      scene,
      roomId,
      roomObj.x,
      roomObj.y,
      roomObj.width,
      roomObj.height
    );
  }

  /**
   * Creates a Room instance from an enemy trigger object
   * @param scene The Phaser scene
   * @param obj The tilemap object containing trigger data
   * @returns A new Room instance or null if the object is invalid
   */
  public static createFromRoomObject(scene: Scene, obj: Types.Tilemaps.TiledObject): Room | null {
    // Get room ID from properties
    const roomProperty = obj.properties?.find((p: { name: string; value: string }) => p.name === 'Room');
    if (!roomProperty) {
      console.warn('Trigger object missing Room property');
      return null;
    }
    
    const roomId = roomProperty.value;
    console.log('Creating Room with ID:', roomId);
    
    // Ensure all required properties exist
    if (typeof obj.x !== 'number' || 
        typeof obj.y !== 'number' || 
        typeof obj.width !== 'number' || 
        typeof obj.height !== 'number') {
      console.warn('Invalid trigger object properties:', obj);
      return null;
    }
    
    // Create the room
    return new Room(
      scene,
      roomId,
      obj.x,
      obj.y,
      obj.width,
      obj.height
    );
  }

  public setupEnemyTrigger(obj: Phaser.Types.Tilemaps.TiledObject) {
    if (typeof obj.x !== 'number' || 
        typeof obj.y !== 'number' || 
        typeof obj.width !== 'number' || 
        typeof obj.height !== 'number') {
      console.warn('Invalid trigger object properties:', obj);
      return;
    }
    
    // Create a zone with the same bounds as the trigger object
    this.enemyTriggerZone = this.scene.add.zone(
      obj.x + (obj.width / 2), 
      obj.y + (obj.height / 2),
      obj.width,
      obj.height
    );
    
    // Enable physics on the zone
    this.scene.physics.world.enable(this.enemyTriggerZone);
    (this.enemyTriggerZone.body as Physics.Arcade.Body).setAllowGravity(false);
    (this.enemyTriggerZone.body as Physics.Arcade.Body).moves = false;
    
    if (this.scene.getPlayer()) {  
        this.scene.physics.add.overlap(this.scene.getPlayer(), this.enemyTriggerZone, () => {
            // Only spawn enemies if room is not cleared, but don't update currentRoomId
            if (!this.isRoomCleared()) {
              this.spawnEnemies();
            }
        });
    }
    console.log('Enemy trigger zone created:', this.enemyTriggerZone);
      
  }

  public setupEnemies(obj: Phaser.Types.Tilemaps.TiledObject) {
      // Ensure position properties exist
      if (typeof obj.x !== 'number' || typeof obj.y !== 'number') {
        console.warn('Invalid enemy object position:', obj);
        return;
      }
      
      // Add spawn point
      this.spawnPoints.push({
        x: obj.x,
        y: obj.y,
        type: this.getEnemyTypeFromProperties(obj.properties)
      });
    
  }

  public setupDoors(obj: Phaser.Types.Tilemaps.TiledObject) {
    // Get the door properties
    const isOpen = obj.properties.find((prop: { name: string; value: any }) => prop.name === 'Open')?.value === 1;
    const roomId = obj.properties.find((prop: { name: string; value: any }) => prop.name === 'Room')?.value || 'unknown';
    const doorId = obj.properties.find((prop: { name: string; value: any }) => prop.name === 'id')?.value || 'unknown';
    const directionProp = obj.properties.find((prop: { name: string; value: any }) => prop.name === 'Direction');
    let direction = DoorDirection.East; // Default direction
    
    if (directionProp) {
      switch (directionProp.value) {
        case 'East':
          direction = DoorDirection.East;
          break;
        case 'South':
          direction = DoorDirection.South;
          break;
        case 'West':
          direction = DoorDirection.West;
          break;
        case 'North':
          direction = DoorDirection.North;
          break;
      }
    }
    
    // Create a new Door instance with direction
    const door = new Door(
      this.scene,
      (obj.x || 0) + (obj.width || 0) / 2, // Center the door horizontally
      (obj.y || 0) + (obj.height || 0) / 2, // Center the door vertically
      isOpen,
      roomId,
      doorId,
      direction
    );
    
    this.doors.push(door);
    
    return door;  
  }
  

  // Helper method to get enemy type from properties
  private getEnemyTypeFromProperties(properties: any[] | undefined): EnemyType | undefined {
    return properties?.find(p => p.name === 'Type')?.value?.toUpperCase() as EnemyType | undefined;
  }

  public getId(): string {
    return this.id;
  }


  public getZone(): GameObjects.Zone {
    return this.zone;
  }

  public addSpawnPoint(x: number, y: number, type: EnemyType | undefined): void {
    this.spawnPoints.push({ x, y, type });
  }

  public addDoor(door: Door): void {
    this.doors.push(door);
  }

  public getDoors(): Door[] {
    return this.doors;
  }

  public spawnEnemies(): void {
    if (this.enemiesSpawned || this.isCleared) {
      return;
    }

    console.log(`Spawning enemies in room ${this.id}`);
    
    // Clear any existing enemies
    this.enemies = [];

    // Spawn new enemies at each spawn point
    this.spawnPoints.forEach((point, index) => {
      if (!point.type) {
        console.log(`Skipping enemy spawn point ${index} in room ${this.id} - no type specified`);
        return;
      }

      console.log('Spawning enemy:', point.type);
      
      const enemy = EnemyFactory.createEnemy(
        this.scene,
        point.type,
        point.x,
        point.y,
        `enemy_${this.id}_${index}`
      );
      
      enemy.setPlayer(this.scene.getPlayer());
      this.enemies.push(enemy);
      this.scene.addToMainEnemyGroup(enemy);
    })

     this.enemiesSpawned = true;
  }

  public isEnemiesSpawned(): boolean {
    return this.enemiesSpawned;
  }

  public checkCleared(): boolean {
    if (!this.enemiesSpawned) {
      return false;
    }

    const allEnemiesDead = this.enemies.every(enemy => enemy.isEnemyDead());
    if (allEnemiesDead && !this.isCleared) {
      this.isCleared = true;
      this.openDoors();
      this.enemies = [];
      return true;
    }

    return this.isCleared;
  }

  private openDoors(): void {
    this.doors.forEach(door => {
      if (!door.isDoorOpen()) {
        door.open();
        console.log(`Opening door ${door.getDoorId()} in room ${this.id}`);
      }
    });
  }

  public isRoomCleared(): boolean {
    return this.isCleared;
  }

  public getEnemies(): Enemy[] {
    return this.enemies;
  }

  public destroy(): void {
    this.enemies = [];
    this.zone.destroy();
  }
} 