import { Scene, GameObjects, Physics, Types } from 'phaser';
import { Enemy } from '../enemy/Enemy';
import { Door } from '../Door';
import { EnemyFactory, EnemyType } from '../enemy/EnemyFactory';
import { MainScene } from '../../scenes/MainScene';
import { Barrel } from '../props/Barrel';
import { EnemySpawner } from '../enemy/EnemySpawner';

export enum RoomState {
  CREATED = 'CREATED',
  TRIGGERED = 'TRIGGERED',
  SPAWNING = 'SPAWNING',
  ENEMIES_DEAD = 'ENEMIES_DEAD',
  ROOM_CLEARED = 'ROOM_CLEARED'
}

export class Room {
  private scene: MainScene;
  private id: string;
  private zone: GameObjects.Zone;
  private enemyTriggerZone: GameObjects.Zone | null = null;
  private enemies: Enemy[] = [];
  private doors: Door[] = [];
  private barrels: Barrel[] = [];
  private enemyTypes: Array<{ type: EnemyType, count: number }> = [];
  private maxSpawns: number = 3;
  private numberOfSpawns: number = 0;
  private state: RoomState = RoomState.CREATED;
  private enemySpawner: EnemySpawner | null = null;
  private workingSpawnPoint: { x: number, y: number } | null = null;



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

    // Listen for barrel smashed events
    this.scene.events.on(Barrel.SMASHED_EVENT, (data: { x: number, y: number, barrel: Barrel }) => {
      // Remove the smashed barrel from the room's barrel list
      if (this.barrels.includes(data.barrel)) {
        this.barrels.splice(this.barrels.indexOf(data.barrel), 1);
      }
    });

    this.scene.events.on(Enemy.ENEMY_DIED, (data: { enemy: Enemy }) => {
      if (this.enemies.includes(data.enemy)) {
        this.removeEnemy(data.enemy);
        this.checkCleared();
      }
    });

  }
  public setWorkingSpawnPoint(x: number, y: number): void {
    if (!this.workingSpawnPoint) {
      this.workingSpawnPoint = { x, y };
    }
  }

  public getWorkingSpawnPoint(): { x: number, y: number } | null {
    return this.workingSpawnPoint;
  }


  public inRoom(x: number, y: number): boolean {
    return this.zone.getBounds().contains(x, y);
  }

  public getEnemyTypes(): Array<{ type: EnemyType, count: number }> {
    return this.enemyTypes;
  }

  public setEnemyTriggerZone(zone: GameObjects.Zone) {
    this.enemyTriggerZone = zone;
  }


  public getId(): string {
    return this.id;
  }


  public getZone(): GameObjects.Zone {
    return this.zone;
  }


  public addDoor(door: Door): void {
    this.doors.push(door);
  }

  public getDoors(): Door[] {
    return this.doors;
  }

  public addEnemy(enemy: Enemy): void {
    this.enemies.push(enemy);
  }


  public triggerRoom(): void {
    if (this.state === RoomState.CREATED) {
      this.setState(RoomState.TRIGGERED);
    }
  }

  public isRoomTriggered(): boolean {
    return this.state === RoomState.TRIGGERED || this.state === RoomState.ENEMIES_DEAD;
  }


  public isCreated(): boolean {
    return this.state === RoomState.CREATED;
  }

  public addBarrel(barrel: Barrel): void {
    this.barrels.push(barrel);
  }

  public getBarrels(): Barrel[] {
    return this.barrels;
  }

  public setMaxSpawns(maxSpawns: number): void {
    this.maxSpawns = maxSpawns;
  }


  public addEnemyType(enemyType: EnemyType, quantity: number): void {
    this.enemyTypes.push({ type: enemyType, count: quantity });
  }


  public checkCleared(): boolean {
    if (this.state !== RoomState.SPAWNING) {
      return false;
    }

    const allEnemiesDead = this.enemies.length === 0;
    if (allEnemiesDead) {
      this.setState(RoomState.ENEMIES_DEAD);

      console.log('Number of spawns', this.numberOfSpawns, 'Max spawns', this.maxSpawns);
      if (this.numberOfSpawns >= this.maxSpawns) {
        this.setState(RoomState.ROOM_CLEARED);
        this.openDoors();
        this.enemies = [];
        return true;
      }
    }

    return false;
  }

  private openDoors(): void {
    this.doors.forEach(door => {
      if (!door.isDoorOpen()) {
        door.open();
      }
    });
  }

  public isRoomCleared(): boolean {
    return this.state === RoomState.ROOM_CLEARED;
  }

  public getEnemies(): Enemy[] {
    return this.enemies;
  }

  public removeEnemy(enemy: Enemy): void {
    this.enemies.splice(this.enemies.indexOf(enemy), 1);
  }

  public destroy(): void {
    this.enemies = [];
    this.zone.destroy();
  }

  public _testSpawnEnemies(x: number, y: number, type: EnemyType | undefined, id: string): void {
    const enemy = EnemyFactory.createEnemy(
      this.scene,
      type as EnemyType,
      x,
      y,
      id
    );

    // Set player reference and ensure enemy is initialized
    enemy.setPlayer(this.scene.getPlayer());

    // Add to room's enemy list
    this.enemies.push(enemy);

    // Emit event with properly initialized enemy
    // this.scene.events.emit(Room.ENEMY_CREATED, { enemy });
  }

  public getState(): RoomState {
    return this.state;
  }

  public setState(newState: RoomState): void {
    if (this.state !== newState) {
      console.log('Setting state of room', this.id, 'to', newState);
      this.state = newState;
      if (newState === RoomState.SPAWNING) {
        this.numberOfSpawns++;
      }
      else {
        const enemySpawner = this.getEnemySpawner();
        if (enemySpawner && this.canSpawnEnemies()) {
          enemySpawner.spawnEnemies();
        }
      }
    }
  }


  public getEnemySpawner(): EnemySpawner | null {
    if (!this.enemySpawner) {
      this.enemySpawner = new EnemySpawner(this.scene, this.scene.getPlayer(), this);
    }
    return this.enemySpawner;
  }

  public canSpawnEnemies(): boolean {
    return this.state === RoomState.TRIGGERED || this.state === RoomState.ENEMIES_DEAD;
  }

} 