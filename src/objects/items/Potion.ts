import { Scene } from 'phaser';

export class Potion extends Phaser.Physics.Arcade.Sprite {
  private healAmount: number = 20;
  private isCollected: boolean = false;
  private isHovered: boolean = false;
  private originalTint: number = 0xffffff;
  private hoverTint: number = 0x00ff00; // Green tint when hovered
  private floatTween: Phaser.Tweens.Tween | null = null;
  private glowEffect: Phaser.GameObjects.Graphics | null = null;

  public static readonly COLLECTED_EVENT = 'potion-collected';

  constructor(scene: Scene, x: number, y: number) {
    super(scene, x, y, 'potion');
    
    // Add to scene
    scene.add.existing(this);
    
    // Enable physics
    scene.physics.add.existing(this);
    
    // Set up physics body
    if (this.body) {
      this.body.immovable = true;
      if (this.body instanceof Phaser.Physics.Arcade.Body) {
        this.body.setSize(16, 16); // Adjust size as needed
        this.body.setBounce(0);
      }
    }
    
    // Set depth to ensure potions are drawn above the background
    this.setDepth(0.2);
    
    // Set up interactive properties
    this.setInteractive();
    
    // Add hover effects
    this.on('pointerover', this.onMouseOver, this);
    this.on('pointerout', this.onMouseOut, this);
    
    // Create glow effect
    this.createGlowEffect();
    
    // Start floating animation
    this.startFloatingAnimation();
  }
  
  // Create a glow effect around the potion
  private createGlowEffect(): void {
    this.glowEffect = this.scene.add.graphics();
    this.glowEffect.setDepth(this.depth - 0.01);
    
    // Update glow position
    this.scene.events.on('update', this.updateGlowPosition, this);
  }
  
  // Update the glow effect position
  private updateGlowPosition = (): void => {
    if (this.glowEffect && this.active) {
      this.glowEffect.clear();
      
      // Draw a pulsing glow
      const alpha = 0.3 + Math.sin(this.scene.time.now / 300) * 0.2;
      this.glowEffect.lineStyle(4, 0x00ff00, alpha);
      this.glowEffect.strokeCircle(this.x, this.y, 16);
    }
  };
  
  // Start the floating animation
  private startFloatingAnimation(): void {
    this.floatTween = this.scene.tweens.add({
      targets: this,
      y: this.y - 5,
      duration: 1500,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });
  }
  
  // Method to handle mouse over event
  private onMouseOver(): void {
    if (!this.isCollected) {
      this.isHovered = true;
      this.setTint(this.hoverTint);
      
      // Add a subtle scale effect
      this.scene.tweens.add({
        targets: this,
        scaleX: 1.2,
        scaleY: 1.2,
        duration: 100,
        ease: 'Power2'
      });
    }
  }
  
  // Method to handle mouse out event
  private onMouseOut(): void {
    if (!this.isCollected) {
      this.isHovered = false;
      this.clearTint();
      
      // Reset scale
      this.scene.tweens.add({
        targets: this,
        scaleX: 1,
        scaleY: 1,
        duration: 100,
        ease: 'Power2'
      });
    }
  }
  
  // Method to collect the potion
  public collect(): void {
    if (!this.isCollected) {
      this.isCollected = true;
      
      // Visual feedback when collected
      this.scene.tweens.add({
        targets: this,
        alpha: 0,
        scale: 1.5,
        duration: 300,
        ease: 'Power2',
        onComplete: () => {
          // Emit the collected event with the potion's position and heal amount
          this.scene.events.emit(Potion.COLLECTED_EVENT, {
            x: this.x,
            y: this.y,
            healAmount: this.healAmount
          });
          
          // Clean up
          this.cleanup();
          
          // Disable active state to prevent further interactions
          this.setActive(false);
        }
      });
    }
  }
  
  // Method to check if potion is collected
  public isPotionCollected(): boolean {
    return this.isCollected;
  }
  
  // Method to check if potion is being hovered
  public isPotionHovered(): boolean {
    return this.isHovered;
  }
  
  // Method to get heal amount
  public getHealAmount(): number {
    return this.healAmount;
  }
  
  // Method to set heal amount
  public setHealAmount(amount: number): void {
    this.healAmount = amount;
  }
  
  // Clean up resources
  private cleanup(): void {
    // Stop the floating animation
    if (this.floatTween) {
      this.floatTween.stop();
      this.floatTween = null;
    }
    
    // Remove glow effect
    if (this.glowEffect) {
      this.glowEffect.destroy();
      this.glowEffect = null;
    }
    
    // Remove event listener
    this.scene.events.off('update', this.updateGlowPosition, this);
  }
  
  // Override destroy method to clean up resources
  public destroy(fromScene?: boolean): void {
    this.cleanup();
    super.destroy(fromScene);
  }
} 