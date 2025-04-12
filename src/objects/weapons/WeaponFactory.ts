import { Scene } from 'phaser';
import { Weapon } from './Weapon';
import { WEAPON_CONFIGS, WeaponType } from './WeaponConfigs';

export class WeaponFactory {
  static createWeapon(scene: Scene, type: WeaponType): Weapon {
    const config = WEAPON_CONFIGS[type];
    return new Weapon(scene, config);
  }
} 