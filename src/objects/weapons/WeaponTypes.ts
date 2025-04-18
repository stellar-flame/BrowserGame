import { Player } from '../player/Player';
import { Enemy } from '../enemy/Enemy';
import { RangedEnemy } from '../enemy/RangedEnemy';

// Base interface for all weapons
export interface Weapon {
    damage: number;
    range: number;
    attackSpeed: number;
}

// Interface for melee weapons
export interface MeleeWeapon extends Weapon {
    attack(attacker: Player, target: Enemy): void;
}

// Interface for ranged weapons
export interface RangedWeapon extends Weapon {
    bulletSpeed: number;
    bulletSprite: string;
    fire(shooter: RangedEnemy, target: Player): void;
} 