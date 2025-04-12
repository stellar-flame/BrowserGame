export interface WeaponConfig {
  type: 'melee' | 'ranged';
  damage: number;
  range: number;
  attackSpeed: number;
  bulletSpeed?: number;
  bulletSprite?: string;
}

export const WEAPON_CONFIGS = {
  ZOMBIESTRIKE: {
    type: 'melee',
    damage: 5,
    range: 30,
    attackSpeed: 1.0
  },
  SWORD: {
    type: 'melee',
    damage: 15,
    range: 50,
    attackSpeed: 1.0
  },
  BOW: {
    type: 'ranged',
    damage: 10,
    range: 300,
    attackSpeed: 1.5,
    bulletSpeed: 300,
    bulletSprite: 'arrow'
  },
  SPEAR: {
    type: 'melee',
    damage: 20,
    range: 70,
    attackSpeed: 0.8
  },
  NINJA_STAR: {
    type: 'ranged',
    damage: 25,
    range: 400,
    attackSpeed: 0.5,
    bulletSpeed: 400,
    bulletSprite: 'ninja-star'
  }
} as const;

export type WeaponType = keyof typeof WEAPON_CONFIGS; 