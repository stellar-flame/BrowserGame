import { Scene } from 'phaser';
import { Weapon } from './Weapon';
import { WEAPON_CONFIGS, WeaponType, OWNER_PLAYER, OWNER_ENEMY } from './WeaponConfigs';

export class WeaponFactory {

  static createPlayerWeapon(scene: Scene, type: WeaponType): Weapon {
    const config = WEAPON_CONFIGS[type];
    if (config.owner !== OWNER_PLAYER) {
      console.warn(`Weapon type ${type} is not a player weapon`);
    }
    return new Weapon(scene, type, config);
  }

  static createEnemyWeapon(scene: Scene, type: WeaponType): Weapon {
    const config = WEAPON_CONFIGS[type];
    if (config.owner !== OWNER_ENEMY) {
      console.warn(`Weapon type ${type} is not an enemy weapon`);
    }
    return new Weapon(scene, type, config);
  }
} 