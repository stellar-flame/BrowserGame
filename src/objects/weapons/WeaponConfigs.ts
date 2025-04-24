export const TYPE_MELEE = 'melee';
export const TYPE_RANGED = 'ranged';
export const OWNER_PLAYER = 'player';
export const OWNER_ENEMY = 'enemy';

export interface WeaponConfig {
  type: typeof TYPE_MELEE | typeof TYPE_RANGED;
  owner: typeof OWNER_PLAYER | typeof OWNER_ENEMY;
  damage: number;
  attackRate: number; // Cooldown time in milliseconds between attacks
  bulletSpeed?: number;
  bulletSprite?: string;
  bulletWidth?: number;
  bulletHeight?: number;
  bulletSpinSpeed?: number;
  minDistance?: number;
  maxDistance?: number;
  displayConfig?: {
    color?: string;
  } | null;
}

export const WEAPON_CONFIGS = {
  // Enemy weapons
  ZOMBIESTRIKE: {
    type: TYPE_MELEE,
    owner: OWNER_ENEMY,
    damage: 20,
    attackRate: 1000, // 1 second cooldown
    minDistance: 40,
    maxDistance: 50
  },
  CHOMPER_BITE: {
    type: TYPE_MELEE,
    owner: OWNER_ENEMY,
    damage: 10,
    attackRate: 300, // 3 bites per second
    minDistance: 40,
    maxDistance: 50
  },
  SWORD: {
    type: TYPE_MELEE,
    owner: OWNER_ENEMY,
    damage: 15,
    attackRate: 1000, // 1 second cooldown
    minDistance: 50,
    maxDistance: 100
  },
  BOW: {
    type: TYPE_RANGED,
    owner: OWNER_ENEMY,
    damage: 15,
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
    owner: OWNER_ENEMY,
    damage: 20,
    attackRate: 1250, // 0.8 attacks per second (1000ms / 0.8)
    minDistance: 50,
    maxDistance: 100
  },
  NINJA_STAR: {
    type: TYPE_RANGED,
    owner: OWNER_ENEMY,
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

  // Player weapons
  BOLTSPITTER: {
    type: TYPE_RANGED,
    owner: OWNER_PLAYER,
    damage: 10,
    attackRate: 300, // 2 attacks per second (1000ms / 2)
    bulletSpeed: 300,
    bulletSprite: 'player-bullet-1',
    bulletWidth: 32,
    bulletHeight: 32,
    minDistance: 100,
    maxDistance: 300,
    displayConfig: {
      color: '0x888888' // Gray
    }
  },
  QUICKLASH: {
    type: TYPE_RANGED,
    owner: OWNER_PLAYER,
    damage: 20,
    attackRate: 150, // 4 attacks per second (1000ms / 4)
    bulletSpeed: 300,
    bulletSprite: 'player-bullet-1',
    bulletWidth: 32,
    bulletHeight: 32,
    minDistance: 100,
    maxDistance: 300,
    displayConfig: {
      color: '0xffffff' // Pure white
    }
  }
} as const;

export const WEAPON_UPGRADE = {
  '1': 'QUICKLASH'
}

export type WeaponType = keyof typeof WEAPON_CONFIGS;
