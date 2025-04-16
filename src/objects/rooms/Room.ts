import { Scene, GameObjects, Physics, Types } from 'phaser';
import { Enemy } from '../enemy/Enemy';
import { Door } from '../Door';
import { EnemyFactory, EnemyType } from '../enemy/EnemyFactory';
import { MainScene } from '../../scenes/MainScene';

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

  public setEnemyTriggerZone(zone: GameObjects.Zone) {
    this.enemyTriggerZone = zone;
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