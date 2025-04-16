import { Scene, GameObjects, Physics, Math, Geom } from 'phaser';
import { Barrel } from './Barrel';

export class BarrelManager {
  private scene: Scene;
  private barrelGroups: Map<string, Phaser.Physics.Arcade.Group> = new Map();
  
  constructor(scene: Scene) {
    this.scene = scene;
    console.log('BarrelManager constructor called');
  }
  
  // Initialize a barrel group for a specific room
  private initializeBarrelGroup(roomId: string): Phaser.Physics.Arcade.Group {
    if (!this.scene.physics) {
      console.error('Physics not available. Cannot initialize barrel group.');
      throw new Error('Physics not available');
    }
    
    console.log(`Initializing barrel group for room ${roomId}`);
    const group = this.scene.physics.add.group({ classType: Barrel });
    this.barrelGroups.set(roomId, group);
    return group;
  }
  
  // Get or create a barrel group for a room
  private getBarrelGroup(roomId: string): Phaser.Physics.Arcade.Group {
    let group = this.barrelGroups.get(roomId);
    if (!group) {
      group = this.initializeBarrelGroup(roomId);
    }
    return group;
  }
  
  // Initialize barrels from the Props layer
  public initializeFromPropsLayer(): void {
    // Check if physics is available
    if (!this.scene.physics) {
      console.error('Physics not available. Cannot initialize barrels.');
      return;
    }
    
    const propsLayer = this.scene.make.tilemap({ key: 'dungeon-map' }).getObjectLayer('Props');
    
    if (!propsLayer) {
      console.warn('Props layer not found in the tilemap');
      return;
    }
    
    // Find all Barrel objects in the Props layer
    const barrelObjects = propsLayer.objects.filter(obj => obj.name === 'Barrels');
    
    // Create barrels for each Barrel object
    barrelObjects.forEach(barrelObj => {
      // Get the room ID from the object properties
      const roomId = barrelObj.properties?.find((prop: { name: string; value: string }) => prop.name === 'Room')?.value || 'default';
      
      this.createBarrelsInArea(
        barrelObj.x || 0, 
        barrelObj.y || 0, 
        barrelObj.width || 0, 
        barrelObj.height || 0,
        roomId
      );
    });
    
    console.log(`Created barrels in ${barrelObjects.length} areas across ${this.barrelGroups.size} rooms`);
  }
  
  // Create 3-4 barrels in the specified area
  private createBarrelsInArea(x: number, y: number, width: number, height: number, roomId: string): void {
    // Get the barrel group for this room
    const barrelGroup = this.getBarrelGroup(roomId);
    
    // Determine how many barrels to create (3-4)
    const numBarrels = Phaser.Math.Between(3, 4);
    
    for (let i = 0; i < numBarrels; i++) {
      // Calculate random position within the area
      const barrelX = x + Phaser.Math.Between(10, width - 10);
      const barrelY = y + Phaser.Math.Between(10, height - 10);
      
      // Create the barrel
      const barrel = new Barrel(this.scene, barrelX, barrelY);
      
      // Add to physics group
      barrelGroup.add(barrel);
    }
  }
  
  // Get all barrel groups
  public getBarrelGroups(): Map<string, Phaser.Physics.Arcade.Group> {
    return this.barrelGroups;
  }
  
  // Get barrels for a specific room
  public getBarrelsForRoom(roomId: string): Phaser.Physics.Arcade.Group | undefined {
    return this.barrelGroups.get(roomId);
  }
  
  // Check if all barrels in a room are cleared
  public barrelsCleared(roomId: string): boolean {
    const barrelGroup = this.barrelGroups.get(roomId);
    if (!barrelGroup) return true;
    
    for (const barrel of barrelGroup.getChildren()) {
      if (barrel instanceof Barrel && !barrel.isBarrelSmashed()) {
        return false;
      }
    }
    return true;
  }
  
  // Set up collisions with other game objects
  public setupCollisions(): void {
    // Check if physics is available
    if (!this.scene.physics) {
      console.warn('Physics not available. Cannot set up collisions.');
      return;
    }
    
    // Get player and enemies through scene getters
    const mainScene = this.scene as any;
    const player = mainScene.getPlayer?.();
    const enemies = mainScene.enemies;
    
    console.log('Setting up barrel collisions with player:', player);
    
    // Set up collisions for each barrel group
    this.barrelGroups.forEach((barrelGroup, roomId) => {
      console.log(`Setting up collisions for room ${roomId}`);
      
      // Add collision with player bullets
      if (player?.bullets) {
        console.log(`Adding collision between barrels and player bullets in room ${roomId}`);
        this.scene.physics.add.collider(
          barrelGroup,
          player.bullets,
          this.handleBulletCollision,
          undefined,
          this
        );
      }
      
      // Add collision with enemy bullets
      if (enemies) {
        console.log(`Setting up collisions with enemy bullets in room ${roomId}`);
        enemies.getChildren().forEach((enemy: any) => {
          if (enemy.weapon?.bullets) {
            console.log(`Adding collision between barrels and enemy bullets in room ${roomId}`);
            this.scene.physics.add.collider(
              barrelGroup,
              enemy.weapon.bullets,
              this.handleBulletCollision,
              undefined,
              this
            );
          }
        });
      }
      
      // Add overlap with player (instead of collision)
      if (player) {
        console.log(`Adding overlap between barrels and player in room ${roomId}`);
        this.scene.physics.add.overlap(
          barrelGroup,
          player,
          this.handlePlayerOverlap,
          undefined,
          this
        );
      }
    });
    
    // Add a test to verify collisions are working
    this.testCollisions();
  }
  
  // Method to test if collisions are working
  private testCollisions(): void {
    // Create a test bullet and barrel to verify collisions
    const mainScene = this.scene as any;
    const player = mainScene.getPlayer?.();
    
    if (player && player.bullets) {
      // Get the first barrel from any room
      const firstGroup = Array.from(this.barrelGroups.values())[0];
      if (!firstGroup) return;
      
      const firstBarrel = firstGroup.getFirstAlive();
      
      if (firstBarrel) {
        console.log('Testing collision between bullet and barrel');
        
        // Create a test bullet
        const testBullet = player.bullets.get();
        
        if (testBullet) {
          // Position the bullet near the barrel
          testBullet.setPosition(firstBarrel.x - 50, firstBarrel.y);
          
          // Fire the bullet towards the barrel
          testBullet.fire(testBullet.x, testBullet.y, 0);
          
          // Add a one-time collision check
          this.scene.physics.add.collider(
            firstBarrel,
            testBullet,
            () => {
              console.log('Test collision successful!');
              testBullet.deactivate();
            },
            undefined,
            this
          );
          
          // Deactivate the bullet after a short delay if no collision
          this.scene.time.delayedCall(1000, () => {
            if (testBullet.active) {
              console.log('Test collision failed - bullet passed through barrel');
              testBullet.deactivate();
            }
          });
        }
      }
    }
  }
  
  // Handle collision with bullets
  private handleBulletCollision(barrel: any, bullet: any): void {
    console.log('Bullet collided with barrel');
    if (barrel instanceof Barrel) {
      barrel.smash();  
    }
    
    // Deactivate the bullet
    if (bullet.active) {
      bullet.deactivate();
    }
  }
  
  // Handle player overlap with barrels
  private handlePlayerOverlap(barrel: any, player: any): void {
    // Smash the barrel when player walks through it
    if (barrel instanceof Barrel && !barrel.isBarrelSmashed()) {
      barrel.smash();
    }
  }
} 