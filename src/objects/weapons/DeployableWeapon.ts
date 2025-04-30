import { Scene } from "phaser";
import { WeaponConfig } from "./WeaponConfigs";
import { Weapon } from "./Weapon";
import { WeaponType } from "./WeaponConfigs";
import { DeployableWeaponInstance } from "./DeployableWeaponInstance";
import { Room } from "../rooms/Room";

export class DeployableWeapon extends Weapon {

    constructor(scene: Scene, type: WeaponType, config: WeaponConfig) {
        super(scene, type, config);
    }

    public isDeployable(): boolean {
        return true;
    }

    public deploy(shooter: any, room: Room): void {
        DeployableWeaponInstance.create(this.scene, shooter, room);
    }
}