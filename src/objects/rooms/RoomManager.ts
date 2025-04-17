import { Types, Physics, Scene } from "phaser";
import { Room } from "./Room";
import { Door } from "../Door";
import { DoorDirection } from "../Door";
import { Player } from "../player/Player";

export class RoomManager {
  private scene: Scene;
  private rooms: Map<string, Room>;
  private currentRoom: Room | null = null;  
  private player: Player;
  constructor(scene:  Scene, player: Player) {
    this.scene = scene;
    this.player = player;
    this.rooms = new Map();

  }

  public initializeRooms(roomLayer: Phaser.Tilemaps.ObjectLayer): void {
    if (roomLayer) {
      roomLayer.objects.filter(obj => obj.name === "Room").forEach(roomObj => {
        const room = this.createFromTilemapObject(roomObj);
        if (room) {
          this.rooms.set(room.getId(), room);
          this.scene.physics.add.overlap(this.player, room.getZone(), () => {
            this.handleRoomEntry(room);
          });
        }
      });

      this.currentRoom = this.rooms.get("1") || null;

      roomLayer.objects.filter(obj => obj.name === "EnemyTrigger").forEach(triggerObj => {
        const roomProperty = triggerObj.properties?.find((p: { name: string; value: string }) => p.name === 'Room');
        if (!roomProperty) return;
        const room = this.rooms.get(roomProperty.value as string);
        if (room) {
          this.setupEnemyTrigger(triggerObj, room);
        }
      });

      roomLayer.objects.filter(obj => obj.name === "Door").forEach(doorObj => {
        const roomProperty = doorObj.properties?.find((p: { name: string; value: string }) => p.name === 'Room');
        if (!roomProperty) return;
        const room = this.rooms.get(roomProperty.value as string);
        if (room) {
          this.setupDoor(doorObj, room);
        }
      });
    } else {
      console.warn("No 'Rooms' layer found in map");
    }
  }

  private createFromTilemapObject(roomObj: Types.Tilemaps.TiledObject): Room | null {
    const roomProperty = roomObj.properties?.find((p: { name: string; value: string }) => p.name === 'Room');
    if (!roomProperty) {
      console.warn('Room object missing Room property');
      return null;
    }
    
    const roomId = roomProperty.value;
    console.log('Creating room with ID:', roomId);
    
    if (typeof roomObj.x !== 'number' || 
        typeof roomObj.y !== 'number' || 
        typeof roomObj.width !== 'number' || 
        typeof roomObj.height !== 'number') {
      console.warn('Invalid room object properties:', roomObj);
      return null;
    }
    
    return new Room(
      this.scene,
      roomId,
      roomObj.x,
      roomObj.y,
      roomObj.width,
      roomObj.height
    );
  }

  private setupEnemyTrigger(obj: Phaser.Types.Tilemaps.TiledObject, room: Room): void {
    if (typeof obj.x !== 'number' || 
        typeof obj.y !== 'number' || 
        typeof obj.width !== 'number' || 
        typeof obj.height !== 'number') {
      console.warn('Invalid trigger object properties:', obj);
      return;
    }
    
    const zone = this.scene.add.zone(
      obj.x + (obj.width / 2), 
      obj.y + (obj.height / 2),
      obj.width,
      obj.height
    );
    room.setEnemyTriggerZone(zone);

    this.scene.physics.world.enable(zone);
    (zone.body as Physics.Arcade.Body).setAllowGravity(false);
    (zone.body as Physics.Arcade.Body).moves = false;
    
    if (this.player) {  
      this.scene.physics.add.overlap(this.player, zone, () => {
        if (!room.isRoomCleared()) {
          room.spawnEnemies();
        }
      });
    }
    console.log('Enemy trigger zone created:', zone);   
  }

  private setupDoor(obj: Phaser.Types.Tilemaps.TiledObject, room: Room): void {
    const isOpen = obj.properties.find((prop: { name: string; value: any }) => prop.name === 'Open')?.value === 1;
    const roomId = obj.properties.find((prop: { name: string; value: any }) => prop.name === 'Room')?.value || 'unknown';
    const directionProp = obj.properties.find((prop: { name: string; value: any }) => prop.name === 'Direction');
    let direction = DoorDirection.East;

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
    
    const door = new Door(
      this.scene,
      (obj.x || 0) + (obj.width || 0) / 2,
      (obj.y || 0) + (obj.height || 0) / 2,
      isOpen,
      roomId,
      direction
    );

    // Add collision with player if door is closed
    if (!isOpen) {
      const collider = this.scene.physics.add.collider(this.player, door);
      door.setCollider(collider);
    }

    room.addDoor(door);
  }

  public setupSpawnPoints(enemiesLayer: Phaser.Tilemaps.ObjectLayer): void {
    enemiesLayer.objects.forEach(enemyObj => {
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


  private handleRoomEntry(room: Room) {
    // If we're already in this room, do nothing
    if (this.currentRoom === room) return;
    
    console.log(`Player entered room ${room.getId()}`);
    this.currentRoom = room;
  }

  public getRooms(): Map<string, Room> {
    return this.rooms;
  }

  public getRoom(roomId: string): Room | undefined {
    return this.rooms.get(roomId);
  }

  public getCurrentRoom(): Room | null {
    return this.currentRoom;
  }

  public anyEnemiesInRoom(): boolean {
    if (!this.currentRoom) return false;
    return (this.currentRoom?.isEnemiesSpawned() &&  !this.currentRoom?.isRoomCleared());
  }

  public destroy(): void {
    this.rooms.forEach(room => room.destroy());
    this.rooms.clear();
  }
} 