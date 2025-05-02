import { WEAPON_UPGRADE, WeaponType } from "./WeaponConfigs";
import { WeaponFactory } from "./WeaponFactory";
import { WeaponUpgrade } from "./WeaponUpgrade";
import { Player } from "../player/Player";
import { MainScene } from "../../scenes/MainScene";
import { Scene } from "phaser";
import { Weapon } from "./Weapon";

export class WeaponManager {
  private player: Player | null = null;
  private scene: Scene;
  private weaponUpgrades: WeaponUpgrade[] = [];
  public static readonly SWAPPED_EVENT = 'weapon-swapped';

  constructor(scene: Scene, player: Player) {
    this.scene = scene;
    this.player = player;
  }

  public setupWeaponUpgrades(itemsLayer: Phaser.Tilemaps.ObjectLayer): void {
    itemsLayer.objects.forEach((item) => {
      if (item.name === 'WeaponUpgrade') {
        if (typeof item.x !== 'number' ||
          typeof item.y !== 'number') {
          console.warn('Invalid item properties:', item);
          return;
        }
        const levelProperty = item.properties?.find((p: { name: string; value: string }) => p.name === 'Level');
        const weaponType = WEAPON_UPGRADE[levelProperty?.value as keyof typeof WEAPON_UPGRADE];
        if (weaponType && this.player) {
          const weapon = WeaponFactory.createPlayerWeapon(this.scene, weaponType as unknown as WeaponType);
          const weaponUpgrade = new WeaponUpgrade(this.scene, item.x, item.y, weapon, this.player);
          this.weaponUpgrades.push(weaponUpgrade);
          this.setupWeaponUpgrade(weaponUpgrade);
        }
      }
    });
  }

  public setupWeaponUpgrade(upgrade: WeaponUpgrade): void {
    // Add overlap detection for entering the upgrade area
    if (!this.player) { return; }
    this.scene.physics.add.overlap(
      this.player,
      upgrade,
      this.onEnterUpgradeArea,
      undefined,
      this
    );
  }

  public setupCollisions(): void {
    const mainScene = this.scene as MainScene;
    const wallsLayer = mainScene.getWallsLayer();
    if (!this.player || !wallsLayer) { return; }

    // Remove any existing collisions first
    const currentWeapon = this.player.getWeapon();

    // Setup new collisions
    if (currentWeapon?.bullets) {
      // Player Bullets vs Walls
      this.scene.physics.add.collider(
        currentWeapon.bullets,
        wallsLayer,
        mainScene.handleBulletCollision,
        undefined,
        this
      );
    }
  }

  private onEnterUpgradeArea(player: any, upgrade: any): void {
    if (!this.player) return;

    let newWeapon = null;
    // Get the new weapon from the upgrade
    const weaponUpgrade = upgrade as WeaponUpgrade;
    if (!weaponUpgrade.weapon) return;
    if (weaponUpgrade.weapon.isDeployable()) {
      newWeapon = weaponUpgrade.swapWeapon(this.player.getDeployableWeapon() as Weapon);
    } else {
      newWeapon = weaponUpgrade.swapWeapon(this.player.getWeapon());
    }

    if (newWeapon) {
      // Update the player's weapon
      this.player.swapWeapon(newWeapon);

      // Create upgrade effect
      this.createPlayerUpgradeEffect();

      // Emit weapon swapped event
      this.scene.events.emit(WeaponManager.SWAPPED_EVENT, {
        oldWeapon: this.player.getWeapon(),
        newWeapon: newWeapon
      });

      this.setupCollisions();
    }
  }



  private createPlayerUpgradeEffect(): void {
    if (!this.player) {
      console.warn('Player is not set');
      return;
    }
    // Create a flash effect around the player
    const flash = this.scene.add.graphics();
    flash.fillStyle(0x00ffff, 0.5);
    flash.fillCircle(this.player.x, this.player.y, 40);
    flash.setDepth(this.player.depth - 1);

    // Fade out the flash
    this.scene.tweens.add({
      targets: flash,
      alpha: 0,
      duration: 1000,
      onComplete: () => {
        flash.destroy();
      }
    });

    // Create a particle burst around the player
    const particles = this.scene.add.particles(0, 0, 'weapon-upgrade', {
      x: this.player.x,
      y: this.player.y,
      speed: { min: 50, max: 100 },
      scale: { start: 0.4, end: 0 },
      alpha: { start: 0.7, end: 0 },
      lifespan: 1000,
      quantity: 8,
      frequency: 50,
      blendMode: 'ADD',
      emitting: true,
      gravityY: -50,
      emitZone: {
        type: 'edge',
        source: new Phaser.Geom.Circle(0, 0, 1),
        quantity: 8
      }
    });

    // Destroy the particles after the burst is complete
    this.scene.time.delayedCall(500, () => {
      particles.destroy();
    });


    // Add a screen shake effect
    this.scene.cameras.main.shake(200, 0.005);
  }

  public destroy(): void {
    // Clean up all weapon upgrades
    this.weaponUpgrades.forEach(upgrade => {
      if (upgrade) {
        upgrade.destroy();
      }
    });
    this.weaponUpgrades = [];


    this.player = null;
    this.scene = null;
  }
}