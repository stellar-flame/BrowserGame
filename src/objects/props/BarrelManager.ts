import { Scene, GameObjects, Physics } from 'phaser';
import { Barrel } from './Barrel';

export class BarrelManager {
  private scene: Scene;
  private barrelGroups: Map<string, Phaser.Physics.Arcade.Group>;
  private propsLayer: Phaser.Tilemaps.TilemapLayer | null = null;

  constructor(scene: Scene) {
    this.scene = scene;
    this.barrelGroups = new Map();
  }

  public initializeBarrelGroups(): void {
    // Create a group for each room
    const rooms = ['room1', 'room2', 'room3']; // Add more rooms as needed
    rooms.forEach(roomId => {
      const group = this.scene.physics.add.group({
        classType: Barrel,
        runChildUpdate: true
      });
      this.barrelGroups.set(roomId, group);
    });
  }

  public createBarrelsFromPropsLayer(propsLayer: Phaser.Tilemaps.TilemapLayer): void {
    this.propsLayer = propsLayer;
    
    // Find all barrel tiles in the props layer
    propsLayer.forEachTile((tile) => {
      if (tile.index === 1) { // Assuming 1 is the barrel tile index
        const worldX = propsLayer.tileToWorldX(tile.x);
        const worldY = propsLayer.tileToWorldY(tile.y);
        
        // Determine which room this barrel belongs to based on position
        const roomId = this.getRoomIdFromPosition(worldX, worldY);
        const group = this.barrelGroups.get(roomId);
        
        if (group) {
          const barrel = group.create(worldX, worldY, 'barrel');
          if (barrel instanceof Barrel) {
            // Set up barrel properties
            barrel.setDepth(0.5);
          }
        }
      }
    });
  }

  private getRoomIdFromPosition(x: number, y: number): string {
    // Implement logic to determine room ID based on position
    // This is a simple example - adjust based on your game's room layout
    if (x < 800) return 'room1';
    if (x < 1600) return 'room2';
    return 'room3';
  }

  public setupCollisions(): void {
    const playerBullets = this.scene.children.getByName('playerBullets');
    const enemyBullets = this.scene.children.getByName('enemyBullets');

    // Set up collisions with player bullets
    if (playerBullets instanceof Phaser.Physics.Arcade.Group) {
      this.barrelGroups.forEach((group) => {
        this.scene.physics.add.collider(
          group,
          playerBullets,
          this.handleBulletCollision,
          undefined,
          this
        );
      });
    }

    // Set up collisions with enemy bullets
    if (enemyBullets instanceof Phaser.Physics.Arcade.Group) {
      this.barrelGroups.forEach((group) => {
        this.scene.physics.add.collider(
          group,
          enemyBullets,
          this.handleBulletCollision,
          undefined,
          this
        );
      });
    }
  }

  private handleBulletCollision(
    object1: GameObjects.GameObject | Phaser.Tilemaps.Tile | Phaser.Physics.Arcade.Body | Phaser.Physics.Arcade.StaticBody,
    object2: GameObjects.GameObject | Phaser.Tilemaps.Tile | Phaser.Physics.Arcade.Body | Phaser.Physics.Arcade.StaticBody
  ): void {
    if (object1 instanceof Barrel && object2 instanceof Phaser.Physics.Arcade.Sprite) {
      if (!object1.isBarrelSmashed()) {
        object1.smash();
        object2.destroy();
      }
    }
  }

  public getBarrelsInRoom(roomId: string): Phaser.Physics.Arcade.Group | undefined {
    return this.barrelGroups.get(roomId);
  }

  public update(): void {
    // Update logic for barrels if needed
    this.barrelGroups.forEach((group) => {
      group.getChildren().forEach((barrel) => {
        if (barrel instanceof Barrel) {
          // Add any per-frame update logic here
        }
      });
    });
  }

  public destroy(): void {
    this.barrelGroups.forEach((group) => {
      group.destroy(true);
    });
    this.barrelGroups.clear();
  }
} 