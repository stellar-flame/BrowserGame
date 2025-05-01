import { Scene } from 'phaser';
import { Weapon } from './Weapon';
import { WEAPON_CONFIGS, WeaponType, OWNER_PLAYER, OWNER_ENEMY, WeaponConfig } from './WeaponConfigs';
import { DeployableWeapon } from './DeployableWeapon';

export class WeaponFactory {

  static getWeaponConfig(type: WeaponType): WeaponConfig | undefined {
    return WEAPON_CONFIGS[type];
  }

  static createPlayerWeapon(scene: Scene, type: WeaponType): Weapon {
    const config = WEAPON_CONFIGS[type];
    if (config.owner !== OWNER_PLAYER) {
      console.warn(`Weapon type ${type} is not a player weapon`);
    }

    // Use type assertion to handle deployable property
    const weaponConfig = config as unknown as WeaponConfig;

    if (weaponConfig.deployable === true) {
      return new DeployableWeapon(scene, type, weaponConfig);
    } else {
      return new Weapon(scene, type, weaponConfig);
    }
  }


  static createEnemyWeapon(scene: Scene, type: WeaponType): Weapon {
    const config = WEAPON_CONFIGS[type];
    if (config.owner !== OWNER_ENEMY) {
      console.warn(`Weapon type ${type} is not an enemy weapon`);
    }

    // Use type assertion to handle deployable property
    const weaponConfig = config as unknown as WeaponConfig;

    return new Weapon(scene, type, weaponConfig);
  }
} 