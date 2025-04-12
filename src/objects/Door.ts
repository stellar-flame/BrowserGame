import { Scene, GameObjects, Physics } from 'phaser';

export class Door extends GameObjects.Sprite {
  private isOpen: boolean;
  private roomId: string;
  private doorId: string;
  private collider: Phaser.Physics.Arcade.Collider | null = null;

  constructor(scene: Scene, x: number, y: number, isOpen: boolean, roomId: string, doorId: string) {
    // Use the appropriate texture based on door state
    const texture = isOpen ? 'door-open' : 'door-closed';
    super(scene, x, y, texture);
    
    this.isOpen = isOpen;
    this.roomId = roomId;
    this.doorId = doorId;
    
    // Add to scene
    scene.add.existing(this);
    
    // Set depth to ensure doors are drawn above the floor but below other elements
    this.setDepth(1);
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
  
  // Method to get the door ID
  public getDoorId(): string {
    return this.doorId;
  }

  // Method to set the collider
  public setCollider(collider: Phaser.Physics.Arcade.Collider): void {
    this.collider = collider;
  }
} 