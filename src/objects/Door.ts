import { Scene, GameObjects, Physics } from 'phaser';

export enum DoorDirection {
  NORTH = 'north',
  EAST = 'east',
  SOUTH = 'south',
  WEST = 'west'
}

export class Door extends GameObjects.Rectangle {
  public direction: DoorDirection;
  public isOpen: boolean = false;
  public targetRoomId: string;
  
  constructor(scene: Scene, x: number, y: number, width: number, height: number, direction: DoorDirection, targetRoomId: string) {
    // Initially red (locked)
    super(scene, x, y, width, height, 0xff0000);
    
    
    scene.add.existing(this);
    scene.physics.add.existing(this, true);
    
    this.direction = direction;
    this.targetRoomId = targetRoomId;
  }
  
  public open(): void {
    this.isOpen = true;
    this.setFillStyle(0x00ff00); // Green for open
  }
} 