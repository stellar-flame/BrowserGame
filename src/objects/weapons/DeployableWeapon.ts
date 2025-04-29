import { Scene } from "phaser";
import { WeaponConfig } from "./WeaponConfigs";
import { Weapon } from "./Weapon";
import { WeaponType } from "./WeaponConfigs";

export class DeployableWeapon extends Weapon {
    constructor(scene: Scene, type: WeaponType, config: WeaponConfig) {
        super(scene, type, config);
    }

    public isDeployable(): boolean {
        return true;
    }


}