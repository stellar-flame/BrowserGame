export interface WeaponConfig {
  type: 'melee' | 'ranged';
  damage: number;
  range: number;
  attackSpeed: number;
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
    range: 100,
    attackSpeed: 1.0,
    minDistance: 50,
    maxDistance: 100
  },
  SWORD: {
    type: 'melee',
    damage: 15,
    range: 50,
    attackSpeed: 1.0,
    minDistance: 50,
    maxDistance: 100
  },
  BOW: {
    type: 'ranged',
    damage: 10,
    range: 300,
    attackSpeed: 1.5,
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
    range: 70,
    attackSpeed: 0.8,
    minDistance: 50,
    maxDistance: 100
  },
  NINJA_STAR: {
    type: 'ranged',
    damage: 10,
    range: 300,
    attackSpeed: 0.5,
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