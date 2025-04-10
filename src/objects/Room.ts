import { Scene, Physics, GameObjects } from 'phaser';
import { Door, DoorDirection } from './Door';
import { Enemy } from './Enemy';

export interface RoomBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

export class Room {
  private scene: Scene;
  public id: string;
  public bounds: RoomBounds;
  public walls: Physics.Arcade.StaticGroup;
  public doors: Door[] = [];
  public enemies: Enemy[] = [];
  public isCleared: boolean = false;
  public isVisited: boolean = false;

  constructor(scene: Scene, config: {
    id: string;
    x: number;
    y: number;
    width: number;
    height: number;
    doors?: {
      direction: DoorDirection;
      isOpen: boolean;
      targetRoomId: string;
    }[];
  }) {
    this.scene = scene;
    this.id = config.id;
    this.bounds = {
      x: config.x,
      y: config.y,
      width: config.width,
      height: config.height
    };

    // Create walls
    this.walls = this.scene.physics.add.staticGroup();
    this.createWalls();

    // Create doors if specified
    if (config.doors) {
      config.doors.forEach(doorConfig => {
        this.createDoor(doorConfig);
      });
    }
  }

  private createWalls(): void {
    // Top wall
    this.walls.add(this.scene.add.rectangle(
      this.bounds.x + this.bounds.width / 2,
      this.bounds.y,
      this.bounds.width,
      10,
      0x333333
    ));

    // Bottom wall
    this.walls.add(this.scene.add.rectangle(
      this.bounds.x + this.bounds.width / 2,
      this.bounds.y + this.bounds.height,
      this.bounds.width,
      10,
      0x333333
    ));

    // Left wall
    this.walls.add(this.scene.add.rectangle(
      this.bounds.x,
      this.bounds.y + this.bounds.height / 2,
      10,
      this.bounds.height,
      0x333333
    ));

    // Right wall
    this.walls.add(this.scene.add.rectangle(
      this.bounds.x + this.bounds.width,
      this.bounds.y + this.bounds.height / 2,
      10,
      this.bounds.height,
      0x333333
    ));

    // Add physics to all walls
    this.walls.getChildren().forEach(wall => {
      this.scene.physics.add.existing(wall, true);
    });
  }

  private createDoor(config: {
    direction: DoorDirection;
    isOpen: boolean;
    targetRoomId: string;
  }): void {
    let doorX: number;
    let doorY: number;
    let doorWidth: number;
    let doorHeight: number;

    const doorSize = 60;
    this.scene.physics.world.createDebugGraphic();
    switch (config.direction) {
      case DoorDirection.NORTH:
        doorX = this.bounds.x + this.bounds.width / 2;
        doorY = this.bounds.y + 5;
        doorWidth = doorSize;
        doorHeight = 10;
        break;
      case DoorDirection.SOUTH:
        doorX = this.bounds.x + this.bounds.width / 2;
        doorY = this.bounds.y + this.bounds.height - 5;
        doorWidth = doorSize;
        doorHeight = 10;
        break;
      case DoorDirection.WEST:
        doorX = this.bounds.x + 5;
        doorY = this.bounds.y + this.bounds.height / 2;
        doorWidth = 10;
        doorHeight = doorSize;
        break;
      case DoorDirection.EAST:
        doorX = this.bounds.x + this.bounds.width - 5;
        doorY = this.bounds.y + this.bounds.height / 2;
        doorWidth = 10;
        doorHeight = doorSize;
        break;
    }

    const door = new Door(
      this.scene,
      doorX,
      doorY,
      doorWidth,
      doorHeight,
      config.direction,
      config.targetRoomId
    );

    if (config.isOpen) {
      door.open();
    }

    this.doors.push(door);
  }

  public addEnemy(enemy: Enemy): void {
    this.enemies.push(enemy);
  }

  public checkCleared(): boolean {
    this.isCleared = this.enemies.every(enemy => !enemy.active);
    
    if (this.isCleared) {
      this.openDoors();
    }
    
    return this.isCleared;
  }

  public openDoors(): void {
    this.doors.forEach(door => door.open());
  }

  public show(): void {
    this.walls.setVisible(true);
    this.doors.forEach(door => door.setVisible(true));
    this.enemies.forEach(enemy => enemy.setVisible(true));
  }

  public hide(): void {
    this.walls.setVisible(false);
    this.doors.forEach(door => door.setVisible(false));
    this.enemies.forEach(enemy => enemy.setVisible(false));
  }

  public destroy(): void {
    this.walls.clear(true, true);
    this.doors.forEach(door => door.destroy());
    this.enemies.forEach(enemy => enemy.destroy());
  }
} 