import { Scene } from 'phaser';
import { Barrel } from './Barrel';
import { Room } from '../rooms/Room';
import { Player } from '../player/Player';
import { WeaponUpgrade } from '../weapons/WeaponUpgrade';
import { WeaponManager } from '../weapons/WeaponManager';
export class BarrelManager {
  private scene: Scene;
  private barrels: Phaser.Physics.Arcade.Group;
  private player: Player;
 
  constructor(scene: Scene, player: Player) {
    this.scene = scene;
    this.player = player;
    this.barrels = this.scene.physics.add.group({
      classType: Barrel,
      runChildUpdate: true
    });

    this.scene.events.on(WeaponManager.SWAPPED_EVENT, (data: {weaponUpgrade: WeaponUpgrade}) => {
      this.setupPlayerBulletCollisions();
    });
  }

  public createBarrelsFromPropsLayer(propsLayer: Phaser.Tilemaps.ObjectLayer, rooms: Map<string, Room>): void {
    // Find all barrel tiles in the props layer
    propsLayer.objects.forEach((obj) => {
      if (obj.name === 'Barrels') {
        // Ensure all required properties exist
        if (typeof obj.x !== 'number' || 
            typeof obj.y !== 'number' || 
            typeof obj.width !== 'number' || 
            typeof obj.height !== 'number') {
          console.warn('Invalid barrel object properties:', obj);
          return;
        }

        const roomProperty = obj.properties?.find((p: { name: string; value: string }) => p.name === 'Room');
        const roomId = roomProperty?.value;
        const room = rooms.get(roomId);
        if (room) {
          // Calculate the bounds
          const bounds = {
            x: obj.x,
            y: obj.y,
            width: obj.width,
            height: obj.height
          };

          // Create 3-5 barrels
          const numBarrels = Phaser.Math.Between(3, 5);
          const barrelSize = 32; // Size of a barrel
          const padding = 8; // Minimum space between barrels

          // Calculate grid positions
          const cols = Math.floor(bounds.width / (barrelSize + padding));
          const rows = Math.floor(bounds.height / (barrelSize + padding));
          
          // Create a list of possible positions
          const positions: {x: number, y: number}[] = [];
          for (let row = 0; row < rows; row++) {
            for (let col = 0; col < cols; col++) {
              positions.push({
                x: bounds.x + (col * (barrelSize + padding)) + barrelSize/2,
                y: bounds.y + (row * (barrelSize + padding)) + barrelSize/2
              });
            }
          }

          // Shuffle positions and take the number we need
          const shuffledPositions = Phaser.Utils.Array.Shuffle(positions).slice(0, numBarrels);

          // Create barrels at the selected positions
          shuffledPositions.forEach(pos => {
            // Create the barrel sprite
            const barrel = new Barrel(this.scene, pos.x, pos.y);
            
            // Add to group
            this.barrels.add(barrel);
            
            // Set properties
            barrel.setDepth(0.5);
            
            // Add to room
            room.addBarrel(barrel);
            
          });
        }
      }
    });
  }

  public setupPlayerBulletCollisions(): void {
    const currentWeapon = this.player.weapon;

    if (currentWeapon?.bullets) {
        this.scene.physics.add.collider(
          this.barrels,
          currentWeapon.bullets,  
          this.handleBulletCollision,
          undefined,
          this
        );
      }
    
  }

  public setupCollisions(): void {
    this.setupPlayerBulletCollisions();
    this.scene.physics.add.overlap(
        this.player,
        this.barrels,
        this.handleBarrelCollision,
        undefined,
        this
      );
  }

  private handleBulletCollision(barrel: any, bullet: any): void {
    if (barrel instanceof Barrel && bullet instanceof Phaser.Physics.Arcade.Sprite) {
      if (!barrel.isBarrelSmashed()) {
        barrel.smash();
        bullet.destroy();
      }
    }
  }

  private handleBarrelCollision(player : any, barrel: any): void {
    if (barrel instanceof Barrel && player instanceof Player) {
      if (!barrel.isBarrelSmashed()) {
        barrel.smash();
      }
    }
  }

  public destroyBarrel(): void {
    this.barrels.destroy(true);
  }
} 