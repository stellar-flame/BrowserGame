import { WeaponType } from '../weapons/WeaponConfigs';

export interface AnimationConfig {
  startFrame: number;
  endFrame: number;
  frameRate: number;
  repeat: number;
}

export interface EnemyConfig {
  type: 'melee' | 'ranged';
  sprite: string;
  scale: number;
  attackRate: number;
  moveSpeed: number;
  health: number;
  maxHealth: number;
  animationKey: string;
  animationConfig?: AnimationConfig;
  weaponType?: WeaponType;
}

export const ENEMY_CONFIGS = {
  ZOMBIE: {
    type: 'melee',
    sprite: 'zombie-sprite',
    scale: 2,
    attackRate: 2000,
    moveSpeed: 120,
    health: 20,
    maxHealth: 20,
    animationKey: 'zombie-walk',
    animationConfig: {
      startFrame: 0,
      endFrame: 7,
      frameRate: 10,
      repeat: -1
    },
    weaponType: 'ZOMBIESTRIKE'
  },
  SKELETON: {
    type: 'ranged',
    sprite: 'skeleton-sprite',
    scale: 2,
    attackRate: 1500,
    moveSpeed: 80,
    health: 20,
    maxHealth: 20,
    animationKey: 'skeleton-walk',
    animationConfig: {
      startFrame: 0,
      endFrame: 7,
      frameRate: 10,
      repeat: -1
    },
    weaponType: 'BOW'
  },
  NINJA: {
    type: 'ranged',
    sprite: 'ninja-sprite',
    scale: 2,
    attackRate: 1500,
    moveSpeed: 80,
    health: 4,
    maxHealth: 4,
    animationKey: 'ninja-walk',
    animationConfig: {
      startFrame: 0,
      endFrame: 7,
      frameRate: 10,
      repeat: -1
    },
    weaponType: 'NINJA_STAR'
  },
} as const; 