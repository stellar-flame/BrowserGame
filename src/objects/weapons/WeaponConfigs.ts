
export const TYPE_MELEE = 'melee';
export const TYPE_RANGED = 'ranged';

export interface WeaponConfig {
  type: typeof TYPE_MELEE | typeof TYPE_RANGED;
  damage: number;
  attackRate: number; // Cooldown time in milliseconds between attacks
  bulletSpeed?: number;
  bulletSprite?: string;
  bulletWidth?: number;
  bulletHeight?: number;
  bulletSpinSpeed?: number;
  minDistance?: number;
  maxDistance?: number;
}


export const WEAPON_CONFIGS = {
  ZOMBIESTRIKE: {
    type: TYPE_MELEE,
    damage: 20,
    attackRate: 1000, // 1 second cooldown
    minDistance: 40,
    maxDistance: 50 
  },
  SWORD: {
    type: TYPE_MELEE,
    damage: 15,
    attackRate: 1000, // 1 second cooldown
    minDistance: 50,
    maxDistance: 100
  },
  BOW: {
    type: TYPE_RANGED,
    damage: 10,
    attackRate: 667, // ~1.5 attacks per second (1000ms / 1.5)
    bulletSpeed: 300,
    bulletSprite: 'arrow',
    bulletWidth: 32,
    bulletHeight: 16,
    minDistance: 100,
    maxDistance: 200
  },
  SPEAR: {
    type: TYPE_MELEE,
    damage: 20,
    attackRate: 1250, // 0.8 attacks per second (1000ms / 0.8)
    minDistance: 50,
    maxDistance: 100
  },
  NINJA_STAR: {
    type: TYPE_RANGED,
    damage: 10,
    attackRate: 2000, // 0.5 attacks per second (1000ms / 0.5)
    bulletSpeed: 400,
    bulletSprite: 'ninja-star',
    bulletWidth: 32,
    bulletHeight: 32,
    bulletSpinSpeed: 10, // 10 rotations per second
    minDistance: 100,
    maxDistance: 200
  },
  LEVEL_1_GUN: {
    type: TYPE_RANGED,
    damage: 10,
    attackRate: 500, // 2 attacks per second (1000ms / 2)
    bulletSpeed: 300,
    bulletSprite: 'player-bullet-1',
    bulletWidth: 32,
    bulletHeight: 32,
    minDistance: 100,
    maxDistance: 300
  }
} as const;

export type WeaponType = keyof typeof WEAPON_CONFIGS; 