import { Player } from "../player/Player";
import { Weapon } from "./Weapon";

export class WeaponUpgrade extends Phaser.Physics.Arcade.Sprite {
    public weapon: Weapon;
    public isUpgradeCollected: boolean = false;
    private glowEffect: Phaser.GameObjects.Graphics | null = null;
    private oldWeaponCircle: Phaser.GameObjects.Graphics | null = null;
    
    private player: Player | null = null;
    private canSwapWeapon: boolean = true;

  constructor(scene: Phaser.Scene, x: number, y: number, weapon: Weapon, player: Player) {
    super(scene, x, y, 'weapon-upgrade');
    this.weapon = weapon;
    this.player = player;
    this.scene.add.existing(this);
    
    // Add physics
    scene.physics.add.existing(this);
    
    
    // Create glow effect
    this.createGlowEffect();
    
  }

  preUpdate(time: number, delta: number) {
    super.preUpdate(time, delta);
    if (!this.player || this.canSwapWeapon) { return; }
      const playerBounds = this.player.getBounds();
      const upgradeBounds = this.getBounds();
  
      const isOverlapping = Phaser.Geom.Intersects.RectangleToRectangle(playerBounds, upgradeBounds);
      if (!isOverlapping) {
          this.canSwapWeapon = true;
      }
  }

  
  private createGlowEffect(): void {
    // Create a glowing circle around the weapon upgrade
    this.glowEffect = this.scene.add.graphics();
    this.glowEffect.setDepth(this.depth - 1);
    
    // Update the glow effect in the update method
    this.scene.events.on('update', this.updateGlowEffect, this);
  }
  
  private updateGlowEffect(): void {
    if (this.isUpgradeCollected || !this.glowEffect) return;
    
    this.glowEffect.clear();
    
    // Create a pulsing glow effect
    const time = this.scene.time.now;
    const alpha = 0.3 + Math.sin(time / 300) * 0.2;
    const scale = 1 + Math.sin(time / 500) * 0.1;
    
    // Draw the glow

    this.glowEffect.lineStyle(2, 0x00ffff, alpha);
    this.glowEffect.strokeCircle(this.x, this.y, 20 * scale);
    
    // Add a second glow with different color
    this.glowEffect.lineStyle(2, 0xff00ff, alpha * 0.7);
    this.glowEffect.strokeCircle(this.x, this.y, 25 * scale);
  }
  
  private createOldWeaponCircle(): void {
    // Remove any existing update listener to prevent duplicates
    this.scene.events.off('update', this.updateOldWeaponCircle, this);
    if (this.glowEffect) {
      this.glowEffect.destroy();
    }

    // Create a simple circle around the old weapon
    this.oldWeaponCircle = this.scene.add.graphics();
    this.oldWeaponCircle.setDepth(this.depth - 1);
    
    // Draw a simple circle with thinner line
    this.oldWeaponCircle.lineStyle(1, 0xffff00, 0.6);
    this.oldWeaponCircle.strokeCircle(this.x, this.y, 20);
    
    // Update the circle position in the update method
    this.scene.events.on('update', this.updateOldWeaponCircle, this);
  }
  
  private updateOldWeaponCircle = (): void => {
    if (!this.oldWeaponCircle || !this.isUpgradeCollected) return;
    
    // Clear the graphics object completely before redrawing
    this.oldWeaponCircle.clear();
    
    // Draw a single circle with thinner line
    this.oldWeaponCircle.lineStyle(1, 0xffff00, 0.6);
    this.oldWeaponCircle.strokeCircle(this.x, this.y, 20);
  };
  
  
  
  public swapWeapon(oldWeapon: Weapon): Weapon | null {
    if (!this.canSwapWeapon) { return null}
    this.canSwapWeapon = false;
    const upgradeWeapon = this.weapon;
    // Store the old weapon as the dropped weapon
    this.weapon = oldWeapon;
    
    // Create visual representation of the dropped weapon
    if (!this.isUpgradeCollected) {
        this.createOldWeaponCircle();
        this.isUpgradeCollected = true;
    }

    
    // Return the new weapon
    return upgradeWeapon;
  }

  
  public destroy(fromScene?: boolean): void {
    // Clean up event listeners
    this.scene.events.off('update', this.updateGlowEffect, this);
    this.scene.events.off('update', this.updateOldWeaponCircle, this);
    
    // Destroy glow effect
    if (this.glowEffect) {
      this.glowEffect.destroy();
    }
    
    // Destroy old weapon circle
    if (this.oldWeaponCircle) {
      this.oldWeaponCircle.destroy();
    }
    
    super.destroy(fromScene);
  }
}