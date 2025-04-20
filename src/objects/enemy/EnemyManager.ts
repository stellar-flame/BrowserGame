import { Scene } from 'phaser';
import { Enemy } from './Enemy';
import { Room } from '../rooms/Room';
import { Player } from '../player/Player';
import { RangedEnemy } from './RangedEnemy';
import { Bullet } from '../weapons/Bullet';
import { EnemyType } from './EnemyFactory';
import { MainScene } from '../../scenes/MainScene';
import { WeaponUpgrade } from '../weapons/WeaponUpgrade';
import { WeaponManager } from '../weapons/WeaponManager';

export class EnemyManager {
  private scene: Scene;
  private enemies: Phaser.Physics.Arcade.Group;
  private player: Player;

  constructor(scene: Scene, player: Player) {
    this.scene = scene;
    this.player = player;
    this.enemies = this.scene.physics.add.group({
      classType: Enemy,
      runChildUpdate: true
    });

    // Listen for enemy created events
    this.scene.events.on(Room.ENEMY_CREATED, (data: { enemy: Enemy }) => {
      if (data.enemy && data.enemy.body) {
        this.enemies.add(data.enemy);
        this.setupEnemyBulletCollisions(data.enemy);
      }
    });

    scene.events.on(WeaponManager.SWAPPED_EVENT, (data: { weaponUpgrade: WeaponUpgrade }) => {
      this.setupPlayerBulletCollisions();
    });
  }

  public createEnemiesFromSpawnLayer(spawnLayer: Phaser.Tilemaps.ObjectLayer, rooms: Map<string, Room>): void {
    // Find all enemy spawn points in the spawn layer
    spawnLayer.objects.forEach((obj) => {

      console.log('Enemy spawn object:', obj);
      // Ensure all required properties exist
      if (typeof obj.x !== 'number' ||
        typeof obj.y !== 'number') {
        console.warn('Invalid enemy spawn object properties:', obj);
        return;
      }

      const roomProperty = obj.properties?.find((p: { name: string; value: string }) => p.name === 'Room');
      const roomId = roomProperty?.value;
      const room = rooms.get(roomId);

      if (room) {
        // Get enemy type from properties
        const typeProperty = obj.properties?.find((p: { name: string; value: string }) => p.name === 'Type');
        const enemyType = typeProperty?.value?.toUpperCase() as EnemyType;
        const quantityProperty = obj.properties?.find((p: { name: string; value: string }) => p.name === 'Quantity');
        // Add spawn point to room
        for (let i = 0; i < parseInt(quantityProperty?.value || '1'); i++) {
          room.addSpawnPoint(obj.x, obj.y, enemyType);
        }

        console.log('Spawn point added:', obj.x, obj.y, enemyType);
      }
    });
  }

  public setupCollisions(): void {
    const wallsLayer = (this.scene as MainScene).getWallsLayer();

    this.setupPlayerBulletCollisions();

    if (wallsLayer) {
      // Enemy collisions with walls
      this.scene.physics.add.collider(
        this.enemies,
        wallsLayer,
        this.handleEnemyWallCollision,
        undefined,
        this
      );
    }

    // Enemy overlap with player (for melee damage)
    this.scene.physics.add.overlap(
      this.enemies,
      this.player,
      this.handlePlayerEnemyOverlap,
      undefined,
      this
    );
  }

  private setupPlayerBulletCollisions(): void {
    const currentWeapon = this.player.weapon;

    if (currentWeapon?.bullets) {
      this.scene.physics.add.collider(
        this.enemies,
        currentWeapon.bullets,
        this.handleEnemyBulletCollision,
        undefined,
        this
      );
    }
  }

  // Helper to set up collisions for a specific enemy's bullets
  public setupEnemyBulletCollisions(enemyInstance: Enemy) {
    const wallsLayer = (this.scene as MainScene).getWallsLayer();

    if (enemyInstance instanceof RangedEnemy && enemyInstance.weapon && enemyInstance.weapon.bullets) {
      // Enemy Bullets vs Player
      this.scene.physics.add.collider(this.player, enemyInstance.weapon.bullets, this.handlePlayerBulletCollision, undefined, this);
      // Enemy Bullets vs Walls
      if (wallsLayer) {
        this.scene.physics.add.collider(enemyInstance.weapon.bullets, wallsLayer, (this.scene as MainScene).handleBulletCollision, undefined, this);
      }
    }
  }

  // Handles collision between enemy bullets and the player
  private handlePlayerBulletCollision(player: any, bullet: any) {
    const playerInstance = player as Player;
    const bulletInstance = bullet as Bullet;

    if (!playerInstance.active || !bulletInstance.active) {
      return;
    }

    playerInstance.takeDamage(bulletInstance.getDamage());
    bulletInstance.deactivate();
  }

  private handleEnemyWallCollision(enemy: any, wall: any): void {
    if (enemy instanceof Enemy) {
      // Handle enemy wall collision (e.g., stop movement, change direction)
      enemy.handleWallCollision();
    }
  }

  private handleEnemyBulletCollision(enemy: any, bullet: any): void {
    const enemyInstance = enemy as Enemy;
    const bulletInstance = bullet as Bullet;

    if (!enemyInstance.active || !bulletInstance.active) {
      return;
    }

    bulletInstance.deactivate();
    enemyInstance.takeDamage(bulletInstance.getDamage());
  }

  private handlePlayerEnemyOverlap(player: any, enemy: any): void {
    const playerInstance = player as Player;
    const enemyInstance = enemy as Enemy;


    if (enemyInstance.active && !(enemyInstance instanceof RangedEnemy) && enemyInstance.weapon) {
      enemyInstance.weapon.dealDamage(enemyInstance, playerInstance);
    }
  }

  public spawnEnemyInRoom(room: Room): void {
    if (!room.isEnemiesSpawned() && !room.isRoomCleared()) {
      room.spawnEnemies();
    }
  }

  public destroyEnemies(): void {
    this.enemies.destroy(true);
  }

  public getEnemies(): Phaser.Physics.Arcade.Group {
    return this.enemies;
  }
} 