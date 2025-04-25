import { Canon } from '../items/Canon';
import { WeaponType } from '../weapons/WeaponConfigs';
import { DropCanonBehaviour, EnemyBehaviour } from './EnemyBehaviour';

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
  moveSpeed: number;
  health: number;
  maxHealth: number;
  animationKey: string;
  animationConfig?: AnimationConfig;
  weaponType?: WeaponType;
  behaviour?: EnemyBehaviour;
}

export const ENEMY_CONFIGS = {
  ZOMBIE: {
    type: 'melee',
    sprite: 'zombie-sprite',
    scale: 2,
    moveSpeed: 120,
    health: 40,
    maxHealth: 40,
    animationKey: 'zombie-walk',
    animationConfig: {
      startFrame: 0,
      endFrame: 7,
      frameRate: 8,
      repeat: -1
    },
    weaponType: 'STRIKE'
  },
  SKELETON: {
    type: 'ranged',
    sprite: 'skeleton-sprite',
    scale: 2,
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
    moveSpeed: 100,
    health: 4,
    maxHealth: 4,
    animationKey: 'ninja-walk',
    animationConfig: {
      startFrame: 0,
      endFrame: 7,
      frameRate: 7,
      repeat: -1
    },
    weaponType: 'NINJA_STAR'
  },
  CHOMPER: {
    type: 'melee',
    sprite: 'chomper-sprite',
    scale: 2,
    moveSpeed: 130,
    health: 30,
    maxHealth: 30,
    animationKey: 'chomper-walk',
    animationConfig: {
      startFrame: 0,
      endFrame: 7,
      frameRate: 8,
      repeat: -1
    },
    weaponType: 'CHOMPER_BITE'
  },
  TROLL: {
    type: 'melee',
    sprite: 'troll-sprite',
    scale: 2,
    moveSpeed: 150,
    health: 30,
    maxHealth: 30,
    animationKey: 'troll-walk',
    animationConfig: {
      startFrame: 0,
      endFrame: 7,
      frameRate: 8,
      repeat: -1
    },
    weaponType: 'STRIKE',
    behaviour: new DropCanonBehaviour()
  }
} as const; 