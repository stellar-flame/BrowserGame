import { Player } from "../player/Player";
import { Weapon } from "./Weapon";

export class WeaponUpgrade extends Phaser.Physics.Arcade.Sprite {
  public weapon: Weapon | null = null;
  public isUpgradeCollected: boolean = false;
  private glowEffect: Phaser.GameObjects.Graphics | null = null;
  private weaponNameText: Phaser.GameObjects.Text | null = null;

  private player: Player | null = null;
  private canSwapWeapon: boolean = true;

  constructor(scene: Phaser.Scene, x: number, y: number, weapon: Weapon, player: Player) {
    super(scene, x, y, weapon.config.displayConfig?.sprite || 'weapon-upgrade');
    this.weapon = weapon;
    this.player = player;
    this.scene.add.existing(this);

    // Add physics
    scene.physics.add.existing(this);

    // Apply visual cue based on weapon type
    this.applyWeaponVisualCue();

    // Create weapon name text
    this.createWeaponNameText();

    // Create glow effect
    this.createGlowEffect();
  }

  private createWeaponNameText(): void {
    if (!this.weapon) return;
    // Format the weapon name for display (replace underscores with spaces and capitalize)
    const displayName = this.weapon.weaponType
      .split('_')
      .map(word => word.charAt(0) + word.slice(1).toLowerCase())
      .join(' ');

    this.weaponNameText = this.scene.add.text(this.x, this.y - 20, displayName, {
      fontSize: '12px',
      color: '#ffffff',
      stroke: '#000000',
      strokeThickness: 2,
      align: 'center'
    });
    console.log(this.weaponNameText);
    this.weaponNameText.setOrigin(0.5);
    this.weaponNameText.setDepth(this.depth + 1);
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

    // Update weapon name text position
    if (this.weaponNameText) {
      this.weaponNameText.setPosition(this.x, this.y - 20);
    }
  }

  private applyWeaponVisualCue(): void {
    // Add a pulsing effect to make it more noticeable
    this.scene.tweens.add({
      targets: this,
      alpha: 0.8, // Increased from 0.7 to 0.8 for more visibility
      duration: 1000,
      yoyo: true,
      repeat: -1
    });
  }

  private createGlowEffect(): void {
    // Create a glowing circle around the weapon upgrade
    this.glowEffect = this.scene.add.graphics();
    this.glowEffect.setDepth(this.depth - 1);

    // Update the glow effect in the update method
    this.scene.events.on('update', this.updateGlowEffect, this);
  }

  private updateGlowEffect(): void {
    if (!this.weapon) return;
    const displayConfig = this.weapon.config.displayConfig;
    if (displayConfig) {
      this.setTint(parseInt(displayConfig.color as string, 16));
    }

    //  if (this.isUpgradeCollected || !this.glowEffect) return;
    if (!this.glowEffect) return;
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


  public swapWeapon(oldWeapon: Weapon): Weapon | null {
    if (!this.canSwapWeapon) { return null }
    this.canSwapWeapon = false;
    const upgradeWeapon = this.weapon;
    // Store the old weapon as the dropped weapon
    this.weapon = oldWeapon;

    // Create visual representation of the dropped weapon
    if (!this.isUpgradeCollected) {
      if (this.glowEffect) {
        this.glowEffect.destroy();
      }
      this.isUpgradeCollected = true;
    }

    this.applyWeaponVisualCue();


    if (!this.weapon) {
      this.scene.time.delayedCall(100, () => {
        this.destroy();
      });
    }
    else {

      // Update the weapon name text
      if (this.weaponNameText) {
        const displayName = this.weapon.weaponType
          .split('_')
          .map(word => word.charAt(0) + word.slice(1).toLowerCase())
          .join(' ');
        this.weaponNameText.setText(displayName);
      }
    }

    // Return the new weapon
    return upgradeWeapon;
  }

  public destroy(fromScene?: boolean): void {
    // Clean up event listeners
    this.scene.events.off('update', this.updateGlowEffect, this);

    // Destroy glow effect
    if (this.glowEffect) {
      this.glowEffect.destroy();
    }

    // Destroy weapon name text
    if (this.weaponNameText) {
      this.weaponNameText.destroy();
    }

    super.destroy(fromScene);
  }
}