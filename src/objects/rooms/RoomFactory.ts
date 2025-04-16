import { Scene, Types, Physics} from "phaser";
import { Room } from "./Room";
import { MainScene } from "../../scenes/MainScene";
import { Door } from "../Door";
import { DoorDirection } from "../Door";
export class RoomFactory {

  
  static createRooms(scene: MainScene, roomLayer: Phaser.Tilemaps.ObjectLayer): Map<string, Room> {
    const rooms: Map<string, Room> = new Map();

    if (roomLayer) {
      roomLayer.objects.filter(obj => obj.name === "Room").forEach(roomObj => {
        const room = RoomFactory.createFromTilemapObject(scene, roomObj);
        if (room) {
          rooms.set(room.getId(), room);
          scene.physics.add.overlap(scene.getPlayer(), room.getZone(), () => {
            scene.handleRoomEntry(room.getId());
          });
        }
      });

      roomLayer.objects.filter(obj => obj.name === "EnemyTrigger").forEach(triggerObj => {
        const roomProperty = triggerObj.properties?.find((p: { name: string; value: string }) => p.name === 'Room');
        if (!roomProperty) return;
        const room = rooms.get(roomProperty.value as string);
        if (room) {
          RoomFactory.setupEnemyTrigger(scene, triggerObj, room);
        }
      });

      roomLayer.objects.filter(obj => obj.name === "Door").forEach(doorObj => {
        const roomProperty = doorObj.properties?.find((p: { name: string; value: string }) => p.name === 'Room');
        if (!roomProperty) return;
        const room = rooms.get(roomProperty.value as string);
        if (room) {
          RoomFactory.setupDoor(scene, doorObj, room);
        }
      });
    
    } 
    else {
      console.warn("No 'Rooms' layer found in map");
    }

    return rooms
  }

  static createFromTilemapObject(scene: Scene, roomObj: Types.Tilemaps.TiledObject): Room | null {
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

  static setupEnemyTrigger(scene: MainScene, obj: Phaser.Types.Tilemaps.TiledObject, room: Room) {
    if (typeof obj.x !== 'number' || 
        typeof obj.y !== 'number' || 
        typeof obj.width !== 'number' || 
        typeof obj.height !== 'number') {
      console.warn('Invalid trigger object properties:', obj);
      return;
    }
    
    // Create a zone with the same bounds as the trigger object
    const zone = scene.add.zone(
      obj.x + (obj.width / 2), 
      obj.y + (obj.height / 2),
      obj.width,
      obj.height
    );
    room.setEnemyTriggerZone(zone);

    // Enable physics on the zone
    scene.physics.world.enable(zone);
    (zone.body as Physics.Arcade.Body).setAllowGravity(false);
    (zone.body as Physics.Arcade.Body).moves = false;
    
    if (scene.getPlayer()) {  
        scene.physics.add.overlap(scene.getPlayer(), zone, () => {
            // Only spawn enemies if room is not cleared, but don't update currentRoomId
            if (!room.isRoomCleared()) {
              room.spawnEnemies();
            }
        });
    }
    console.log('Enemy trigger zone created:', zone);   
  }

  static setupDoor(scene: MainScene, obj: Phaser.Types.Tilemaps.TiledObject, room: Room) {
        // Get the door properties
    const isOpen = obj.properties.find((prop: { name: string; value: any }) => prop.name === 'Open')?.value === 1;
    const roomId = obj.properties.find((prop: { name: string; value: any }) => prop.name === 'Room')?.value || 'unknown';
    const directionProp = obj.properties.find((prop: { name: string; value: any }) => prop.name === 'Direction');
    let direction = DoorDirection.East; // Default direction
    console.log('Direction:', directionProp);
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
      scene,
      (obj.x || 0) + (obj.width || 0) / 2, // Center the door horizontally
      (obj.y || 0) + (obj.height || 0) / 2, // Center the door vertically
      isOpen,
      roomId,
      direction
    );
    room.addDoor(door);
  }

  static setupSpawnPoints(enemiesLayer: Phaser.Tilemaps.ObjectLayer, rooms: Map<string, Room>) {
      // Initialize enemy spawn points map
      enemiesLayer.objects.forEach(enemyObj => {
        // Get room ID from properties
        const roomProperty = enemyObj.properties?.find((p: { name: string; value: string }) => p.name === 'Room');
        if (!roomProperty) return;
        
        const roomId = roomProperty.value as string;
        console.log('Room ID:', roomId);
  
        const room = rooms.get(roomId);
        if (room) {
          room.setupEnemies(enemyObj);
        }
      });
    }

  
  
}