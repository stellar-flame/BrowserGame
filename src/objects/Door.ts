import { Scene, GameObjects, Physics } from 'phaser';

export enum DoorDirection {
  East = 'East',
  South = 'South',
  West = 'West',
  North = 'North'
}

export class Door extends GameObjects.Sprite {
  private isOpen: boolean;
  private roomId: string;
  private collider: Phaser.Physics.Arcade.Collider | null = null;
  private direction: DoorDirection;

  constructor(scene: Scene, x: number, y: number, isOpen: boolean, roomId: string,  direction: DoorDirection = DoorDirection.East) {
    // Use the appropriate texture based on door state
    const texture = isOpen ? 'door-open' : 'door-closed';
    super(scene, x, y, texture);
    
    this.isOpen = isOpen;
    this.roomId = roomId;
    this.direction = direction;
    
    // Add to scene
    scene.add.existing(this);
    
    // Set depth to ensure doors are drawn above the floor but below other elements
    this.setDepth(1);
    
      // If the door is closed, add physics body and collision with player
      if (!isOpen) {
        // Enable physics on the door
        this.scene.physics.world.enable(this);
        
        // Set up the physics body
        const doorBody = this.body as Phaser.Physics.Arcade.Body;
        doorBody.setImmovable(true);
        doorBody.setSize(this.width || 32, this.height || 32);
      }
    
    // Apply rotation based on direction
    this.applyDirectionRotation();
  }
  
  // Apply rotation based on door direction
  private applyDirectionRotation(): void {
    switch (this.direction) {
      case DoorDirection.East:
        this.setRotation(0); // Default orientation
        break;
      case DoorDirection.South:
        this.setRotation(Math.PI / 2); // 90 degrees clockwise
        break;
      case DoorDirection.West:
        this.setRotation(Math.PI); // 180 degrees
        break;
      case DoorDirection.North:
        this.setRotation(-Math.PI / 2); // 90 degrees counterclockwise
        break;
    }
  }
  
  // Method to open the door
  public open(): void {
    if (!this.isOpen) {
      this.isOpen = true;
      this.setTexture('door-open');
      
      // Disable physics body when door is opened
      const body = this.body as Phaser.Physics.Arcade.Body;
      if (body) {
        body.enable = false;
      }
      
      // Remove collider if it exists
      if (this.collider) {
        this.collider.destroy();
        this.collider = null;
      }
    }
  }
  
  // Method to close the door
  public close(): void {
    if (this.isOpen) {
      this.isOpen = false;
      this.setTexture('door-closed');
      
      // Enable physics body when door is closed
      const body = this.body as Phaser.Physics.Arcade.Body;
      if (body) {
        body.enable = true;
      }
    }
  }
  
  // Method to check if door is open
  public isDoorOpen(): boolean {
    return this.isOpen;
  }
  
  // Method to get the room ID associated with this door
  public getRoomId(): string {
    return this.roomId;
  }
  

  // Method to get the door direction
  public getDirection(): DoorDirection {
    return this.direction;
  }

  // Method to set the collider
  public setCollider(collider: Phaser.Physics.Arcade.Collider): void {
    this.collider = collider;
  }
} 