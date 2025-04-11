import { Scene, GameObjects } from 'phaser';

export class HealthBar {
  private scene: Scene;
  private parent: Phaser.GameObjects.GameObject;
  private bar: GameObjects.Graphics;
  private width: number;
  private height: number;
  private padding: number = 10; // Padding from the screen edges
  private currentHealth: number;
  private maxHealth: number;
  private visible: boolean = true;
  private isPlayerBar: boolean = false;

  constructor(
    scene: Scene, 
    parent: Phaser.GameObjects.GameObject, 
    width: number = 150, 
    height: number = 10,
    isPlayerBar: boolean = false
  ) {
    this.scene = scene;
    this.parent = parent;
    this.width = width;
    this.height = height;
    this.currentHealth = 100;
    this.maxHealth = 100;
    this.isPlayerBar = isPlayerBar;

    // Create the health bar graphics
    this.bar = scene.add.graphics();
    this.bar.setDepth(100); // Ensure it's drawn above other objects
    
    // Position the health bar based on whether it's a player bar or enemy bar
    this.updatePosition();
  }

  public setHealth(current: number, max: number): void {
    this.currentHealth = current;
    this.maxHealth = max;
    this.draw();
  }

  public setVisible(visible: boolean): void {
    this.visible = visible;
    this.bar.setVisible(visible);
  }

  private updatePosition(): void {
    if (this.isPlayerBar) {
      // Position the player health bar in the top left corner with padding
      this.bar.setPosition(this.padding, this.padding);
    } else {
      // Position enemy health bars above the enemy
      const parentSprite = this.parent as Phaser.GameObjects.Sprite;
      const offsetY = -20; // Offset above the enemy
      this.bar.setPosition(parentSprite.x - this.width / 2, parentSprite.y + offsetY);
    }
    this.draw();
  }

  private draw(): void {
    if (!this.visible) return;
    
    this.bar.clear();
    
    // Background (dark red)
    this.bar.fillStyle(0x660000);
    this.bar.fillRect(0, 0, this.width, this.height);
    
    // Health bar (green)
    const healthWidth = (this.currentHealth / this.maxHealth) * this.width;
    this.bar.fillStyle(0x00ff00);
    this.bar.fillRect(0, 0, healthWidth, this.height);
    
    // Border
    this.bar.lineStyle(1, 0xffffff);
    this.bar.strokeRect(0, 0, this.width, this.height);
  }

  public update(): void {
    if (!this.isPlayerBar) {
      // Update enemy health bar position to follow the enemy
      const parentSprite = this.parent as Phaser.GameObjects.Sprite;
      const offsetY = -20; // Offset above the enemy
      this.bar.setPosition(parentSprite.x - this.width / 2, parentSprite.y + offsetY);
    }
  }

  public destroy(): void {
    this.bar.destroy();
  }
} 