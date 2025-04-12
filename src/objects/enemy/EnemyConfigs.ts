import { WeaponType } from '../weapons/WeaponConfigs';

export interface EnemyConfig {
  type: 'melee' | 'ranged';
  sprite: string;
  scale: number;
  attackRate: number;
  minDistance: number;
  maxDistance: number;
  moveSpeed: number;
  health: number;
  maxHealth: number;
  animationKey: string;
  attackRange?: number;
  weaponType?: WeaponType;
}

export const ENEMY_CONFIGS = {
  ZOMBIE: {
    type: 'melee',
    sprite: 'zombie-sprite',
    scale: 1,
    attackRate: 2000,
    minDistance: 200,
    maxDistance: 400,
    moveSpeed: 120,
    health: 10,
    maxHealth: 10,
    animationKey: 'zombie-walk',
    attackRange: 10,
    weaponType: 'ZOMBIESTRIKE'
  },
  SKELETON: {
    type: 'ranged',
    sprite: 'skeleton-sprite',
    scale: 2,
    attackRate: 1500,
    minDistance: 100,
    maxDistance: 200,
    moveSpeed: 80,
    health: 20,
    maxHealth: 20,
    animationKey: 'skeleton-walk',
    weaponType: 'BOW'
  },
  NINJA: {
    type: 'ranged',
    sprite: 'ninja-sprite',
    scale: 2,
    attackRate: 1500,
    minDistance: 200,
    maxDistance: 400,
    moveSpeed: 80,
    health: 4,
    maxHealth: 4,
    animationKey: 'ninja-walk',
    weaponType: 'NINJA_STAR'
  },
} as const; 