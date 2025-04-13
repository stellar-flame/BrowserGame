export interface WeaponConfig {
  type: 'melee' | 'ranged';
  damage: number;
  attackSpeed: number;
  attackRate?: number; // Cooldown time in milliseconds between attacks
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
    type: 'melee',
    damage: 5,
    attackSpeed: 1.0,
    attackRate: 1000, // 1 second cooldown
    minDistance: 40,
    maxDistance: 50 
  },
  SWORD: {
    type: 'melee',
    damage: 15,
    attackSpeed: 1.0,
    attackRate: 1000, // 1 second cooldown
    minDistance: 50,
    maxDistance: 100
  },
  BOW: {
    type: 'ranged',
    damage: 10,
    attackSpeed: 1.5,
    attackRate: 1500, // 1.5 seconds cooldown
    bulletSpeed: 300,
    bulletSprite: 'arrow',
    bulletWidth: 32,
    bulletHeight: 16,
    minDistance: 100,
    maxDistance: 200
  },
  SPEAR: {
    type: 'melee',
    damage: 20,
    attackSpeed: 0.8,
    attackRate: 800, // 0.8 seconds cooldown
    minDistance: 50,
    maxDistance: 100
  },
  NINJA_STAR: {
    type: 'ranged',
    damage: 10,
    attackSpeed: 0.5,
    attackRate: 500, // 0.5 seconds cooldown
    bulletSpeed: 400,
    bulletSprite: 'ninja-star',
    bulletWidth: 32,
    bulletHeight: 32,
    bulletSpinSpeed: 10, // 10 rotations per second
    minDistance: 100,
    maxDistance: 200
  }
} as const;

export type WeaponType = keyof typeof WEAPON_CONFIGS; 